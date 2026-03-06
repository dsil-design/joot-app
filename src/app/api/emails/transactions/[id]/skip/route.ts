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

    const serviceClient = createServiceRoleClient()

    // The id may be an emails.id (from the unified view) or an
    // email_transactions.id. Try email_transactions first, then
    // fall back to looking up via the emails table.
    let emailTxId: string | null = null

    // Try direct lookup in email_transactions
    const { data: directTx } = await supabase
      .from('email_transactions')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (directTx) {
      if (directTx.status === 'imported') {
        return NextResponse.json(
          { error: 'Cannot skip an already imported transaction' },
          { status: 400 }
        )
      }
      emailTxId = directTx.id
    } else {
      // Look up the email by emails.id, then find/create email_transactions row
      const { data: email } = await serviceClient
        .from('emails')
        .select('id, message_id, user_id, subject, from_address, from_name, date, uid, folder, seen, has_attachments, synced_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!email) {
        return NextResponse.json(
          { error: 'Email not found' },
          { status: 404 }
        )
      }

      // Check if an email_transactions row exists for this message_id
      const { data: existingTx } = await serviceClient
        .from('email_transactions')
        .select('id, status')
        .eq('message_id', email.message_id)
        .eq('user_id', user.id)
        .single()

      if (existingTx) {
        if (existingTx.status === 'imported') {
          return NextResponse.json(
            { error: 'Cannot skip an already imported transaction' },
            { status: 400 }
          )
        }
        emailTxId = existingTx.id
      } else {
        // No email_transactions row — create one with status 'skipped'
        const { data: newRow, error: insertError } = await serviceClient
          .from('email_transactions')
          .insert({
            user_id: user.id,
            message_id: email.message_id,
            uid: email.uid,
            folder: email.folder,
            subject: email.subject,
            from_address: email.from_address,
            from_name: email.from_name,
            email_date: email.date || new Date().toISOString(),
            seen: email.seen ?? false,
            has_attachments: email.has_attachments ?? false,
            status: 'skipped',
            synced_at: email.synced_at || new Date().toISOString(),
            processed_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (insertError || !newRow) {
          console.error('Error creating skipped email transaction:', insertError)
          return NextResponse.json(
            { error: 'Failed to skip email' },
            { status: 500 }
          )
        }
        emailTxId = newRow.id
      }
    }

    // Update status (may already be 'skipped' if just created)
    const { error: updateError } = await serviceClient
      .from('email_transactions')
      .update({ status: 'skipped' })
      .eq('id', emailTxId)
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
        email_transaction_id: emailTxId,
        description: 'Email transaction marked as skipped',
        transactions_affected: 1,
      })

    return NextResponse.json({
      success: true,
      id,
      emailTransactionId: emailTxId,
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
