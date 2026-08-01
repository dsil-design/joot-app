/**
 * Month-close audit — READ ONLY. Writes nothing.
 *
 * Produces the full reconciliation picture for one month:
 *   1. Source coverage    — which statements / slips / emails exist for the window
 *   2. Queue state        — what the Review queue would return, bucketed by triage tier
 *   3. Invariants         — KBANK outgoing rows vs payment slips, both directions
 *   4. Anomalies          — duplicate clusters, zero/absurd amounts, failed extractions
 *
 * Usage:
 *   npx tsx scripts/reconcile/month-audit.ts 2026-05
 *   npx tsx scripts/reconcile/month-audit.ts 2026-05 --json > /tmp/may.json
 *
 * The month argument is a calendar month (YYYY-MM). Statement periods rarely
 * align to calendar months (Chase runs 19th–18th), so the audit reports which
 * statements *overlap* the window and flags partial coverage explicitly.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { fetchStatementQueueItems } from '../../src/lib/imports/statement-queue-builder'
import { fetchEmailQueueItems } from '../../src/lib/imports/email-queue-builder'
import { fetchPaymentSlipQueueItems } from '../../src/lib/imports/payment-slip-queue-builder'
import { aggregateQueueItems } from '../../src/lib/imports/queue-aggregator'
import type { QueueItem } from '../../src/lib/imports/queue-types'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const month = (process.argv[2] || '').match(/^\d{4}-\d{2}$/) ? process.argv[2] : ''
const asJson = process.argv.includes('--json')

if (!month) {
  console.error('Usage: npx tsx scripts/reconcile/month-audit.ts YYYY-MM [--json]')
  process.exit(1)
}

const [year, mon] = month.split('-').map(Number)
const fromDate = `${month}-01`
const toDate = new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10)

/** Triage tiers — the buckets a human actually decides between. */
type Tier = 'auto' | 'confirm' | 'decide' | 'blocked'

function tierOf(item: QueueItem): Tier {
  const conf = item.confidence ?? 0
  const amt = Number(item.statementTransaction?.amount ?? 0)
  // Nothing extracted → can't act on it at all.
  if (!amt) return 'blocked'
  // Multi-source agreement (slip+email+stmt, or email+stmt) at high confidence:
  // two or more independent records of the same payment agree.
  if (item.source === 'merged' && conf >= 95) return 'auto'
  // Slip-only or email-only at high confidence: one record, but a strong one.
  if (conf >= 90) return 'confirm'
  // A lone statement line with no corroborating source. Needs a vendor/category
  // judgement call, which is what the proposal engine is for.
  if (item.source === 'statement') return 'decide'
  return 'decide'
}

async function main() {
  const out: Record<string, unknown> = { month, window: { fromDate, toDate } }
  const log = (...args: unknown[]) => { if (!asJson) console.log(...args) }

  // Pick the account that actually holds the data, not just the first row.
  const { data: users } = await sb.from('users').select('id, email')
  if (!users?.length) throw new Error('No users found')
  let userId = users[0].id
  if (users.length > 1) {
    const counts = await Promise.all(users.map(async (u) => {
      const { count } = await sb.from('transactions')
        .select('*', { count: 'exact', head: true }).eq('user_id', u.id)
      return { id: u.id, email: u.email, count: count || 0 }
    }))
    counts.sort((a, b) => b.count - a.count)
    userId = counts[0].id
    console.error(`Multiple users; using ${counts[0].email} (${counts[0].count} transactions)`)
  }

  log(`\n${'='.repeat(72)}`)
  log(`MONTH CLOSE AUDIT — ${month}  (window ${fromDate} .. ${toDate})`)
  log('='.repeat(72))

  // ── 1. SOURCE COVERAGE ────────────────────────────────────────────────
  const { data: pms } = await sb
    .from('payment_methods')
    .select('id, name, type, preferred_currency, billing_cycle_start_day, is_import_source')
    .eq('user_id', userId)
    .order('sort_order')
  const pmName = new Map((pms || []).map((p) => [p.id, p.name]))
  const importSources = (pms || []).filter((p) => p.is_import_source)

  const { data: allStmts } = await sb
    .from('statement_uploads')
    .select('id, filename, payment_method_id, statement_period_start, statement_period_end, status, transactions_extracted')
    .eq('user_id', userId)
    .order('statement_period_start')

  const overlapping = (allStmts || []).filter(
    (s) => s.statement_period_start && s.statement_period_end &&
      s.statement_period_start <= toDate && s.statement_period_end >= fromDate
  )

  log('\n── 1. SOURCE COVERAGE ' + '─'.repeat(50))
  log('\nStatements overlapping the window:')
  const covered = new Set<string>()
  for (const s of overlapping) {
    covered.add(s.payment_method_id!)
    const flag = s.transactions_extracted === 0 ? '  ⚠ EXTRACTED 0 ROWS' : ''
    log(`  ${(pmName.get(s.payment_method_id!) || '???').padEnd(32)} ${s.statement_period_start}..${s.statement_period_end} [${s.status.padEnd(16)}] n=${String(s.transactions_extracted).padStart(3)}  ${s.filename}${flag}`)
  }

  const missing = importSources.filter((p) => !covered.has(p.id))
  log(`\nImport sources with NO statement covering this window (${missing.length}):`)
  for (const p of missing) log(`  ✗ ${p.name} (${p.type})`)

  // Gaps between consecutive statements for each import source — a missing
  // mid-cycle statement is invisible unless you look at period continuity.
  log('\nPeriod gaps per import source (±1 month around the window):')
  for (const p of importSources) {
    const mine = (allStmts || [])
      .filter((s) => s.payment_method_id === p.id && s.statement_period_end)
      .sort((a, b) => a.statement_period_start!.localeCompare(b.statement_period_start!))
    for (let i = 1; i < mine.length; i++) {
      const prevEnd = new Date(mine[i - 1].statement_period_end!)
      const curStart = new Date(mine[i].statement_period_start!)
      const gapDays = (curStart.getTime() - prevEnd.getTime()) / 86400000
      if (gapDays > 2 && mine[i].statement_period_start! >= `${month}-01` && mine[i - 1].statement_period_end! <= `${year}-${String(mon + 2).padStart(2, '0')}-01`) {
        log(`  ⚠ ${p.name}: ${Math.round(gapDays)}-day gap between ${mine[i - 1].statement_period_end} and ${mine[i].statement_period_start}`)
      }
    }
  }

  const { data: slips } = await sb
    .from('payment_slip_uploads')
    .select('id, filename, transaction_date, amount, fee, recipient_name, status, review_status, matched_transaction_id, extraction_error, uploaded_at')
    .eq('user_id', userId)
  const monthSlips = (slips || []).filter((s) => s.transaction_date?.startsWith(month))
  const failedSlips = (slips || []).filter((s) => s.status === 'failed')
  log(`\nPayment slips dated in window: ${monthSlips.length}` +
      `  (pending ${monthSlips.filter((s) => s.review_status === 'pending').length},` +
      ` approved ${monthSlips.filter((s) => s.review_status === 'approved').length})`)

  const { data: syncState } = await sb
    .from('email_sync_state').select('folder, last_sync_at').eq('user_id', userId)
  for (const s of syncState || []) log(`Email sync: ${s.folder} last synced ${s.last_sync_at}`)

  out.coverage = { statements: overlapping, missingSources: missing.map((p) => p.name), slipCount: monthSlips.length }

  // ── 2. QUEUE STATE ────────────────────────────────────────────────────
  const filters = {
    statusFilter: 'all', currencyFilter: 'all', confidenceFilter: 'all',
    sourceFilter: 'all', searchQuery: '', fromDate, toDate, statementUploadId: undefined,
  }
  const [stmtItems, emailItems, slipItems] = await Promise.all([
    fetchStatementQueueItems(sb as never, userId, filters),
    fetchEmailQueueItems(sb as never, userId, filters),
    fetchPaymentSlipQueueItems(sb as never, userId, filters),
  ])
  const result = await aggregateQueueItems(sb as never, stmtItems, emailItems, filters as never, slipItems)

  const unresolved = result.items.filter((i) => i.status === 'pending' || i.status === 'unset')
  const tiers: Record<Tier, QueueItem[]> = { auto: [], confirm: [], decide: [], blocked: [] }
  for (const i of unresolved) tiers[tierOf(i)].push(i)

  log('\n── 2. REVIEW QUEUE ' + '─'.repeat(53))
  log(`\nRaw feed: ${stmtItems.length} statement rows, ${emailItems.length} emails, ${slipItems.length} slips`)
  log(`Aggregated into ${result.total} cards — ${unresolved.length} unresolved, ${result.items.length - unresolved.length} already resolved`)
  log('\nTriage tiers:')
  log(`  AUTO     ${String(tiers.auto.length).padStart(3)}  multi-source agreement, confidence ≥95 — safe to approve in bulk`)
  log(`  CONFIRM  ${String(tiers.confirm.length).padStart(3)}  single strong source, confidence ≥90 — spot-check then approve`)
  log(`  DECIDE   ${String(tiers.decide.length).padStart(3)}  lone statement line, no corroboration — needs vendor/category call`)
  log(`  BLOCKED  ${String(tiers.blocked.length).padStart(3)}  no usable amount — fix the source before reviewing`)

  for (const tier of ['blocked', 'decide', 'confirm', 'auto'] as Tier[]) {
    if (!tiers[tier].length) continue
    log(`\n  ── ${tier.toUpperCase()} (${tiers[tier].length}) ──`)
    for (const i of tiers[tier]) {
      const st = i.statementTransaction
      log(`    ${st?.date}  ${String(st?.amount).padStart(11)} ${(st?.currency || '').padEnd(4)} ` +
          `${(i.source + (i.isNew ? ':new' : ':match')).padEnd(18)} c=${String(i.confidence ?? '-').padStart(3)}  ` +
          `${(st?.description || '').slice(0, 52)}`)
    }
  }

  out.queue = {
    total: result.total, unresolved: unresolved.length, stats: result.stats,
    tiers: Object.fromEntries(Object.entries(tiers).map(([k, v]) => [k, v.map((i) => ({
      id: i.id, date: i.statementTransaction?.date, amount: i.statementTransaction?.amount,
      currency: i.statementTransaction?.currency, source: i.source, confidence: i.confidence,
      description: i.statementTransaction?.description, isNew: i.isNew,
    }))])),
  }

  // ── 3. INVARIANTS ─────────────────────────────────────────────────────
  log('\n── 3. INVARIANTS ' + '─'.repeat(55))
  const kbank = (pms || []).find((p) => p.name.startsWith('KBANK'))
  const kbankStmt = kbank
    ? (allStmts || []).find((s) => s.payment_method_id === kbank.id && s.statement_period_start?.startsWith(month))
    : undefined

  const invariants: Record<string, unknown> = {}
  if (!kbankStmt) {
    log('\n  ⚠ No KBANK statement for this month — the slip↔statement invariant cannot be checked.')
  } else {
    const { data: full } = await sb
      .from('statement_uploads').select('extraction_log').eq('id', kbankStmt.id).single()
    const rows: { amount: number; transaction_date: string; description?: string }[] =
      (full?.extraction_log as { suggestions?: never[] })?.suggestions || []

    // Greedy 1:1 match on (|amount| within 0.01, date within ±2d, same direction).
    // Slips carry a separate fee field; the statement may book amount or amount+fee.
    // Direction matters: KBANK rows are signed (positive = outgoing), and without
    // that check an incoming −300 row will happily consume an outgoing 300 slip
    // on a day that has both, manufacturing a phantom invariant violation.
    const used = new Set<number>()
    const orphanSlips: typeof monthSlips = []
    for (const s of monthSlips) {
      const idx = rows.findIndex((r, i) => {
        if (used.has(i)) return false
        if (s.detected_direction === 'income' && Number(r.amount) > 0) return false
        if (s.detected_direction === 'expense' && Number(r.amount) <= 0) return false
        const a = Math.abs(Number(r.amount))
        const b = Math.abs(Number(s.amount))
        if (Math.abs(a - b) > 0.01 && Math.abs(a - (b + Number(s.fee || 0))) > 0.01) return false
        return Math.abs(new Date(r.transaction_date).getTime() - new Date(s.transaction_date!).getTime()) <= 2 * 86400000
      })
      if (idx >= 0) used.add(idx)
      else orphanSlips.push(s)
    }
    const orphanRows = rows.map((r, i) => ({ ...r, i })).filter((r) => !used.has(r.i))
    const outgoingOrphans = orphanRows.filter((r) => Number(r.amount) > 0)
    const incomingOrphans = orphanRows.filter((r) => Number(r.amount) <= 0)

    log(`\n  KBANK ${month}: ${rows.length} statement rows vs ${monthSlips.length} slips`)
    log(`\n  ✗ OUTGOING rows with no slip (${outgoingOrphans.length}) — invariant violations, a slip is owed:`)
    for (const r of outgoingOrphans) log(`      ${r.transaction_date} ${String(r.amount).padStart(10)}  ${r.description || ''}`)
    log(`\n  · Incoming rows with no slip (${incomingOrphans.length}) — expected for deposits you didn't initiate:`)
    for (const r of incomingOrphans) log(`      ${r.transaction_date} ${String(r.amount).padStart(10)}  ${r.description || ''}`)
    log(`\n  ? Slips with no KBANK row (${orphanSlips.length}) — wrong account, wrong month, or bad extraction:`)
    for (const s of orphanSlips) log(`      ${s.transaction_date} ${String(s.amount).padStart(10)}  ${s.recipient_name || ''}  ${s.filename}`)

    invariants.kbank = {
      rows: rows.length, slips: monthSlips.length,
      outgoingWithoutSlip: outgoingOrphans, incomingWithoutSlip: incomingOrphans, slipsWithoutRow: orphanSlips,
    }
  }

  // ── 4. ANOMALIES ──────────────────────────────────────────────────────
  log('\n── 4. ANOMALIES ' + '─'.repeat(56))

  // Same amount + same date appearing in more cards than there are real payments.
  const byKey = new Map<string, QueueItem[]>()
  for (const i of unresolved) {
    const st = i.statementTransaction
    if (!st?.amount) continue
    const key = `${st.date}|${Math.abs(Number(st.amount))}|${st.currency}`
    byKey.set(key, [...(byKey.get(key) || []), i])
  }
  const clusters = [...byKey.entries()].filter(([, v]) => v.length > 1)
  log(`\n  Duplicate-risk clusters (same date + amount on >1 card): ${clusters.length}`)
  for (const [key, items] of clusters) {
    log(`    ${key}  ×${items.length}`)
    for (const i of items) log(`      ${i.source.padEnd(13)} ${(i.statementTransaction?.description || '').slice(0, 44).padEnd(44)} ${i.id.slice(0, 60)}`)
  }

  const zeroAmount = unresolved.filter((i) => !Number(i.statementTransaction?.amount))
  log(`\n  Cards with no amount: ${zeroAmount.length}`)
  for (const i of zeroAmount) log(`    ${i.statementTransaction?.date}  ${(i.statementTransaction?.description || '').slice(0, 60)}`)

  log(`\n  Failed slip extractions (all time): ${failedSlips.length}`)
  const errs: Record<string, number> = {}
  for (const s of failedSlips) {
    const e = (s.extraction_error || 'unknown').slice(0, 70)
    errs[e] = (errs[e] || 0) + 1
  }
  for (const [e, n] of Object.entries(errs)) log(`    ${String(n).padStart(3)}×  ${e}`)

  out.anomalies = { clusters: clusters.map(([k, v]) => ({ key: k, ids: v.map((i) => i.id) })), zeroAmount: zeroAmount.length, failedSlips: failedSlips.length }
  out.invariants = invariants

  // ── SUMMARY ───────────────────────────────────────────────────────────
  log('\n' + '='.repeat(72))
  log(`SUMMARY — ${month}`)
  log('='.repeat(72))
  log(`  Unresolved cards       ${unresolved.length}`)
  log(`    ready to bulk-approve  ${tiers.auto.length}`)
  log(`    needs a spot-check     ${tiers.confirm.length}`)
  log(`    needs a decision       ${tiers.decide.length}`)
  log(`    blocked on source data ${tiers.blocked.length}`)
  log(`  Missing statement sources ${missing.length}${missing.length ? ': ' + missing.map((p) => p.name).join(', ') : ''}`)
  log(`  Duplicate-risk clusters   ${clusters.length}`)
  log('')

  if (asJson) console.log(JSON.stringify(out, null, 2))
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
