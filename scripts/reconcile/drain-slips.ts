/**
 * MUTATES PAYMENT SLIP ROWS — drains a user's slip extraction queue.
 * Never touches transactions.
 *
 * Recovery tool for slips stranded at `pending` (or orphaned at `processing`
 * by an invocation that died mid-extraction). Drives the same drainSlips loop
 * and the same candidate queries the API route uses, so what it picks up is
 * exactly what production would.
 *
 * Usage:
 *   npx tsx scripts/reconcile/drain-slips.ts <user-email> [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { drainSlips, DEFAULT_BATCH_SIZE, DEFAULT_CONCURRENCY } from '../../src/lib/payment-slips/drain'
import { buildDrainDeps } from '../../src/lib/payment-slips/drain-queries'
import { processPaymentSlip } from '../../src/lib/payment-slips/slip-processor'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const email = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

async function main() {
  if (!email) {
    console.error('Usage: npx tsx scripts/reconcile/drain-slips.ts <user-email> [--dry-run]')
    process.exit(1)
  }

  const { data: user } = await sb.from('users').select('id, email').eq('email', email).single()
  if (!user) {
    console.error(`No user found for "${email}"`)
    process.exit(1)
  }

  const deps = buildDrainDeps(sb, user.id, { scope: 'pending', processSlip: processPaymentSlip })
  const queued = await deps.countRemaining(new Set())
  console.log(`${user.email}: ${queued} slip(s) awaiting extraction`)

  if (queued === 0) return
  if (dryRun) {
    const preview = await deps.claimCandidates(queued, new Set())
    const { data } = await sb
      .from('payment_slip_uploads')
      .select('filename, status, uploaded_at')
      .in('id', preview)
      .order('uploaded_at', { ascending: true })
    for (const s of data || []) console.log(`  ${s.status.padEnd(11)} ${s.filename}`)
    console.log('\n--dry-run: nothing processed')
    return
  }

  const startedAt = Date.now()
  const result = await drainSlips(deps, {
    batchSize: DEFAULT_BATCH_SIZE,
    concurrency: DEFAULT_CONCURRENCY,
  })

  console.log(
    `\nprocessed=${result.processed} failed=${result.failed} remaining=${result.remaining} ` +
      `batches=${result.batches} stopReason=${result.stopReason} ` +
      `in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  )
  if (result.remaining > 0) console.log('Run again to continue draining.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
