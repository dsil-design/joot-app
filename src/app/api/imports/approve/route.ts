import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/imports/approve
 *
 * Approves matches and optionally creates transactions from them.
 *
 * Request body:
 * - emailIds: string[] - Array of email_transaction IDs to approve
 * - createTransactions: boolean - Whether to create transaction records
 *
 * Returns:
 * - 200: Success with counts
 * - 400: Invalid request
 * - 401: Unauthorized
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
      emailIds?: string[]
      createTransactions?: boolean
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { emailIds, createTransactions = false } = body

    // Validate emailIds
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'emailIds is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate all IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const invalidIds = emailIds.filter(id => !uuidRegex.test(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid email ID format', invalidIds },
        { status: 400 }
      )
    }

    // Limit batch size
    if (emailIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 items can be approved at once' },
        { status: 400 }
      )
    }

    // Use service role client for batch operations
    const serviceClient = createServiceRoleClient()

    // Verify all email_transactions belong to user and are in pending status
    const { data: emailTransactions, error: fetchError } = await serviceClient
      .from('email_transactions')
      .select('id, user_id, status, email_data, extracted_data')
      .in('id', emailIds)
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

    // Filter to only process pending items
    const pendingTransactions = emailTransactions.filter(
      et => et.status === 'pending' || et.status === 'extracted'
    )

    if (pendingTransactions.length === 0) {
      return NextResponse.json(
        { error: 'No pending email transactions to approve' },
        { status: 400 }
      )
    }

    // Track results
    const results = {
      success: 0,
      failed: 0,
      skipped: emailIds.length - pendingTransactions.length,
      totalAmount: 0,
      transactionsCreated: 0,
      errors: [] as string[],
    }

    // Process each email transaction
    for (const emailTx of pendingTransactions) {
      try {
        // Update status to 'imported'
        const { error: updateError } = await serviceClient
          .from('email_transactions')
          .update({
            status: 'imported',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', emailTx.id)

        if (updateError) {
          throw new Error(`Failed to update status: ${updateError.message}`)
        }

        // Create transaction if requested
        if (createTransactions) {
          const extractedData = emailTx.extracted_data as {
            amount?: number
            currency?: string
            date?: string
            vendor_name?: string
            description?: string
          } | null

          if (extractedData?.amount && extractedData?.date) {
            const { error: insertError } = await serviceClient
              .from('transactions')
              .insert({
                user_id: user.id,
                amount: extractedData.amount,
                currency: extractedData.currency || 'USD',
                date: extractedData.date,
                notes: extractedData.description || `Imported from email`,
                created_at: new Date().toISOString(),
              })

            if (insertError) {
              results.errors.push(`Failed to create transaction for ${emailTx.id}: ${insertError.message}`)
            } else {
              results.transactionsCreated++
              results.totalAmount += Math.abs(extractedData.amount)
            }
          }
        }

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(
          `Error processing ${emailTx.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Log activity
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'batch_import',
        description: `Approved ${results.success} email transactions`,
        transactions_affected: results.success,
        total_amount: results.totalAmount > 0 ? results.totalAmount : null,
        metadata: {
          emailIds: pendingTransactions.map(et => et.id),
          createTransactions,
          results,
        },
      })

    return NextResponse.json({
      success: true,
      results: {
        approved: results.success,
        failed: results.failed,
        skipped: results.skipped,
        transactions_created: results.transactionsCreated,
        total_amount: results.totalAmount,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    })

  } catch (error) {
    console.error('Import approve API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
