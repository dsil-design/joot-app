/**
 * Reconciliation Queue API Endpoint
 *
 * GET /api/reconciliation/queue
 *
 * Fetches documents awaiting manual review from the reconciliation queue
 * - Joins with documents and document_extractions tables
 * - Filters by status and priority
 * - Returns formatted queue items
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface QueueItemResponse {
  id: string
  document_id: string
  priority: 'low' | 'normal' | 'high'
  status: 'pending_review' | 'in_progress' | 'completed' | 'rejected'
  created_at: string
  document: {
    id: string
    file_name: string
    file_type: string
    file_size_bytes: number
    created_at: string
  }
  extraction: {
    vendor_name: string | null
    amount: number | null
    currency: string | null
    transaction_date: string | null
  }
  metadata: {
    match_count?: number
    best_match_confidence?: number
  }
}

/**
 * GET /api/reconciliation/queue
 *
 * Fetch reconciliation queue items
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'pending_review', 'in_progress', or null for all

    // Build query
    let query = supabase
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
          created_at,
          user_id
        )
      `
      )
      .eq('documents.user_id', user.id) // Only user's documents

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    } else {
      // Default: show pending_review and in_progress only
      query = query.in('status', ['pending_review', 'in_progress'])
    }

    // Order by priority (high first) then by created_at (newest first)
    query = query.order('priority', { ascending: false }) // high > normal > low
    query = query.order('created_at', { ascending: false })

    const { data: queueItems, error: queueError } = await query

    if (queueError) {
      console.error('Failed to fetch reconciliation queue:', queueError)
      return NextResponse.json(
        { error: 'Failed to fetch queue' },
        { status: 500 }
      )
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
      })
    }

    // Get document IDs to fetch extractions
    const documentIds = queueItems.map((item) => item.document_id)

    // Fetch extractions for all documents
    const { data: extractions, error: extractionError } = await supabase
      .from('document_extractions')
      .select(
        `
        document_id,
        vendor_name,
        amount,
        currency,
        transaction_date
      `
      )
      .in('document_id', documentIds)

    if (extractionError) {
      console.error('Failed to fetch extractions:', extractionError)
      // Continue without extractions rather than failing
    }

    // Create extraction map for quick lookup
    const extractionMap = new Map(
      extractions?.map((ext) => [ext.document_id, ext]) || []
    )

    // Format response
    const formattedItems: QueueItemResponse[] = queueItems.map((item) => {
      const document = Array.isArray(item.documents)
        ? item.documents[0]
        : item.documents
      const extraction = extractionMap.get(item.document_id)

      return {
        id: item.id,
        document_id: item.document_id,
        priority: item.priority,
        status: item.status,
        created_at: item.created_at,
        document: {
          id: document.id,
          file_name: document.file_name,
          file_type: document.file_type,
          file_size_bytes: document.file_size_bytes,
          created_at: document.created_at,
        },
        extraction: {
          vendor_name: extraction?.vendor_name || null,
          amount: extraction?.amount || null,
          currency: extraction?.currency || null,
          transaction_date: extraction?.transaction_date || null,
        },
        metadata: item.metadata || {},
      }
    })

    return NextResponse.json({
      success: true,
      items: formattedItems,
    })
  } catch (error) {
    console.error('Unexpected error in reconciliation queue API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
