import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/imports/reject
 *
 * Rejects a match (marks email transaction as skipped).
 *
 * Request body:
 * - emailId: string - Email transaction ID to reject
 * - reason: string (optional) - Reason for rejection
 *
 * Can also accept an array for batch rejection:
 * - emailIds: string[] - Array of email transaction IDs to reject
 * - reason: string (optional) - Reason for rejection
 *
 * Returns:
 * - 200: Success
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 404: Email transaction not found
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: {
      emailId?: string
      emailIds?: string[]
      reason?: string
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { emailId, emailIds, reason } = body

    // Support both single and batch rejection
    const idsToReject: string[] = emailIds || (emailId ? [emailId] : [])

    // Validate
    if (idsToReject.length === 0) {
      return NextResponse.json(
        { error: 'emailId or emailIds is required' },
        { status: 400 }
      )
    }

    // Validate all IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const invalidIds = idsToReject.filter(id => !uuidRegex.test(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid email ID format', invalidIds },
        { status: 400 }
      )
    }

    // Limit batch size
    if (idsToReject.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 items can be rejected at once' },
        { status: 400 }
      )
    }

    // Validate reason if provided
    if (reason !== undefined && typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'reason must be a string' },
        { status: 400 }
      )
    }

    // Use service role client for updates
    const serviceClient = createServiceRoleClient()

    // Verify email_transactions belong to user
    const { data: emailTransactions, error: fetchError } = await serviceClient
      .from('email_transactions')
      .select('id, user_id, status')
      .in('id', idsToReject)
      .eq('user_id', user.id)

    if (fetchError) {
      console.error('Error fetching email transactions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch email transactions' },
        { status: 500 }
      )
    }

    if (!emailTransactions || emailTransactions.length === 0) {
      return NextResponse.json(
        { error: 'No matching email transactions found' },
        { status: 404 }
      )
    }

    // Filter to only process items that aren't already skipped
    const toProcess = emailTransactions.filter(et => et.status !== 'skipped')

    if (toProcess.length === 0) {
      return NextResponse.json(
        { error: 'All email transactions are already skipped' },
        { status: 400 }
      )
    }

    // Track results
    const results = {
      rejected: 0,
      failed: 0,
      skipped: idsToReject.length - toProcess.length,
      errors: [] as string[],
    }

    // Process each email transaction
    for (const emailTx of toProcess) {
      try {
        // Update status to 'skipped' and store rejection reason in metadata
        const { error: updateError } = await serviceClient
          .from('email_transactions')
          .update({
            status: 'skipped',
            reviewed_at: new Date().toISOString(),
            metadata: reason ? { rejection_reason: reason } : undefined,
          })
          .eq('id', emailTx.id)

        if (updateError) {
          throw new Error(`Failed to update status: ${updateError.message}`)
        }

        results.rejected++
      } catch (error) {
        results.failed++
        results.errors.push(
          `Error rejecting ${emailTx.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Log activity
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'transaction_skipped',
        description: results.rejected === 1
          ? `Rejected email transaction`
          : `Rejected ${results.rejected} email transactions`,
        transactions_affected: results.rejected,
        metadata: {
          emailIds: toProcess.map(et => et.id),
          reason,
          results,
        },
      })

    // Return appropriate response based on single vs batch
    if (!emailIds && emailId) {
      // Single rejection - simpler response
      return NextResponse.json({
        success: results.rejected > 0,
        message: results.rejected > 0 ? 'Email transaction rejected' : 'Failed to reject',
        reason: reason || undefined,
      })
    }

    // Batch rejection - detailed response
    return NextResponse.json({
      success: true,
      results: {
        rejected: results.rejected,
        failed: results.failed,
        already_skipped: results.skipped,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    })

  } catch (error) {
    console.error('Import reject API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
