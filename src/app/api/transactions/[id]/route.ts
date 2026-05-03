import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/transactions/[id]
 *
 * Returns a single transaction with vendor, payment method, and tags.
 * Used by the linked-transaction peek modal in the Email Hub and similar
 * lightweight previews. Heavier flows (full transaction page) load their
 * own data via existing hooks.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        description,
        amount,
        original_currency,
        transaction_type,
        transaction_date,
        reference_amount,
        reference_currency,
        vendor_id,
        payment_method_id,
        source_email_transaction_id,
        source_statement_upload_id,
        source_payment_slip_id,
        created_at,
        vendors:vendor_id (id, name),
        payment_methods:payment_method_id (id, name, card_last_four),
        transaction_tags!transaction_tags_transaction_id_fkey (
          tag_id,
          tags!transaction_tags_tag_id_fkey (id, name, color)
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tags = ((data as any).transaction_tags || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((tt: any) => tt.tags)
      .filter(Boolean)

    return NextResponse.json({
      transaction: {
        id: data.id,
        description: data.description,
        amount: data.amount == null ? null : Number(data.amount),
        original_currency: data.original_currency,
        transaction_type: data.transaction_type,
        transaction_date: data.transaction_date,
        reference_amount: data.reference_amount == null ? null : Number(data.reference_amount),
        reference_currency: data.reference_currency,
        vendor: data.vendors as { id: string; name: string } | null,
        payment_method: data.payment_methods as { id: string; name: string; card_last_four: string | null } | null,
        tags,
        source_email_transaction_id: data.source_email_transaction_id,
        source_statement_upload_id: data.source_statement_upload_id,
        source_payment_slip_id: data.source_payment_slip_id,
        created_at: data.created_at,
      },
    })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
