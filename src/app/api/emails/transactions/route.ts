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
 * - dateFrom: Filter by effective date >= value (transaction_date if extracted, else email_date)
 * - dateTo: Filter by effective date <= value (transaction_date if extracted, else email_date)
 * - search: Search in subject, description, and vendor name
 * - classification: Filter by classification ('receipt', 'order_confirmation', 'bank_transfer', 'bill_payment', 'unknown')
 * - confidence: Filter by confidence bucket ('high' >= 90, 'medium' 55-89, 'low' < 55)
 * - sort: Sort order ('email_date_desc' default, 'email_date_asc', 'amount_desc', 'confidence_desc')
 * - limit: Number of records to return (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - page: Page number (1-based, alternative to offset: offset = (page - 1) * limit)
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
    const classification = searchParams.get('classification');
    const confidence = searchParams.get('confidence');
    const sort = searchParams.get('sort') || 'email_date_desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const page = searchParams.get('page');
    const offset = page
      ? (Math.max(1, parseInt(page, 10)) - 1) * limit
      : parseInt(searchParams.get('offset') || '0', 10);

    // Validate status if provided
    const validStatuses = [
      'unprocessed',
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

    // Validate classification if provided
    const validClassifications = ['receipt', 'order_confirmation', 'bank_transfer', 'bill_payment', 'unknown'];
    if (classification && !validClassifications.includes(classification)) {
      return NextResponse.json(
        { error: `Invalid classification. Must be one of: ${validClassifications.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate confidence if provided
    const validConfidences = ['high', 'medium', 'low'];
    if (confidence && !validConfidences.includes(confidence)) {
      return NextResponse.json(
        { error: `Invalid confidence. Must be one of: ${validConfidences.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate sort if provided
    const validSorts = ['email_date_desc', 'email_date_asc', 'amount_desc', 'confidence_desc'];
    if (!validSorts.includes(sort)) {
      return NextResponse.json(
        { error: `Invalid sort. Must be one of: ${validSorts.join(', ')}` },
        { status: 400 }
      );
    }

    // Determine sort order
    let orderColumn = 'email_date';
    let orderAscending = false;
    switch (sort) {
      case 'email_date_asc':
        orderColumn = 'email_date';
        orderAscending = true;
        break;
      case 'amount_desc':
        orderColumn = 'amount';
        orderAscending = false;
        break;
      case 'confidence_desc':
        orderColumn = 'extraction_confidence';
        orderAscending = false;
        break;
      case 'email_date_desc':
      default:
        orderColumn = 'email_date';
        orderAscending = false;
        break;
    }

    // Build query (uses email_hub_unified view which LEFT JOINs emails + email_transactions)
    let query = supabase
      .from('email_hub_unified')
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
        is_processed,
        email_transaction_id,
        effective_date
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order(orderColumn, { ascending: orderAscending, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply currency filter
    if (currency) {
      query = query.eq('currency', currency.toUpperCase());
    }

    // Apply date range filters (on effective_date: transaction_date if extracted, else email_date)
    if (dateFrom) {
      query = query.gte('effective_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('effective_date', dateTo);
    }

    // Apply classification filter
    if (classification) {
      query = query.eq('classification', classification);
    }

    // Apply confidence filter
    if (confidence) {
      switch (confidence) {
        case 'high':
          query = query.gte('extraction_confidence', 90);
          break;
        case 'medium':
          query = query.gte('extraction_confidence', 55).lt('extraction_confidence', 90);
          break;
        case 'low':
          query = query.gt('extraction_confidence', 0).lt('extraction_confidence', 55);
          break;
      }
    }

    // Apply search filter
    if (search) {
      // Search in subject, description, vendor_name_raw, order_id, from_address, and from_name
      query = query.or(
        `subject.ilike.%${search}%,description.ilike.%${search}%,vendor_name_raw.ilike.%${search}%,order_id.ilike.%${search}%,from_address.ilike.%${search}%,from_name.ilike.%${search}%`
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
