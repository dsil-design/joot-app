/**
 * Reject Match API Endpoint
 *
 * POST /api/reconciliation/queue/[id]/reject
 *
 * Rejects all suggested matches for a document
 * - Marks queue item as rejected
 * - Document remains unmatched
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
 * POST /api/reconciliation/queue/[id]/reject
 *
 * Reject all matches for a document
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { id: queueId } = await context.params

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('reconciliation_queue')
      .select(
        `
        id,
        document_id,
        status,
        metadata,
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

    // Delete all suggested matches for this document
    // (Keep manual matches if any exist)
    await supabase
      .from('transaction_document_matches')
      .delete()
      .eq('document_id', queueItem.document_id)
      .in('match_type', ['automatic', 'suggested'])

    // Update queue item to rejected
    await supabase
      .from('reconciliation_queue')
      .update({
        status: 'rejected',
        metadata: {
          ...queueItem.metadata,
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
        },
      })
      .eq('id', queueId)

    // Create audit log entry
    await supabase.from('reconciliation_audit_log').insert({
      queue_item_id: queueId,
      document_id: queueItem.document_id,
      transaction_id: null,
      action: 'rejected',
      performed_by: user.id,
      metadata: {
        previous_status: queueItem.status,
        new_status: 'rejected',
        reason: 'No suitable matches found',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Matches rejected successfully',
    })
  } catch (error) {
    console.error('Unexpected error in reject API:', error)
    return NextResponse.json(
      { error: 'Failed to reject matches', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
