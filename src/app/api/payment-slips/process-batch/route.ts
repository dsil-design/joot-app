import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPaymentSlip } from '@/lib/payment-slips/slip-processor'

// Batch extraction runs synchronously so concurrency stays bounded within
// one invocation; the client loops while `remaining > 0`.
export const maxDuration = 300

/** Slips extracted per invocation — sized so a batch finishes inside maxDuration. */
const DEFAULT_BATCH_LIMIT = 5
/** Concurrent vision extractions. Deliberately low: a bulk drop that outruns
 * the Anthropic rate limit once turned 45 slips into dead `failed` rows. */
const EXTRACTION_CONCURRENCY = 2

/**
 * POST /api/payment-slips/process-batch
 *
 * Processes a batch of payment slips with bounded concurrency.
 *
 * Body:
 *   ids?: string[]              — explicit slip ids to (re)process
 *   scope?: 'pending' | 'failed-retryable'
 *                               — used when ids omitted. 'failed-retryable'
 *                                 picks up slips that failed on transient
 *                                 errors (rate limit / overload / timeout)
 *                                 so a whole dead batch is one call, not 46.
 *   limit?: number              — max slips this invocation (default 5)
 *
 * Returns { processed, failed, remaining } — call again while remaining > 0.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const scope: string = body.scope || 'pending'
    const limit = Math.min(20, Math.max(1, Number(body.limit) || DEFAULT_BATCH_LIMIT))
    const explicitIds: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined

    let candidateIds: string[]

    if (explicitIds && explicitIds.length > 0) {
      const { data } = await supabase
        .from('payment_slip_uploads')
        .select('id')
        .eq('user_id', user.id)
        .in('id', explicitIds)
      candidateIds = (data || []).map((r) => r.id)
    } else if (scope === 'failed-retryable') {
      // Transient failures marked retryable by the processor, plus legacy
      // rows that predate the flag but carry a rate-limit error message.
      const { data } = await supabase
        .from('payment_slip_uploads')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'failed')
        .or('extraction_log->>retryable.eq.true,extraction_error.ilike.%rate_limit%')
        .order('uploaded_at', { ascending: true })
      candidateIds = (data || []).map((r) => r.id)
    } else {
      const { data } = await supabase
        .from('payment_slip_uploads')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: true })
      candidateIds = (data || []).map((r) => r.id)
    }

    const batch = candidateIds.slice(0, limit)
    const remaining = candidateIds.length - batch.length

    if (batch.length === 0) {
      return NextResponse.json({ processed: 0, failed: 0, remaining: 0 })
    }

    // Reset before processing so a reprocessed slip starts clean
    await supabase
      .from('payment_slip_uploads')
      .update({
        status: 'pending',
        extraction_error: null,
        extraction_data: null,
        extraction_confidence: null,
        matched_transaction_id: null,
        match_confidence: null,
      })
      .eq('user_id', user.id)
      .in('id', batch)

    let processed = 0
    let failed = 0
    let cursor = 0
    const worker = async () => {
      while (cursor < batch.length) {
        const id = batch[cursor++]
        try {
          await processPaymentSlip(id)
          processed++
        } catch {
          // processPaymentSlip already recorded the failure on the row
          failed++
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(EXTRACTION_CONCURRENCY, batch.length) }, worker)
    )

    return NextResponse.json({ processed, failed, remaining })
  } catch (error) {
    console.error('Payment slip batch processing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
