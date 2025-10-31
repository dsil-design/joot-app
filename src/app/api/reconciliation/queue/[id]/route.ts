/**
 * Reconciliation Queue Item API Endpoint
 *
 * GET /api/reconciliation/queue/[id]
 * PATCH /api/reconciliation/queue/[id]
 *
 * Get or update a single queue item with matches
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
 * GET /api/reconciliation/queue/[id]
 *
 * Fetch single queue item with document, extraction, and matches
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

    // Get queue item with document
    const { data: queueItem, error: queueError } = await supabase
      .from('reconciliation_queue')
      .select(
        `
        id,
        document_id,
        priority,
        status,
        created_at,
        metadata,
        documents!inner (
          id,
          file_name,
          file_type,
          file_size_bytes,
          file_url,
          created_at,
          user_id
        )
      `
      )
      .eq('id', queueId)
      .eq('documents.user_id', user.id) // Ensure user owns document
      .single()

    if (queueError || !queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
    }

    // Get extraction data
    const { data: extraction, error: extractionError } = await supabase
      .from('document_extractions')
      .select(
        `
        vendor_name,
        amount,
        currency,
        transaction_date,
        extraction_confidence
      `
      )
      .eq('document_id', queueItem.document_id)
      .single()

    if (extractionError) {
      console.error('Failed to fetch extraction:', extractionError)
      // Continue without extraction rather than failing
    }

    // Get transaction matches
    const { data: matches, error: matchesError } = await supabase
      .from('transaction_document_matches')
      .select(
        `
        id,
        transaction_id,
        confidence_score,
        match_type,
        metadata,
        transactions!inner (
          id,
          description,
          amount,
          currency,
          date,
          category
        )
      `
      )
      .eq('document_id', queueItem.document_id)
      .order('confidence_score', { ascending: false })

    if (matchesError) {
      console.error('Failed to fetch matches:', matchesError)
      // Continue without matches rather than failing
    }

    // Format response
    const document = Array.isArray(queueItem.documents)
      ? queueItem.documents[0]
      : queueItem.documents

    const formattedMatches =
      matches?.map((match) => {
        const transaction = Array.isArray(match.transactions)
          ? match.transactions[0]
          : match.transactions

        return {
          id: match.id,
          transaction_id: match.transaction_id,
          confidence_score: match.confidence_score,
          match_type: match.match_type,
          metadata: match.metadata || {},
          transaction: {
            id: transaction.id,
            description: transaction.description,
            amount: transaction.amount,
            currency: transaction.currency,
            date: transaction.date,
            category: transaction.category,
          },
        }
      }) || []

    return NextResponse.json({
      success: true,
      item: {
        id: queueItem.id,
        document_id: queueItem.document_id,
        priority: queueItem.priority,
        status: queueItem.status,
        created_at: queueItem.created_at,
        document: {
          id: document.id,
          file_name: document.file_name,
          file_type: document.file_type,
          file_size_bytes: document.file_size_bytes,
          file_url: document.file_url,
          created_at: document.created_at,
        },
        extraction: extraction || {
          vendor_name: null,
          amount: null,
          currency: null,
          transaction_date: null,
          extraction_confidence: null,
        },
        matches: formattedMatches,
        metadata: queueItem.metadata || {},
      },
    })
  } catch (error) {
    console.error('Unexpected error in queue item API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue item', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/reconciliation/queue/[id]
 *
 * Update queue item status
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    // Validate status
    const validStatuses = ['pending_review', 'in_progress', 'completed', 'rejected']
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update queue item
    const { data: updatedItem, error: updateError } = await supabase
      .from('reconciliation_queue')
      .update({
        status: body.status,
        ...(body.status === 'in_progress' && { assigned_to: user.id }),
      })
      .eq('id', queueId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update queue item:', updateError)
      return NextResponse.json(
        { error: 'Failed to update queue item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
    })
  } catch (error) {
    console.error('Unexpected error in queue item update API:', error)
    return NextResponse.json(
      { error: 'Failed to update queue item', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
