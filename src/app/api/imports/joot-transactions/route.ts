import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/imports/joot-transactions
 *
 * Returns Joot transactions filtered by payment method and date range,
 * with "on statement" status when a statementId is provided.
 *
 * Query params:
 * - paymentMethodId (required): UUID of payment method
 * - periodStart (required): YYYY-MM-DD
 * - periodEnd (required): YYYY-MM-DD
 * - statementId (optional): UUID — marks each Joot txn as onStatement true/false
 * - page (optional): page number (default 1)
 * - limit (optional): items per page (default 50, max 100)
 * - search (optional): search term
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const paymentMethodId = searchParams.get('paymentMethodId')
    const periodStart = searchParams.get('periodStart')
    const periodEnd = searchParams.get('periodEnd')
    const statementId = searchParams.get('statementId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const search = searchParams.get('search')?.toLowerCase() || ''

    if (!paymentMethodId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'paymentMethodId, periodStart, and periodEnd are required' },
        { status: 400 }
      )
    }

    // Fetch transactions for this payment method and date range
    let query = supabase
      .from('transactions')
      .select(`
        id,
        transaction_date,
        amount,
        original_currency,
        description,
        transaction_type,
        vendors (name),
        payment_methods (name)
      `)
      .eq('user_id', user.id)
      .eq('payment_method_id', paymentMethodId)
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd)
      .order('transaction_date', { ascending: false })

    if (search) {
      query = query.or(`description.ilike.%${search}%,vendors.name.ilike.%${search}%`)
    }

    const { data: transactions, error: txError } = await query

    if (txError) {
      console.error('Error fetching joot transactions:', txError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // If statementId provided, determine which Joot txns are "on statement"
    let matchedTransactionIds = new Set<string>()
    if (statementId) {
      const { data: statement } = await supabase
        .from('statement_uploads')
        .select('extraction_log')
        .eq('id', statementId)
        .eq('user_id', user.id)
        .single()

      if (statement?.extraction_log) {
        const log = statement.extraction_log as {
          suggestions?: Array<{ matched_transaction_id?: string }>
        }
        if (log.suggestions) {
          for (const s of log.suggestions) {
            if (s.matched_transaction_id) {
              matchedTransactionIds.add(s.matched_transaction_id)
            }
          }
        }
      }
    }

    // Map transactions
    const items = (transactions || []).map(tx => {
      const vendors = tx.vendors as { name: string } | null
      const paymentMethods = tx.payment_methods as { name: string } | null

      return {
        id: tx.id,
        date: tx.transaction_date,
        vendor: vendors?.name || null,
        paymentMethod: paymentMethods?.name || null,
        amount: tx.amount,
        currency: tx.original_currency,
        description: tx.description,
        type: tx.transaction_type,
        onStatement: statementId ? matchedTransactionIds.has(tx.id) : undefined,
      }
    })

    // Paginate
    const total = items.length
    const offset = (page - 1) * limit
    const paginatedItems = items.slice(offset, offset + limit)

    // Counts
    const onStatementCount = items.filter(i => i.onStatement === true).length
    const notOnStatementCount = items.filter(i => i.onStatement === false).length

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total,
      },
      summary: {
        total,
        onStatement: onStatementCount,
        notOnStatement: notOnStatementCount,
      },
    })
  } catch (error) {
    console.error('Joot transactions API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
