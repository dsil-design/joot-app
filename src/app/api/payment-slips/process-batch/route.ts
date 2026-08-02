import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPaymentSlip } from '@/lib/payment-slips/slip-processor'
import {
  drainSlips,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  DEFAULT_TIME_BUDGET_MS,
} from '@/lib/payment-slips/drain'
import { buildDrainDeps, type DrainScope } from '@/lib/payment-slips/drain-queries'

// The whole queue drains inside one invocation, so extraction no longer
// depends on the browser staying open to ask for the next batch.
export const maxDuration = 300

/**
 * POST /api/payment-slips/process-batch
 *
 * Drains the payment slip queue server-side.
 *
 * Body:
 *   ids?: string[]              — explicit slip ids to (re)process
 *   scope?: 'pending' | 'failed-retryable'
 *                               — used when ids omitted. 'failed-retryable'
 *                                 picks up slips that failed on transient
 *                                 errors (rate limit / overload / timeout)
 *                                 so a whole dead batch is one call, not 46.
 *   batchSize?: number          — slips per round (default 5)
 *
 * Returns { processed, failed, remaining, batches, stopReason }. `remaining`
 * is normally 0; it is non-zero only when a queue outlasts the time budget,
 * in which case calling again resumes where this call stopped.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const scope: DrainScope = body.scope === 'failed-retryable' ? 'failed-retryable' : 'pending'
    const batchSize = Math.min(20, Math.max(1, Number(body.batchSize) || DEFAULT_BATCH_SIZE))
    const explicitIds: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined

    const result = await drainSlips(
      buildDrainDeps(supabase, user.id, {
        scope,
        explicitIds,
        processSlip: processPaymentSlip,
      }),
      {
        batchSize,
        concurrency: DEFAULT_CONCURRENCY,
        timeBudgetMs: DEFAULT_TIME_BUDGET_MS,
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Payment slip batch processing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
