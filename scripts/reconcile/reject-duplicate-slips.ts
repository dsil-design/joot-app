/**
 * MUTATES PAYMENT SLIP ROWS — rejects slips flagged as duplicates of a payment
 * already in the account. Never touches transactions.
 *
 * Mirrors what /api/imports/reject does for a slip, with one deliberate
 * omission: it does not record a learning decision and does not append to
 * rejected_transaction_ids.
 *
 * Both of those exist to teach the matcher "this slip does not belong to that
 * transaction". Here the pairing was correct — the slip is redundant, not
 * mismatched — and reject decisions feed getRejectionPatterns(), which
 * suppresses similar future matches by description. Recording these would
 * train the system to distrust legitimate payments to the same counterparty.
 *
 * The link is still cleared, so a rejected copy stops pointing at a
 * transaction the surviving slip already sources.
 *
 * Usage:
 *   npx tsx scripts/reconcile/reject-duplicate-slips.ts <user-email> [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dryRun = process.argv.includes('--dry-run')
const email = process.argv.find((a) => a.includes('@'))

interface Slip {
  id: string
  filename: string
  transaction_date: string | null
  amount: number | null
  review_status: string
  matched_transaction_id: string | null
  duplicate_of_slip_id: string | null
}

async function main() {
  if (!email) {
    console.error('Usage: npx tsx scripts/reconcile/reject-duplicate-slips.ts <user-email> [--dry-run]')
    process.exit(1)
  }
  const { data: user } = await sb.from('users').select('id').eq('email', email).single()
  if (!user) {
    console.error(`No user found for "${email}"`)
    process.exit(1)
  }

  const { data } = await sb
    .from('payment_slip_uploads')
    .select('id, filename, transaction_date, amount, review_status, matched_transaction_id, duplicate_of_slip_id')
    .eq('user_id', user.id)
    .not('duplicate_of_slip_id', 'is', null)
    .eq('review_status', 'pending')
    .order('transaction_date', { ascending: true })

  const copies = (data as Slip[] | null) || []
  if (copies.length === 0) {
    console.log('No pending duplicate slips to reject.')
    return
  }

  // Resolve the originals so the log says what each copy is a copy of.
  const originalIds = copies.map((c) => c.duplicate_of_slip_id!).filter(Boolean)
  const { data: originalRows } = await sb
    .from('payment_slip_uploads')
    .select('id, filename, review_status')
    .in('id', originalIds)
  const originals = new Map(
    ((originalRows as { id: string; filename: string; review_status: string }[] | null) || []).map(
      (o) => [o.id, o]
    )
  )

  console.log(`${copies.length} pending duplicate slip(s) to reject:\n`)
  for (const copy of copies) {
    const original = originals.get(copy.duplicate_of_slip_id!)
    console.log(`  ${copy.filename}  ${copy.transaction_date} ฿${copy.amount}`)
    console.log(`     duplicate of ${original?.filename ?? '(unknown)'} [${original?.review_status ?? '?'}]`)
    if (copy.matched_transaction_id) {
      console.log(`     clearing link to transaction ${copy.matched_transaction_id.slice(0, 8)}`)
    }
  }

  if (dryRun) {
    console.log('\n--dry-run: nothing written')
    return
  }

  let rejected = 0
  for (const copy of copies) {
    // The returned row is checked rather than just the error. A BEFORE trigger
    // on this table used to rewrite review_status when the link was cleared in
    // the same statement, so the update succeeded while the rejection silently
    // did not take — reporting success for work that had not happened.
    const { data: after, error } = await sb
      .from('payment_slip_uploads')
      .update({
        review_status: 'rejected',
        matched_transaction_id: null,
        match_confidence: null,
      })
      .eq('id', copy.id)
      .eq('user_id', user.id)
      .select('review_status')
      .single()

    if (error) {
      console.error(`FAILED ${copy.filename}: ${error.message}`)
      continue
    }
    if (after?.review_status !== 'rejected') {
      console.error(
        `FAILED ${copy.filename}: update applied but review_status is "${after?.review_status}" — something rewrote it`
      )
      continue
    }
    rejected++
  }

  // Same as the reject route: stop any generated proposal resurfacing.
  const compositeIds = copies.map((c) => `slip:${c.id}`)
  const { error: proposalError } = await sb
    .from('transaction_proposals')
    .update({ status: 'rejected' })
    .eq('user_id', user.id)
    .in('composite_id', compositeIds)
    .in('status', ['pending', 'stale'])
  if (proposalError) console.error(`Proposal update failed: ${proposalError.message}`)

  console.log(`\n${rejected} slip(s) rejected`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
