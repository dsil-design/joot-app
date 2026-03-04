import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { recordFeedback } from '@/lib/email/ai-feedback-service'
import { AI_FEEDBACK_TYPE } from '@/lib/types/email-imports'
import type { AiFeedbackType } from '@/lib/types/email-imports'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/emails/transactions/[id]/unskip
 *
 * Changes status from 'skipped' → 'pending_review' and records undo_skip feedback.
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

    // Fetch email transaction
    const { data: emailTx, error: fetchError } = await supabase
      .from('email_transactions')
      .select('id, status, ai_classification, ai_suggested_skip, subject, from_address')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !emailTx) {
      return NextResponse.json(
        { error: 'Email transaction not found' },
        { status: 404 }
      )
    }

    if (emailTx.status !== 'skipped') {
      return NextResponse.json(
        { error: 'Can only unskip transactions with status "skipped"' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // Update status
    await serviceClient
      .from('email_transactions')
      .update({ status: 'pending_review' })
      .eq('id', id)
      .eq('user_id', user.id)

    // Record feedback
    await recordFeedback({
      userId: user.id,
      emailTransactionId: id,
      feedbackType: AI_FEEDBACK_TYPE.UNDO_SKIP as AiFeedbackType,
      originalAiClassification: emailTx.ai_classification,
      originalAiSuggestedSkip: emailTx.ai_suggested_skip,
      correctedSkip: false,
      emailSubject: emailTx.subject,
      emailFrom: emailTx.from_address,
    }, serviceClient)

    // Log activity
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'transaction_matched', // reusing closest type
        email_transaction_id: id,
        description: 'Email transaction unskipped (moved to pending review)',
        transactions_affected: 1,
      })

    return NextResponse.json({
      success: true,
      id,
      status: 'pending_review',
    })
  } catch (error) {
    console.error('Error in unskip endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
