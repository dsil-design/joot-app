/**
 * MUTATES PAYMENT SLIP ROWS — recomputes matched_transaction_id using the
 * current matching rules. Never creates, edits or deletes transactions.
 *
 * The old rule took the first amount match in whatever order Postgres returned
 * and never preferred the same-day row, so slips with a recurring amount could
 * bind to a neighbouring day's transaction at high confidence. This re-derives
 * those links without re-running vision.
 *
 * Scope is deliberately narrow — it only re-derives links the buggy rule
 * itself produced:
 *   - the slip already has a link (this repairs links, it does not invent them)
 *   - match_confidence is 95 or 85, the only two values that rule ever wrote.
 *     /api/imports/rematch writes scored confidences, so anything else came
 *     from the matching engine or from you, and is left alone
 *   - the slip is still awaiting review. An approved link is a human decision;
 *     disagreements are reported, never overwritten
 *
 * Usage:
 *   npx tsx scripts/reconcile/rematch-slip-transactions.ts <user-email> [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { selectTransactionMatch, dayDistance } from '../../src/lib/payment-slips/transaction-matcher'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dryRun = process.argv.includes('--dry-run')
const email = process.argv.find((a) => a.includes('@'))

interface Slip {
  id: string
  filename: string
  transaction_date: string | null
  amount: number | null
  matched_transaction_id: string | null
  match_confidence: number | null
  review_status: string
}
interface Txn {
  id: string
  transaction_date: string
  amount: number | string
  description: string | null
}

async function main() {
  if (!email) {
    console.error('Usage: npx tsx scripts/reconcile/rematch-slip-transactions.ts <user-email> [--dry-run]')
    process.exit(1)
  }
  const { data: user } = await sb.from('users').select('id').eq('email', email).single()
  if (!user) {
    console.error(`No user found for "${email}"`)
    process.exit(1)
  }

  const { data: slipRows } = await sb
    .from('payment_slip_uploads')
    .select('id, filename, transaction_date, amount, matched_transaction_id, match_confidence, review_status')
    .eq('user_id', user.id)
    .not('transaction_date', 'is', null)
  const { data: txRows } = await sb
    .from('transactions')
    .select('id, transaction_date, amount, description')
    .eq('user_id', user.id)
    .eq('original_currency', 'THB')

  const slips = (slipRows as Slip[] | null) || []
  const txns = (txRows as Txn[] | null) || []
  const byId = new Map(txns.map((t) => [t.id, t]))

  // Every transaction currently spoken for, so a tie can be broken.
  const claimed = new Set(
    slips.map((s) => s.matched_transaction_id).filter((id): id is string => Boolean(id))
  )

  let corrected = 0
  let cleared = 0
  const skippedApproved: string[] = []

  for (const slip of slips) {
    if (!slip.amount || !slip.transaction_date) continue
    // Repair only — never invent a link where there was none.
    if (!slip.matched_transaction_id) continue
    // The only two confidences the buggy rule wrote. Anything else came from
    // the matching engine via /api/imports/rematch, or from a human.
    if (slip.match_confidence !== 95 && slip.match_confidence !== 85) continue

    const candidates = txns.filter(
      (t) =>
        Math.abs(Number(t.amount) - Number(slip.amount)) < 0.01 &&
        dayDistance(t.transaction_date, slip.transaction_date!) <= 1
    )
    const others = new Set(claimed)
    if (slip.matched_transaction_id) others.delete(slip.matched_transaction_id)

    const next = selectTransactionMatch(
      candidates,
      { amount: Number(slip.amount), date: slip.transaction_date },
      others
    )
    if (next.transactionId === slip.matched_transaction_id) continue

    const before = slip.matched_transaction_id ? byId.get(slip.matched_transaction_id) : null
    const after = next.transactionId ? byId.get(next.transactionId) : null

    if (slip.review_status === 'approved') {
      skippedApproved.push(
        `  ${slip.filename} (${slip.transaction_date} ฿${slip.amount}) -> currently ${before?.transaction_date} "${before?.description}"`
      )
      continue
    }

    console.log(`${slip.filename}  ${slip.transaction_date} ฿${slip.amount}`)
    console.log(`   was: ${before ? `${before.transaction_date} "${before.description}" (conf ${slip.match_confidence})` : 'unlinked'}`)
    console.log(`   now: ${after ? `${after.transaction_date} "${after.description}" (conf ${next.confidence})` : `unlinked — ${next.reason}`}`)

    if (next.transactionId) corrected++
    else cleared++

    if (!dryRun) {
      const { error } = await sb
        .from('payment_slip_uploads')
        .update({ matched_transaction_id: next.transactionId, match_confidence: next.confidence })
        .eq('id', slip.id)
      if (error) console.error(`   FAILED: ${error.message}`)
    }
  }

  console.log(`\n${corrected} link(s) corrected · ${cleared} cleared as ambiguous`)
  if (skippedApproved.length) {
    console.log(`\n${skippedApproved.length} approved slip(s) disagree but were left alone (your decision, not the matcher's):`)
    skippedApproved.slice(0, 10).forEach((l) => console.log(l))
  }
  if (dryRun) console.log('\n--dry-run: nothing written')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
