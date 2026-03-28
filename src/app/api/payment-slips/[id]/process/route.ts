import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPaymentSlip } from '@/lib/payment-slips/slip-processor'

/**
 * POST /api/payment-slips/[id]/process
 *
 * Triggers processing of an uploaded payment slip image.
 * Downloads the image, sends to Claude Vision API for extraction,
 * validates results, and saves for review.
 *
 * Returns 202 immediately; processing runs in background.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slipId } = await params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(slipId)) {
      return NextResponse.json({ error: 'Invalid payment slip ID format' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify slip exists and belongs to user
    const { data: slip, error: fetchError } = await supabase
      .from('payment_slip_uploads')
      .select('id, user_id, status, filename')
      .eq('id', slipId)
      .single()

    if (fetchError || !slip) {
      return NextResponse.json({ error: 'Payment slip not found' }, { status: 404 })
    }

    if (slip.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (slip.status === 'processing') {
      // Allow re-triggering if stuck for more than 2 minutes
      const { data: fullSlip } = await supabase
        .from('payment_slip_uploads')
        .select('extraction_started_at')
        .eq('id', slipId)
        .single()

      const startedAt = fullSlip?.extraction_started_at
        ? new Date(fullSlip.extraction_started_at).getTime()
        : 0
      const stuckThresholdMs = 2 * 60 * 1000 // 2 minutes

      if (startedAt && Date.now() - startedAt < stuckThresholdMs) {
        return NextResponse.json(
          { error: 'Payment slip is already being processed', status: 'processing' },
          { status: 409 }
        )
      }

      // Reset stuck slip so it can be reprocessed
      await supabase
        .from('payment_slip_uploads')
        .update({ status: 'pending', extraction_error: null })
        .eq('id', slipId)
    }

    // Return 202 immediately
    const response = NextResponse.json(
      {
        success: true,
        message: 'Processing started',
        slip_id: slipId,
        status: 'processing',
        estimated_time_seconds: 8,
      },
      { status: 202 }
    )

    // Process in background (fire-and-forget)
    processPaymentSlip(slipId).catch((error) => {
      console.error(`Payment slip processing failed for ${slipId}:`, error)
    })

    return response
  } catch (error) {
    console.error('Payment slip process API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payment-slips/[id]/process
 *
 * Check processing status of a payment slip.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slipId } = await params

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: slip, error: fetchError } = await supabase
      .from('payment_slip_uploads')
      .select('id, status, extraction_confidence, extraction_error, extraction_started_at, extraction_completed_at')
      .eq('id', slipId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !slip) {
      return NextResponse.json({ error: 'Payment slip not found' }, { status: 404 })
    }

    return NextResponse.json({
      slip_id: slip.id,
      status: slip.status,
      confidence: slip.extraction_confidence,
      error: slip.extraction_error,
      started_at: slip.extraction_started_at,
      completed_at: slip.extraction_completed_at,
    })
  } catch (error) {
    console.error('Payment slip status API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
