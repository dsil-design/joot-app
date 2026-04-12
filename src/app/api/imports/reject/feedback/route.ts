import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/imports/reject/feedback
 *
 * Records user feedback for why they rejected/skipped items in the review queue.
 * Stores in the ai_feedback table with feedback_type = 'proposal_rejection'.
 *
 * Body:
 * - compositeIds: string[] — the review queue composite IDs that were rejected
 * - reason: string — why the user rejected (preset label or free-form text)
 * - context?: { description?: string, amount?: number, currency?: string, confidence?: number, vendor?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: {
      compositeIds?: string[]
      reason?: string
      correctedDate?: string
      context?: {
        description?: string
        amount?: number
        currency?: string
        confidence?: number
        vendor?: string
      }
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { compositeIds, reason, correctedDate, context } = body

    if (!compositeIds || compositeIds.length === 0) {
      return NextResponse.json(
        { error: 'compositeIds is required' },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      )
    }

    // Validate correctedDate format if provided
    if (correctedDate && !/^\d{4}-\d{2}-\d{2}$/.test(correctedDate)) {
      return NextResponse.json(
        { error: 'correctedDate must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // Build context summary for the email_body_preview field
    const contextParts: string[] = [`Reason: ${reason.trim()}`]
    if (correctedDate) contextParts.unshift(`CorrectedDate: ${correctedDate}`)
    if (context?.description) contextParts.push(`Description: ${context.description}`)
    if (context?.amount != null && context?.currency) {
      contextParts.push(`Amount: ${context.currency} ${context.amount}`)
    }
    if (context?.confidence != null) contextParts.push(`Confidence: ${context.confidence}%`)
    if (context?.vendor) contextParts.push(`Vendor: ${context.vendor}`)
    const bodyPreview = contextParts.join(' | ').slice(0, 500)

    // Insert one feedback row per composite ID
    const rows = compositeIds.map((compositeId) => ({
      user_id: user.id,
      email_transaction_id: null as string | null,
      feedback_type: 'proposal_rejection' as const,
      original_ai_classification: null,
      original_ai_suggested_skip: null,
      corrected_classification: null,
      corrected_skip: null,
      // Store composite ID in email_subject for traceability
      email_subject: compositeId,
      // Store vendor/description context in email_from
      email_from: context?.vendor || context?.description || null,
      // Store the full reason + context in email_body_preview
      email_body_preview: bodyPreview,
    }))

    const { error: insertError } = await serviceClient
      .from('ai_feedback')
      .insert(rows)

    if (insertError) {
      console.error('Failed to record rejection feedback:', insertError)
      return NextResponse.json(
        { error: 'Failed to record feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    console.error('Rejection feedback API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
