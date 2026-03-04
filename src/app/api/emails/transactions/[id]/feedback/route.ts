import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { recordFeedback } from '@/lib/email/ai-feedback-service'
import type { AiFeedbackType } from '@/lib/types/email-imports'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_FEEDBACK_TYPES = [
  'classification_change',
  'skip_override',
  'extraction_correction',
  'undo_skip',
]

/**
 * POST /api/emails/transactions/[id]/feedback
 *
 * Records user feedback (correction) for an AI classification or extraction.
 *
 * Body:
 * - feedback_type: 'classification_change' | 'skip_override' | 'extraction_correction' | 'undo_skip'
 * - corrections: { classification?: string, skip?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid email transaction ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: {
      feedback_type?: string
      corrections?: { classification?: string; skip?: boolean }
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.feedback_type || !VALID_FEEDBACK_TYPES.includes(body.feedback_type)) {
      return NextResponse.json(
        { error: `Invalid feedback_type. Must be one of: ${VALID_FEEDBACK_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch email transaction for context
    const { data: emailTx, error: fetchError } = await supabase
      .from('email_transactions')
      .select('id, ai_classification, ai_suggested_skip, subject, from_address')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !emailTx) {
      return NextResponse.json(
        { error: 'Email transaction not found' },
        { status: 404 }
      )
    }

    // Get email body preview from emails table
    const serviceClient = createServiceRoleClient()
    const { data: emailData } = await serviceClient
      .from('emails')
      .select('text_body')
      .eq('user_id', user.id)
      .limit(1)

    const bodyPreview = emailData?.[0]?.text_body?.slice(0, 500) ?? null

    await recordFeedback({
      userId: user.id,
      emailTransactionId: id,
      feedbackType: body.feedback_type as AiFeedbackType,
      originalAiClassification: emailTx.ai_classification,
      originalAiSuggestedSkip: emailTx.ai_suggested_skip,
      correctedClassification: body.corrections?.classification ?? null,
      correctedSkip: body.corrections?.skip ?? null,
      emailSubject: emailTx.subject,
      emailFrom: emailTx.from_address,
      emailBodyPreview: bodyPreview,
    }, serviceClient)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in feedback endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
