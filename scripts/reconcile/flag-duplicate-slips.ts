/**
 * MUTATES PAYMENT SLIP ROWS — sets duplicate_of_slip_id on slips that share a
 * bank transaction_reference. Never touches transactions.
 *
 * Extraction now flags duplicates as it runs, but rows extracted before that
 * carry no link. This backfills them using the same detector, so the review
 * queue shows the existing overlap (the 2026-04-11 and 2026-04-13 uploads of
 * the same February payments) without re-running vision on 300 slips.
 *
 * The earliest slip in each group is treated as the original, except that an
 * approved copy always wins — that is the one the ledger is built on.
 *
 * Usage:
 *   npx tsx scripts/reconcile/flag-duplicate-slips.ts <user-email> [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { isComparableReference } from '../../src/lib/payment-slips/duplicate-detector'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dryRun = process.argv.includes('--dry-run')
const email = process.argv.find((a) => a.includes('@'))

interface Row {
  id: string
  filename: string
  transaction_reference: string | null
  transaction_date: string | null
  amount: number | null
  review_status: string
  uploaded_at: string
  duplicate_of_slip_id: string | null
}

async function main() {
  if (!email) {
    console.error('Usage: npx tsx scripts/reconcile/flag-duplicate-slips.ts <user-email> [--dry-run]')
    process.exit(1)
  }
  const { data: user } = await sb.from('users').select('id').eq('email', email).single()
  if (!user) {
    console.error(`No user found for "${email}"`)
    process.exit(1)
  }

  const { data } = await sb
    .from('payment_slip_uploads')
    .select('id, filename, transaction_reference, transaction_date, amount, review_status, uploaded_at, duplicate_of_slip_id')
    .eq('user_id', user.id)
    .not('transaction_reference', 'is', null)
    .order('uploaded_at', { ascending: true })

  const rows = (data as Row[] | null) || []
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    if (!isComparableReference(r.transaction_reference)) continue
    const key = r.transaction_reference!.trim()
    groups.set(key, [...(groups.get(key) || []), r])
  }

  const dupeGroups = [...groups.entries()].filter(([, g]) => g.length > 1)
  console.log(`${rows.length} slip(s) with a reference · ${dupeGroups.length} duplicate group(s)\n`)

  let flagged = 0
  for (const [ref, group] of dupeGroups) {
    const original = group.find((r) => r.review_status === 'approved') ?? group[0]
    const copies = group.filter((r) => r.id !== original.id)

    console.log(`${ref}  ${original.transaction_date} ฿${original.amount}`)
    console.log(`   original: ${original.filename} [${original.review_status}]`)

    for (const copy of copies) {
      const already = copy.duplicate_of_slip_id === original.id
      console.log(`   copy:     ${copy.filename} [${copy.review_status}]${already ? ' (already flagged)' : ''}`)
      if (already) continue
      flagged++
      if (!dryRun) {
        const { error } = await sb
          .from('payment_slip_uploads')
          .update({ duplicate_of_slip_id: original.id })
          .eq('id', copy.id)
        if (error) console.error(`      FAILED: ${error.message}`)
      }
    }
    console.log()
  }

  console.log(`${flagged} slip(s) newly flagged as duplicates` + (dryRun ? '\n--dry-run: nothing written' : ''))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
