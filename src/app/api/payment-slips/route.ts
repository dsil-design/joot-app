import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/payment-slips
 *
 * Lists all payment slip uploads for the authenticated user.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: slips, error: fetchError } = await supabase
      .from('payment_slip_uploads')
      .select(`
        id, filename, file_path, file_type, status, review_status,
        transaction_date, amount, currency, sender_name, recipient_name,
        bank_detected, memo, detected_direction,
        extraction_confidence, extraction_error, extraction_started_at,
        matched_transaction_id, match_confidence,
        uploaded_at, created_at
      `)
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch payment slips:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch payment slips' }, { status: 500 })
    }

    return NextResponse.json({ slips: slips || [] })
  } catch (error) {
    console.error('Payment slips list API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
