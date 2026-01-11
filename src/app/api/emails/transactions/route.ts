import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/emails/transactions
 *
 * Retrieves email transactions (parsed from synced emails) for the authenticated user.
 * Supports filtering by status, currency, date range, and search text.
 *
 * Query Parameters:
 * - status: Filter by status ('pending_review', 'matched', 'waiting_for_statement',
 *           'ready_to_import', 'imported', 'skipped')
 * - currency: Filter by currency code (e.g., 'USD', 'THB')
 * - dateFrom: Filter by transaction date >= value (ISO date string)
 * - dateTo: Filter by transaction date <= value (ISO date string)
 * - search: Search in subject, description, and vendor name
 * - limit: Number of records to return (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 *
 * Returns:
 * - emails: Array of email transaction records
 * - total: Total count of matching records
 * - limit: Applied limit
 * - offset: Applied offset
 * - hasMore: Whether there are more records
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const currency = searchParams.get('currency');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate status if provided
    const validStatuses = [
      'pending_review',
      'matched',
      'waiting_for_statement',
      'ready_to_import',
      'imported',
      'skipped',
    ];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate dates if provided
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      return NextResponse.json(
        { error: 'Invalid dateFrom format. Use ISO date string.' },
        { status: 400 }
      );
    }
    if (dateTo && isNaN(Date.parse(dateTo))) {
      return NextResponse.json(
        { error: 'Invalid dateTo format. Use ISO date string.' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('email_transactions')
      .select(`
        id,
        message_id,
        uid,
        folder,
        subject,
        from_address,
        from_name,
        email_date,
        seen,
        has_attachments,
        vendor_id,
        vendor_name_raw,
        amount,
        currency,
        transaction_date,
        description,
        order_id,
        matched_transaction_id,
        match_confidence,
        match_method,
        status,
        classification,
        extraction_confidence,
        extraction_notes,
        synced_at,
        processed_at,
        matched_at,
        created_at,
        updated_at,
        vendors:vendor_id (
          id,
          name,
          category
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('email_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply currency filter
    if (currency) {
      query = query.eq('currency', currency.toUpperCase());
    }

    // Apply date range filters (on transaction_date)
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }

    // Apply search filter
    if (search) {
      // Search in subject, description, vendor_name_raw, and order_id
      query = query.or(
        `subject.ilike.%${search}%,description.ilike.%${search}%,vendor_name_raw.ilike.%${search}%,order_id.ilike.%${search}%`
      );
    }

    const { data: emails, error, count } = await query;

    if (error) {
      console.error('Error fetching email transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch email transactions' },
        { status: 500 }
      );
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      emails: emails || [],
      total,
      limit,
      offset,
      hasMore,
    });

  } catch (error) {
    console.error('Error in email transactions API:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
