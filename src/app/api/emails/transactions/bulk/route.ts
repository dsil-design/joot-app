import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { recordFeedback } from '@/lib/email/ai-feedback-service'
import { AI_FEEDBACK_TYPE } from '@/lib/types/email-imports'
import type { AiFeedbackType } from '@/lib/types/email-imports'

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

    const serviceClient = createServiceRoleClient()
    const newStatus = action === 'skip' ? 'skipped' : 'pending_review'

    // IDs come from the email_hub_unified view where id = emails.id.
    // We need to resolve these to email_transactions rows. Use the
    // unified view itself to map emails.id → email_transaction_id.
    const { data: viewRows, error: viewError } = await serviceClient
      .from('email_hub_unified')
      .select('id, email_transaction_id, status, ai_classification, ai_suggested_skip, subject, from_address, message_id, uid, folder, email_date, seen, has_attachments, synced_at')
      .eq('user_id', user.id)
      .in('id', ids)

    if (viewError) {
      console.error('Error fetching from unified view:', viewError)
      return NextResponse.json(
        { error: 'Failed to verify emails' },
        { status: 500 }
      )
    }

    // Check all IDs were found
    const foundIds = new Set((viewRows || []).map((r) => r.id))
    const missingIds = ids.filter((id) => !foundIds.has(id))
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Some emails not found: ${missingIds.slice(0, 3).join(', ')}...` },
        { status: 404 }
      )
    }

    // Reject any imported rows
    const importedRows = (viewRows || []).filter((r) => r.status === 'imported')
    if (importedRows.length > 0) {
      return NextResponse.json(
        { error: `Cannot modify imported transactions. ${importedRows.length} item(s) are already imported.` },
        { status: 400 }
      )
    }

    // Split into rows that have email_transactions and those that don't
    const withTx = (viewRows || []).filter((r) => r.email_transaction_id)
    const withoutTx = (viewRows || []).filter((r) => !r.email_transaction_id)

    let updatedCount = 0

    // Update existing email_transactions rows
    if (withTx.length > 0) {
      const txIds = withTx.map((r) => r.email_transaction_id as string)
      const { error: updateError, count } = await serviceClient
        .from('email_transactions')
        .update({ status: newStatus })
        .eq('user_id', user.id)
        .in('id', txIds)
        .not('status', 'eq', 'imported')

      if (updateError) {
        console.error('Error in bulk update:', updateError)
        return NextResponse.json(
          { error: 'Failed to update email transactions' },
          { status: 500 }
        )
      }
      updatedCount += count || txIds.length
    }

    // For unprocessed emails (no email_transactions row), create rows
    // with the target status. Only meaningful for 'skip' — mark_pending
    // on unprocessed rows is a no-op since they're already not processed.
    if (withoutTx.length > 0 && action === 'skip') {
      const inserts = withoutTx.map((r) => ({
        user_id: user.id,
        message_id: r.message_id!,
        uid: r.uid!,
        folder: r.folder || 'INBOX',
        subject: r.subject,
        from_address: r.from_address,
        email_date: r.email_date || new Date().toISOString(),
        seen: r.seen ?? false,
        has_attachments: r.has_attachments ?? false,
        status: 'skipped' as const,
        synced_at: r.synced_at || new Date().toISOString(),
        processed_at: new Date().toISOString(),
      }))

      const { error: insertError, count: insertCount } = await serviceClient
        .from('email_transactions')
        .insert(inserts)

      if (insertError) {
        console.error('Error creating skipped email transactions:', insertError)
        // Continue — some may have been updated already
      } else {
        updatedCount += insertCount || inserts.length
      }
    }

    // Log activity
    const activityType = action === 'skip' ? 'transaction_skipped' : 'transaction_matched'
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: activityType,
        description: `Bulk ${action}: ${ids.length} email(s)`,
        transactions_affected: ids.length,
        metadata: { action, ids },
      })

    // Record feedback for bulk-skip when AI didn't suggest skipping
    if (action === 'skip') {
      for (const row of withTx) {
        if (!row.ai_suggested_skip) {
          await recordFeedback({
            userId: user.id,
            emailTransactionId: row.email_transaction_id!,
            feedbackType: AI_FEEDBACK_TYPE.SKIP_OVERRIDE as AiFeedbackType,
            originalAiClassification: row.ai_classification,
            originalAiSuggestedSkip: row.ai_suggested_skip,
            correctedSkip: true,
            emailSubject: row.subject,
            emailFrom: row.from_address,
          }, serviceClient)
        }
      }
    }

    // Return email_transaction IDs for client-side feedback
    const emailTransactionIds = withTx
      .map((r) => r.email_transaction_id as string)
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      emailTransactionIds,
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
