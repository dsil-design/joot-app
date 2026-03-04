import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { recordFeedback } from '@/lib/email/ai-feedback-service'
import { AI_CLASSIFICATION, AI_FEEDBACK_TYPE } from '@/lib/types/email-imports'
import type { AiClassification, AiFeedbackType } from '@/lib/types/email-imports'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_CLASSIFICATIONS = Object.values(AI_CLASSIFICATION) as string[]

/**
 * PATCH /api/emails/transactions/[id]/classify
 *
 * Updates classification and records feedback.
 *
 * Body:
 * - classification: AiClassification value
 */
export async function PATCH(
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

    let body: { classification?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.classification || !VALID_CLASSIFICATIONS.includes(body.classification)) {
      return NextResponse.json(
        { error: `Invalid classification. Must be one of: ${VALID_CLASSIFICATIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch email transaction
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

    const serviceClient = createServiceRoleClient()

    // Update classification
    await serviceClient
      .from('email_transactions')
      .update({ ai_classification: body.classification })
      .eq('id', id)
      .eq('user_id', user.id)

    // Record feedback
    await recordFeedback({
      userId: user.id,
      emailTransactionId: id,
      feedbackType: AI_FEEDBACK_TYPE.CLASSIFICATION_CHANGE as AiFeedbackType,
      originalAiClassification: emailTx.ai_classification,
      originalAiSuggestedSkip: emailTx.ai_suggested_skip,
      correctedClassification: body.classification as AiClassification,
      emailSubject: emailTx.subject,
      emailFrom: emailTx.from_address,
    }, serviceClient)

    return NextResponse.json({
      success: true,
      id,
      ai_classification: body.classification,
    })
  } catch (error) {
    console.error('Error in classify endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
