/**
 * Reconciliation Audit Log API Endpoint
 *
 * GET /api/reconciliation/audit
 *
 * Fetches audit log entries for reconciliation actions
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reconciliation/audit
 *
 * Fetch audit log entries
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
    const actionFilter = searchParams.get('action') // 'approved', 'rejected', or null for all
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('reconciliation_audit_log')
      .select(
        `
        id,
        queue_item_id,
        document_id,
        transaction_id,
        action,
        performed_by,
        created_at,
        metadata,
        documents!inner (
          file_name,
          user_id
        ),
        users!reconciliation_audit_log_performed_by_fkey (
          email
        ),
        transactions (
          description,
          amount,
          currency
        )
      `
      )
      .eq('documents.user_id', user.id) // Only user's documents

    // Apply action filter if provided
    if (actionFilter) {
      query = query.eq('action', actionFilter)
    }

    // Order by created_at (newest first) and limit
    query = query.order('created_at', { ascending: false }).limit(limit)

    const { data: auditEntries, error: auditError } = await query

    if (auditError) {
      console.error('Failed to fetch audit log:', auditError)
      return NextResponse.json(
        { error: 'Failed to fetch audit log' },
        { status: 500 }
      )
    }

    // Format response
    const formattedEntries = auditEntries?.map((entry) => {
      const document = Array.isArray(entry.documents)
        ? entry.documents[0]
        : entry.documents
      const performedByUser = Array.isArray(entry.users)
        ? entry.users[0]
        : entry.users
      const transaction = entry.transactions
        ? Array.isArray(entry.transactions)
          ? entry.transactions[0]
          : entry.transactions
        : null

      return {
        id: entry.id,
        queue_item_id: entry.queue_item_id,
        document_id: entry.document_id,
        transaction_id: entry.transaction_id,
        action: entry.action,
        performed_by: entry.performed_by,
        created_at: entry.created_at,
        metadata: entry.metadata || {},
        document: {
          file_name: document.file_name,
        },
        user: {
          email: performedByUser?.email || 'Unknown',
        },
        transaction: transaction
          ? {
              description: transaction.description,
              amount: transaction.amount,
              currency: transaction.currency,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      entries: formattedEntries || [],
    })
  } catch (error) {
    console.error('Unexpected error in audit log API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit log', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
