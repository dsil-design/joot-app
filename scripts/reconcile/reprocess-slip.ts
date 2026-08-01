/**
 * MUTATES ONE PAYMENT SLIP ROW — re-runs vision extraction for a slip by
 * filename or id. Never touches transactions.
 *
 * Usage: npx tsx scripts/reconcile/reprocess-slip.ts IMG_0615.JPG
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { processPaymentSlip } from '../../src/lib/payment-slips/slip-processor'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const target = process.argv[2]

async function main() {
  if (!target) {
    console.error('Usage: npx tsx scripts/reconcile/reprocess-slip.ts <filename-or-id>')
    process.exit(1)
  }

  const uuidRe = /^[0-9a-f-]{36}$/i
  const query = sb.from('payment_slip_uploads').select('id, filename, amount, status, extraction_confidence')
  const { data: slips } = uuidRe.test(target)
    ? await query.eq('id', target)
    : await query.eq('filename', target)

  if (!slips || slips.length === 0) {
    console.error(`No slip found for "${target}"`)
    process.exit(1)
  }
  if (slips.length > 1) {
    console.error(`Multiple slips match "${target}" — pass an id:`)
    for (const s of slips) console.log(`  ${s.id}  ${s.filename}  ${s.amount}`)
    process.exit(1)
  }

  const slip = slips[0]
  console.log(`Before: ${slip.filename}  amount=${slip.amount}  status=${slip.status}  confidence=${slip.extraction_confidence}`)

  const result = await processPaymentSlip(slip.id)
  console.log(`After:  amount=${result.extraction.amount}  confidence=${result.confidence}  direction=${result.direction}`)

  const { data: updated } = await sb
    .from('payment_slip_uploads')
    .select('amount, extraction_confidence, extraction_log')
    .eq('id', slip.id)
    .single()
  const log = updated?.extraction_log as { statement_cross_check?: unknown } | null
  console.log(`Cross-check: ${JSON.stringify(log?.statement_cross_check ?? 'n/a')}`)
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1) })
