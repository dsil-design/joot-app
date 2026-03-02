import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/emails/transactions/[id]/skip
 *
 * Marks an email transaction as skipped (non-transaction).
 * Cannot skip items that are already imported.
 *
 * Returns:
 * - { success: true, id, status: 'skipped' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid email transaction ID format' },
        { status: 400 }
      )
    }

    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the email transaction
    const { data: emailTx, error: fetchError } = await supabase
      .from('email_transactions')
      .select('id, status, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !emailTx) {
      return NextResponse.json(
        { error: 'Email transaction not found' },
        { status: 404 }
      )
    }

    // Cannot skip imported items
    if (emailTx.status === 'imported') {
      return NextResponse.json(
        { error: 'Cannot skip an already imported transaction' },
        { status: 400 }
      )
    }

    // Update status
    const serviceClient = createServiceRoleClient()
    const { error: updateError } = await serviceClient
      .from('email_transactions')
      .update({ status: 'skipped' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error skipping email transaction:', updateError)
      return NextResponse.json(
        { error: 'Failed to skip email transaction' },
        { status: 500 }
      )
    }

    // Log activity
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'transaction_skipped',
        email_transaction_id: id,
        description: 'Email transaction marked as skipped',
        transactions_affected: 1,
      })

    return NextResponse.json({
      success: true,
      id,
      status: 'skipped',
    })
  } catch (error) {
    console.error('Error in skip endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
