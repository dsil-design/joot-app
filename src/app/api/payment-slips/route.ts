import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/payment-slips
 *
 * Lists payment slip uploads for the authenticated user with pagination and filtering.
 *
 * Query params:
 *   page (number, default 1) - Page number (1-based)
 *   limit (number, default 20) - Items per page
 *   search (string) - Search sender, recipient, memo, or amount
 *   direction (string) - Filter by detected_direction (income/expense)
 *   status (string) - Filter by processing status
 *   reviewStatus (string) - Filter by review_status
 *   bank (string) - Filter by bank_detected
 *   confidence (string) - Filter by confidence level (high/medium/low)
 *   dateFrom (string) - Filter transaction_date >= dateFrom
 *   dateTo (string) - Filter transaction_date <= dateTo
 *   sortField (string) - Sort field (uploaded_at, transaction_date, amount, confidence)
 *   sortOrder (string) - Sort order (asc/desc)
 *   fields (string) - If "ids", return only matching IDs
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search') || ''
    const direction = searchParams.get('direction') || ''
    const status = searchParams.get('status') || ''
    const reviewStatus = searchParams.get('reviewStatus') || ''
    const bank = searchParams.get('bank') || ''
    const confidence = searchParams.get('confidence') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const sortField = searchParams.get('sortField') || 'uploaded_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const fields = searchParams.get('fields') || ''

    // If requesting just IDs, return all matching IDs without pagination
    if (fields === 'ids') {
      let query = supabase
        .from('payment_slip_uploads')
        .select('id')
        .eq('user_id', user.id)

      query = applyFilters(query, { search, direction, status, reviewStatus, bank, confidence, dateFrom, dateTo })

      const { data, error } = await query
      if (error) {
        console.error('Failed to fetch payment slip IDs:', error)
        return NextResponse.json({ error: 'Failed to fetch payment slip IDs' }, { status: 500 })
      }
      return NextResponse.json({ ids: (data || []).map(r => r.id) })
    }

    // Count total matching records
    let countQuery = supabase
      .from('payment_slip_uploads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    countQuery = applyFilters(countQuery, { search, direction, status, reviewStatus, bank, confidence, dateFrom, dateTo })

    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('Failed to count payment slips:', countError)
      return NextResponse.json({ error: 'Failed to count payment slips' }, { status: 500 })
    }

    const total = count || 0
    const offset = (page - 1) * limit

    // Fetch page of data
    const validSortFields = ['uploaded_at', 'transaction_date', 'amount', 'extraction_confidence']
    const dbSortField = sortField === 'confidence' ? 'extraction_confidence' : sortField
    const actualSortField = validSortFields.includes(dbSortField) ? dbSortField : 'uploaded_at'

    let dataQuery = supabase
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
      .order(actualSortField, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    dataQuery = applyFilters(dataQuery, { search, direction, status, reviewStatus, bank, confidence, dateFrom, dateTo })

    const { data: slips, error: fetchError } = await dataQuery

    if (fetchError) {
      console.error('Failed to fetch payment slips:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch payment slips' }, { status: 500 })
    }

    return NextResponse.json({
      slips: slips || [],
      hasMore: offset + limit < total,
      total,
    })
  } catch (error) {
    console.error('Payment slips list API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

interface FilterParams {
  search: string
  direction: string
  status: string
  reviewStatus: string
  bank: string
  confidence: string
  dateFrom: string
  dateTo: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: FilterParams) {
  if (filters.search) {
    query = query.or(
      `sender_name.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%,memo.ilike.%${filters.search}%`
    )
  }

  if (filters.direction) {
    query = query.eq('detected_direction', filters.direction)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.reviewStatus) {
    query = query.eq('review_status', filters.reviewStatus)
  }

  if (filters.bank) {
    query = query.eq('bank_detected', filters.bank)
  }

  if (filters.confidence) {
    if (filters.confidence === 'high') {
      query = query.gte('extraction_confidence', 90)
    } else if (filters.confidence === 'medium') {
      query = query.gte('extraction_confidence', 55).lt('extraction_confidence', 90)
    } else if (filters.confidence === 'low') {
      query = query.lt('extraction_confidence', 55)
    }
  }

  if (filters.dateFrom) {
    query = query.gte('transaction_date', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('transaction_date', filters.dateTo)
  }

  return query
}
