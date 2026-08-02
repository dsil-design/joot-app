/**
 * Repair the damage left by the pre-gate auto-matcher and the two Grab
 * extraction bugs. DRY RUN BY DEFAULT — pass --apply to write.
 *
 *   npx tsx scripts/reconcile/repair-auto-links.ts            # report only
 *   npx tsx scripts/reconcile/repair-auto-links.ts --apply    # write
 *
 * Three independent phases, each safe to run repeatedly:
 *
 *   A. Unlink auto-matches that would not survive the current gate.
 *      `tryAutoMatch` used to persist any match scoring 55+ — the ranker's
 *      *low*-confidence floor — into `matched_transaction_id`. That column is
 *      read as "resolved" by three downstream layers, so a weak suggestion
 *      retired the email and orphaned the statement row that genuinely
 *      belonged to it. Links that clear the current gate (HIGH score, amounts
 *      agree after conversion, no competing claim) are left alone.
 *
 *   B. Correct stored Grab amounts the parser now reads differently.
 *      Ride receipts yielded the pre-discount Fare, and late-delivery apology
 *      mails yielded the goodwill voucher instead of the order total. Only
 *      emails nobody has decided on yet are touched — an amount underneath a
 *      reviewed transaction is not ours to rewrite.
 *
 *   C. Persist missing `email_sub_orders` rows. Amazon bills per shipment;
 *      the breakdown is what lets the queue pair one order email against
 *      several statement charges. Emails extracted before that table existed
 *      never got rows.
 *
 * Phase A never touches `imported` emails: those produced real transactions,
 * and unlinking would strand a record the ledger depends on.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { convertAmount, isWithinConversionTolerance } from '../../src/lib/matching/cross-currency'
import { CONFIDENCE_THRESHOLDS } from '../../src/lib/matching/match-scorer'
import { grabParser } from '../../src/lib/email/extractors/grab'
import { amazonParser } from '../../src/lib/email/extractors/amazon'
import { persistSubOrders } from '../../src/lib/email/sub-order-matcher'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) as SupabaseClient

const APPLY = process.argv.includes('--apply')
const AMOUNT_TOLERANCE_PERCENT = 2

/** Statuses whose amount/links a human has already signed off on. */
const DECIDED_STATUSES = new Set(['imported', 'skipped'])

function log(...args: unknown[]) {
  console.log(...args)
}

async function resolveUser(): Promise<string> {
  const { data, error } = await sb.from('users').select('id, email')
  if (error) throw error
  if (!data?.length) throw new Error('no users')
  // Same selection the month audit makes: the account carrying the data.
  const counts = await Promise.all(
    data.map(async u => {
      const { count } = await sb
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', u.id)
      return { id: u.id, email: u.email, count: count ?? 0 }
    })
  )
  counts.sort((a, b) => b.count - a.count)
  log(`User: ${counts[0].email} (${counts[0].count} transactions)\n`)
  return counts[0].id
}

// ── Phase A ────────────────────────────────────────────────────────────────

interface AutoLinkRow {
  id: string
  subject: string | null
  transaction_date: string | null
  amount: number | null
  currency: string | null
  status: string
  matched_transaction_id: string
  match_confidence: number | null
}

async function phaseA(userId: string) {
  log('── A. Auto-links that fail the current gate ───────────────────────────')

  const { data: links, error } = await sb
    .from('email_transactions')
    .select('id, subject, transaction_date, amount, currency, status, matched_transaction_id, match_confidence')
    .eq('user_id', userId)
    .is('match_method', null)
    .not('matched_transaction_id', 'is', null)
  if (error) throw error

  const rows = (links ?? []) as AutoLinkRow[]
  const targetIds = [...new Set(rows.map(r => r.matched_transaction_id))]
  const targets = new Map<string, { id: string; transaction_date: string; amount: number; original_currency: string; description: string | null }>()
  for (let i = 0; i < targetIds.length; i += 100) {
    const { data } = await sb
      .from('transactions')
      .select('id, transaction_date, amount, original_currency, description')
      .in('id', targetIds.slice(i, i + 100))
    for (const t of data ?? []) targets.set(t.id, t as never)
  }

  // Resolve competing claims the way the live gate would have.
  //
  // The gate refuses to *add* a claim to a transaction another email already
  // holds — it does not retract the claim that got there first. Unlinking
  // every claimant would therefore overshoot badly: two emails describing one
  // payment (a K PLUS transfer confirmation plus the vendor's own receipt)
  // agree on date and amount and one of them is genuinely right. So keep the
  // strongest claim per transaction and release the rest — and where a human
  // has already linked one by hand, that one wins outright.
  const { data: allClaims } = await sb
    .from('email_transactions')
    .select('id, matched_transaction_id, match_confidence, match_method, transaction_date')
    .eq('user_id', userId)
    .not('matched_transaction_id', 'is', null)

  const claimsByTarget = new Map<string, { id: string; score: number; method: string | null; date: string | null }[]>()
  for (const c of allClaims ?? []) {
    const target = c.matched_transaction_id as string
    const list = claimsByTarget.get(target) ?? []
    list.push({
      id: c.id as string,
      score: Number(c.match_confidence ?? 0),
      method: (c.match_method as string | null) ?? null,
      date: (c.transaction_date as string | null) ?? null,
    })
    claimsByTarget.set(target, list)
  }

  /** Ids of auto-claims that lose a contest for their transaction. */
  const losers = new Set<string>()
  for (const [target, claims] of claimsByTarget) {
    if (claims.length < 2) continue
    const decided = claims.filter(c => c.method !== null)
    if (decided.length > 0) {
      // A reviewed link is authoritative; every auto-claim alongside it goes.
      for (const c of claims) if (c.method === null) losers.add(c.id)
      continue
    }
    const targetDate = targets.get(target)?.transaction_date ?? ''
    const dayGap = (d: string | null) =>
      d && targetDate
        ? Math.abs(new Date(d).getTime() - new Date(targetDate).getTime()) / 86_400_000
        : Number.MAX_SAFE_INTEGER
    const ranked = [...claims].sort((a, b) => b.score - a.score || dayGap(a.date) - dayGap(b.date))
    for (const c of ranked.slice(1)) losers.add(c.id)
  }

  const doomed: { row: AutoLinkRow; why: string }[] = []
  let kept = 0
  let untouchable = 0

  for (const row of rows) {
    const target = targets.get(row.matched_transaction_id)
    const reasons: string[] = []

    if (!target) {
      reasons.push('target transaction no longer exists')
    } else {
      if ((row.match_confidence ?? 0) < CONFIDENCE_THRESHOLDS.HIGH) {
        reasons.push(`score ${row.match_confidence ?? 0} < ${CONFIDENCE_THRESHOLDS.HIGH}`)
      }

      const emailAmount = Number(row.amount ?? 0)
      const targetAmount = Number(target.amount)
      const from = (row.currency ?? '').toUpperCase()
      const to = (target.original_currency ?? '').toUpperCase()

      if (!emailAmount || !targetAmount) {
        reasons.push('missing amount')
      } else if (from === to) {
        const diff = (Math.abs(emailAmount - targetAmount) / Math.abs(targetAmount)) * 100
        if (diff > AMOUNT_TOLERANCE_PERCENT) {
          reasons.push(`amounts differ by ${diff.toFixed(1)}% (${emailAmount} vs ${targetAmount} ${to})`)
        }
      } else {
        const conv = await convertAmount(
          sb,
          emailAmount,
          from,
          to,
          row.transaction_date ?? target.transaction_date
        )
        if (!conv) {
          reasons.push(`no ${from}→${to} rate to check the amount against`)
        } else if (
          !isWithinConversionTolerance(emailAmount, conv.convertedAmount, targetAmount, AMOUNT_TOLERANCE_PERCENT)
        ) {
          const diff = (Math.abs(conv.convertedAmount - targetAmount) / Math.abs(targetAmount)) * 100
          reasons.push(
            `amounts differ by ${diff.toFixed(1)}% after conversion (${emailAmount} ${from} → ${conv.convertedAmount.toFixed(2)} ${to} vs ${targetAmount})`
          )
        }
      }

      if (losers.has(row.id)) {
        const rivals = claimsByTarget.get(row.matched_transaction_id)?.length ?? 0
        reasons.push(`lost the claim on a transaction ${rivals} emails point at`)
      }
    }

    if (reasons.length === 0) {
      kept++
      continue
    }
    if (DECIDED_STATUSES.has(row.status)) {
      untouchable++
      log(
        `  · SKIP (${row.status}) ${row.transaction_date} ${row.amount} ${row.currency} — ${reasons.join('; ')}`
      )
      continue
    }
    doomed.push({ row, why: reasons.join('; ') })
  }

  log(`  auto-links examined: ${rows.length}`)
  log(`  pass the gate, left alone: ${kept}`)
  log(`  fail but already imported/skipped, left alone: ${untouchable}`)
  log(`  to unlink: ${doomed.length}\n`)

  for (const { row, why } of doomed) {
    const t = targets.get(row.matched_transaction_id)
    log(
      `  ✗ ${row.transaction_date} ${String(row.amount).padStart(9)} ${row.currency} ` +
        `→ tx ${t ? `${t.transaction_date} ${t.amount} ${t.original_currency}` : 'missing'}  ` +
        `| ${(row.subject ?? '').slice(0, 38)}\n      ${why}`
    )
  }

  if (!APPLY || doomed.length === 0) return doomed.length

  for (const { row } of doomed) {
    const { error: updateError } = await sb
      .from('email_transactions')
      .update({
        matched_transaction_id: null,
        match_confidence: null,
        status: 'pending_review',
        matched_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    if (updateError) {
      log(`  ! failed to unlink ${row.id}: ${updateError.message}`)
      continue
    }

    // The reverse pointer is part of the same wrong claim. Clear it only when
    // it names this email — a transaction sourced from a different email is
    // none of our business.
    const { error: fkError } = await sb
      .from('transactions')
      .update({ source_email_transaction_id: null })
      .eq('id', row.matched_transaction_id)
      .eq('source_email_transaction_id', row.id)
    if (fkError) log(`  ! failed to clear source pointer on ${row.matched_transaction_id}: ${fkError.message}`)
  }
  log(`\n  unlinked ${doomed.length}`)
  return doomed.length
}

// ── Phase B ────────────────────────────────────────────────────────────────

async function phaseB(userId: string) {
  log('\n── B. Grab amounts the fixed parser reads differently ─────────────────')

  const { data: ets, error } = await sb
    .from('email_transactions')
    .select('id, message_id, subject, transaction_date, amount, currency, status, parser_key')
    .eq('user_id', userId)
    .eq('parser_key', 'grab')
  if (error) throw error

  // An email with no transaction date isn't describing a payment — the
  // cancellation notices are the case in point, and giving one an amount
  // would invent money that was never charged.
  const candidates = (ets ?? []).filter(
    e => !DECIDED_STATUSES.has(e.status) && e.transaction_date !== null
  )
  const changes: { id: string; subject: string; date: string; from: number | null; to: number; currency: string }[] = []

  for (const e of candidates) {
    const { data: raw } = await sb
      .from('emails')
      .select('subject, from_address, date, text_body, html_body')
      .eq('user_id', userId)
      .eq('message_id', e.message_id)
      .maybeSingle()
    if (!raw) continue

    const result = grabParser.extract({
      ...raw,
      email_date: new Date(raw.date as string),
    } as never)
    if (!result.success || !result.data) continue

    const next = Number(result.data.amount)
    const current = e.amount === null ? null : Number(e.amount)
    if (current !== null && Math.abs(next - current) < 0.005) continue

    changes.push({
      id: e.id,
      subject: e.subject ?? '',
      date: e.transaction_date ?? '',
      from: current,
      to: next,
      currency: result.data.currency ?? e.currency ?? 'THB',
    })
  }

  log(`  unresolved Grab emails checked: ${candidates.length}`)
  log(`  amounts to correct: ${changes.length}\n`)
  for (const c of changes) {
    log(`  ~ ${c.date} ${String(c.from ?? '—').padStart(9)} → ${String(c.to).padStart(9)} ${c.currency}  | ${c.subject.slice(0, 40)}`)
  }

  if (!APPLY || changes.length === 0) return changes.length

  for (const c of changes) {
    const { error: updateError } = await sb
      .from('email_transactions')
      .update({ amount: c.to, currency: c.currency, updated_at: new Date().toISOString() })
      .eq('id', c.id)
    if (updateError) log(`  ! failed to update ${c.id}: ${updateError.message}`)
  }
  log(`\n  corrected ${changes.length}`)
  return changes.length
}

// ── Phase C ────────────────────────────────────────────────────────────────

async function phaseC(userId: string) {
  log('\n── C. Missing Amazon sub-order breakdowns ─────────────────────────────')

  const { data: ets, error } = await sb
    .from('email_transactions')
    .select('id, message_id, subject, transaction_date, amount, status, order_id, parser_key')
    .eq('user_id', userId)
    .eq('parser_key', 'amazon')
  if (error) throw error

  const multi = (ets ?? []).filter(
    e => (e.order_id ?? '').includes('|') && !DECIDED_STATUSES.has(e.status)
  )

  const toWrite: { id: string; date: string; total: number; subs: unknown[] }[] = []
  for (const e of multi) {
    const { count } = await sb
      .from('email_sub_orders')
      .select('*', { count: 'exact', head: true })
      .eq('email_transaction_id', e.id)
    if ((count ?? 0) >= 2) continue

    const { data: raw } = await sb
      .from('emails')
      .select('subject, from_address, date, text_body, html_body')
      .eq('user_id', userId)
      .eq('message_id', e.message_id)
      .maybeSingle()
    if (!raw) continue

    const result = amazonParser.extract({ ...raw, email_date: new Date(raw.date as string) } as never)
    const subs = (result.success && result.data ? (result.data as { sub_orders?: unknown[] }).sub_orders : null) ?? []
    if (subs.length < 2) continue

    const sum = (subs as { amount: number }[]).reduce((s, x) => s + x.amount, 0)
    const total = Number(e.amount ?? 0)
    // A breakdown that doesn't add up to the email total is not a breakdown.
    if (total && Math.abs(sum - total) > 0.01) {
      log(`  ! ${e.transaction_date} sub-orders sum to ${sum.toFixed(2)} but email total is ${total} — skipped`)
      continue
    }
    toWrite.push({ id: e.id, date: e.transaction_date ?? '', total, subs })
  }

  log(`  multi-order Amazon emails: ${multi.length}`)
  log(`  missing a breakdown: ${toWrite.length}\n`)
  for (const w of toWrite) {
    log(`  + ${w.date} total ${w.total} = ${(w.subs as { amount: number }[]).map(s => s.amount).join(' + ')}`)
  }

  if (!APPLY || toWrite.length === 0) return toWrite.length

  for (const w of toWrite) {
    try {
      await persistSubOrders(sb, w.id, userId, w.subs as never)
    } catch (err) {
      log(`  ! failed to persist sub-orders for ${w.id}: ${(err as Error).message}`)
    }
  }
  log(`\n  wrote breakdowns for ${toWrite.length}`)
  return toWrite.length
}

async function main() {
  log(`repair-auto-links — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`)
  const userId = await resolveUser()
  const a = await phaseA(userId)
  const b = await phaseB(userId)
  const c = await phaseC(userId)
  log(`\n── Summary ────────────────────────────────────────────────────────────`)
  log(`  auto-links unlinked   ${a}`)
  log(`  Grab amounts fixed    ${b}`)
  log(`  breakdowns written    ${c}`)
  if (!APPLY) log(`\n  Nothing was written. Re-run with --apply.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
