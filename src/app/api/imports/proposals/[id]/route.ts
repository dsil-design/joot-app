import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProposalStatus } from '@/lib/proposals/proposal-service'

/**
 * PATCH /api/imports/proposals/[id]
 *
 * Update proposal status after user action.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, createdTransactionId, userModifications } = body as {
      status: 'accepted' | 'modified' | 'rejected'
      createdTransactionId?: string
      userModifications?: Record<string, { from: unknown; to: unknown }>
    }

    if (!['accepted', 'modified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify ownership
    const { data: proposal } = await supabase
      .from('transaction_proposals')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!proposal || proposal.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await updateProposalStatus(supabase, id, status, {
      createdTransactionId,
      userModifications,
    })

    // If modified, create ai_feedback entry for learning loop
    if (status === 'modified' && userModifications && Object.keys(userModifications).length > 0) {
      await supabase.from('ai_feedback').insert({
        user_id: user.id,
        feedback_type: 'proposal_correction',
        email_transaction_id: null,
        original_ai_classification: null,
        corrected_classification: JSON.stringify(userModifications),
        email_subject: `Proposal ${id}`,
        email_from: null,
        email_body_preview: null,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Proposal update API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
