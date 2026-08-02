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
 *   npx tsx scripts/reconcile/drain-slips.ts <user-email> [--scope=<scope>] [--dry-run]
 *
 * Scopes:
 *   pending          (default) slips awaiting extraction, plus rows orphaned
 *                    at `processing`
 *   failed-retryable slips killed by a transient error (rate limit / overload
 *                    / timeout) — e.g. the 2026-04-13 bulk drop that outran
 *                    the Anthropic rate limit and left 45 dead rows
 *   stale            what the hourly sweeper claims: abandoned work only
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { drainSlips, DEFAULT_BATCH_SIZE, DEFAULT_CONCURRENCY } from '../../src/lib/payment-slips/drain'
import { buildDrainDeps, type DrainScope } from '../../src/lib/payment-slips/drain-queries'
import { processPaymentSlip } from '../../src/lib/payment-slips/slip-processor'

const SCOPES: DrainScope[] = ['pending', 'failed-retryable', 'stale']

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const email = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
const scopeArg = process.argv.find((a) => a.startsWith('--scope='))?.split('=')[1]
const scope = (scopeArg || 'pending') as DrainScope

async function main() {
  if (!email) {
    console.error(
      'Usage: npx tsx scripts/reconcile/drain-slips.ts <user-email> [--scope=<scope>] [--dry-run]'
    )
    process.exit(1)
  }
  if (!SCOPES.includes(scope)) {
    console.error(`Unknown scope "${scope}". Expected one of: ${SCOPES.join(', ')}`)
    process.exit(1)
  }

  const { data: user } = await sb.from('users').select('id, email').eq('email', email).single()
  if (!user) {
    console.error(`No user found for "${email}"`)
    process.exit(1)
  }

  const deps = buildDrainDeps(sb, user.id, { scope, processSlip: processPaymentSlip })
  const queued = await deps.countRemaining(new Set())
  console.log(`${user.email} [scope=${scope}]: ${queued} slip(s) to extract`)

  if (queued === 0) return
  if (dryRun) {
    const preview = await deps.claimCandidates(queued, new Set())
    const { data } = await sb
      .from('payment_slip_uploads')
      .select('filename, status, uploaded_at, extraction_error')
      .in('id', preview)
      .order('uploaded_at', { ascending: true })
    for (const s of data || []) {
      const err = s.extraction_error ? ` :: ${s.extraction_error.slice(0, 60)}` : ''
      console.log(`  ${s.status.padEnd(11)} ${s.uploaded_at.slice(0, 10)} ${s.filename}${err}`)
    }
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
