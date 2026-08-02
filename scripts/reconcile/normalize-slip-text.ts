/**
 * MUTATES PAYMENT SLIP ROWS — strips invisible characters from already-stored
 * extractions. Never touches transactions.
 *
 * Extraction now normalises text as the model response is parsed, but rows
 * written before that still carry zero-width characters — including in
 * `transaction_reference`, where they make two slips of the same payment
 * compare unequal. This backfills those rows so the bank reference can
 * actually be used to spot a re-uploaded slip.
 *
 * Usage:
 *   npx tsx scripts/reconcile/normalize-slip-text.ts [user-email] [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import {
  normalizeText,
  normalizeReference,
  normalizeExtractionText,
} from '../../src/lib/payment-slips/text-normalizer'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dryRun = process.argv.includes('--dry-run')
const email = process.argv.find((a) => a.includes('@'))

/** Flattened string columns, and how each is normalised. */
const TEXT_COLUMNS = [
  'sender_name',
  'sender_bank',
  'sender_account',
  'recipient_name',
  'recipient_bank',
  'recipient_account',
  'memo',
] as const
const REFERENCE_COLUMNS = ['transaction_reference', 'bank_reference'] as const

async function main() {
  let userId: string | undefined
  if (email) {
    const { data: user } = await sb.from('users').select('id').eq('email', email).single()
    if (!user) {
      console.error(`No user found for "${email}"`)
      process.exit(1)
    }
    userId = user.id
  }

  let query = sb
    .from('payment_slip_uploads')
    .select(`id, filename, extraction_data, ${TEXT_COLUMNS.join(', ')}, ${REFERENCE_COLUMNS.join(', ')}`)
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) {
    console.error(error)
    process.exit(1)
  }

  const rows = (data as unknown as Record<string, unknown>[]) || []
  let changed = 0
  let fieldsChanged = 0

  for (const row of rows) {
    const update: Record<string, unknown> = {}

    for (const col of TEXT_COLUMNS) {
      const before = row[col]
      if (typeof before !== 'string') continue
      const after = normalizeText(before)
      if (after !== before) update[col] = after
    }
    for (const col of REFERENCE_COLUMNS) {
      const before = row[col]
      if (typeof before !== 'string') continue
      const after = normalizeReference(before)
      if (after !== before) update[col] = after
    }

    // Keep the stored extraction consistent with the flattened columns.
    if (row.extraction_data && typeof row.extraction_data === 'object') {
      const before = JSON.stringify(row.extraction_data)
      const after = JSON.stringify(
        normalizeExtractionText({ ...(row.extraction_data as Record<string, unknown>) })
      )
      if (after !== before) update.extraction_data = JSON.parse(after)
    }

    if (Object.keys(update).length === 0) continue
    changed++
    fieldsChanged += Object.keys(update).length

    const detail = Object.entries(update)
      .filter(([k]) => k !== 'extraction_data')
      .map(([k, v]) => `${k}: ${JSON.stringify(row[k])} -> ${JSON.stringify(v)}`)
    console.log(`${row.filename}`)
    for (const d of detail) console.log(`   ${d}`)
    if (update.extraction_data) console.log(`   extraction_data: cleaned`)

    if (!dryRun) {
      const { error: upErr } = await sb
        .from('payment_slip_uploads')
        .update(update)
        .eq('id', row.id as string)
      if (upErr) console.error(`   FAILED: ${upErr.message}`)
    }
  }

  console.log(
    `\n${rows.length} slip(s) scanned · ${changed} needed cleaning · ${fieldsChanged} field(s)` +
      (dryRun ? '\n--dry-run: nothing written' : '')
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
