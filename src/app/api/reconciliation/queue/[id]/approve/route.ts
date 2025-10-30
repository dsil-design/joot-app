/**
 * Approve Match API Endpoint
 *
 * POST /api/reconciliation/queue/[id]/approve
 *
 * Approves a transaction match and links document to transaction
 * - Updates match record to 'manual' type
 * - Marks document as completed
 * - Marks queue item as completed
 * - Creates audit log entry
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/reconciliation/queue/[id]/approve
 *
 * Approve a transaction match
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { id: queueId } = await context.params
    const body = await request.json()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate transaction ID
    if (!body.transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    // Get queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('reconciliation_queue')
      .select(
        `
        id,
        document_id,
        documents!inner (
          user_id
        )
      `
      )
      .eq('id', queueId)
      .single()

    if (queueError || !queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
    }

    // Verify ownership
    const document = Array.isArray(queueItem.documents)
      ? queueItem.documents[0]
      : queueItem.documents
    if (document.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update or create match record
    const { data: existingMatch } = await supabase
      .from('transaction_document_matches')
      .select('id')
      .eq('document_id', queueItem.document_id)
      .eq('transaction_id', body.transactionId)
      .single()

    if (existingMatch) {
      // Update existing match to manual
      await supabase
        .from('transaction_document_matches')
        .update({
          match_type: 'manual',
          matched_at: new Date().toISOString(),
          matched_by: user.id,
        })
        .eq('id', existingMatch.id)
    } else {
      // Create new manual match
      await supabase.from('transaction_document_matches').insert({
        document_id: queueItem.document_id,
        transaction_id: body.transactionId,
        confidence_score: 100, // Manual match is 100% confidence
        match_type: 'manual',
        matched_at: new Date().toISOString(),
        matched_by: user.id,
        metadata: {
          manual_review: true,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        },
      })
    }

    // Update document status to completed
    await supabase
      .from('documents')
      .update({
        processing_status: 'completed',
      })
      .eq('id', queueItem.document_id)

    // Update queue item to completed
    await supabase
      .from('reconciliation_queue')
      .update({
        status: 'completed',
        metadata: {
          ...queueItem.metadata,
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          approved_transaction_id: body.transactionId,
        },
      })
      .eq('id', queueId)

    // Create audit log entry
    await supabase.from('reconciliation_audit_log').insert({
      queue_item_id: queueId,
      document_id: queueItem.document_id,
      transaction_id: body.transactionId,
      action: 'approved',
      performed_by: user.id,
      metadata: {
        previous_status: queueItem.status,
        new_status: 'completed',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Match approved successfully',
    })
  } catch (error) {
    console.error('Unexpected error in approve API:', error)
    return NextResponse.json(
      { error: 'Failed to approve match', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
