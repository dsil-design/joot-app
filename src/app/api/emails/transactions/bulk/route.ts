import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/emails/transactions/bulk
 *
 * Performs bulk actions on email transactions.
 *
 * Request body:
 * - action: 'skip' | 'mark_pending' (required)
 * - ids: string[] (required, max 50)
 *
 * Returns:
 * - { success: true, updated: number, action: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    let body: { action?: string; ids?: string[] }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action, ids } = body

    // Validate action
    const validActions = ['skip', 'mark_pending']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate ids
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      )
    }
    if (ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 items per bulk operation' },
        { status: 400 }
      )
    }
    if (!ids.every((id) => UUID_REGEX.test(id))) {
      return NextResponse.json(
        { error: 'All ids must be valid UUIDs' },
        { status: 400 }
      )
    }

    // Verify all IDs belong to user and none are imported
    const { data: emailTxs, error: fetchError } = await supabase
      .from('email_transactions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('id', ids)

    if (fetchError) {
      console.error('Error fetching email transactions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to verify email transactions' },
        { status: 500 }
      )
    }

    // Check all IDs were found (belong to user)
    const foundIds = new Set((emailTxs || []).map((t) => t.id))
    const missingIds = ids.filter((id) => !foundIds.has(id))
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Some email transactions not found: ${missingIds.slice(0, 3).join(', ')}...` },
        { status: 404 }
      )
    }

    // Reject any imported rows
    const importedIds = (emailTxs || []).filter((t) => t.status === 'imported').map((t) => t.id)
    if (importedIds.length > 0) {
      return NextResponse.json(
        { error: `Cannot modify imported transactions. ${importedIds.length} item(s) are already imported.` },
        { status: 400 }
      )
    }

    // Determine new status
    const newStatus = action === 'skip' ? 'skipped' : 'pending_review'

    // Batch update
    const serviceClient = createServiceRoleClient()
    const { error: updateError, count } = await serviceClient
      .from('email_transactions')
      .update({ status: newStatus })
      .eq('user_id', user.id)
      .in('id', ids)
      .not('status', 'eq', 'imported')

    if (updateError) {
      console.error('Error in bulk update:', updateError)
      return NextResponse.json(
        { error: 'Failed to update email transactions' },
        { status: 500 }
      )
    }

    // Log activity
    const activityType = action === 'skip' ? 'transaction_skipped' : 'email_extracted'
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: activityType,
        description: `Bulk ${action}: ${ids.length} email transaction(s)`,
        transactions_affected: ids.length,
        metadata: { action, ids },
      })

    return NextResponse.json({
      success: true,
      updated: count || ids.length,
      action,
    })
  } catch (error) {
    console.error('Error in bulk endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
