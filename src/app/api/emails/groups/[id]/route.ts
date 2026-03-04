import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/emails/groups/[id]
 *
 * Returns group details and all emails in the group.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid group ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch group
    const { data: group, error: groupError } = await supabase
      .from('email_groups')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Email group not found' },
        { status: 404 }
      )
    }

    // Fetch all emails in the group
    const { data: emails, error: emailsError } = await supabase
      .from('email_transactions')
      .select(`
        id, message_id, subject, from_address, from_name,
        email_date, amount, currency, transaction_date,
        vendor_name_raw, description, order_id,
        status, classification, ai_classification,
        ai_suggested_skip, ai_reasoning, parser_key,
        is_group_primary, extraction_confidence,
        matched_transaction_id, match_confidence
      `)
      .eq('email_group_id', id)
      .eq('user_id', user.id)
      .order('email_date', { ascending: true })

    if (emailsError) {
      return NextResponse.json(
        { error: 'Failed to fetch group emails' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      group,
      emails: emails || [],
    })
  } catch (error) {
    console.error('Error in email groups endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
