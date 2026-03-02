import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rankMatches } from '@/lib/matching/match-ranker'
import type { SourceTransaction, TargetTransaction } from '@/lib/matching/match-scorer'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/emails/transactions/[id]/matches
 *
 * Returns match suggestions for an email transaction.
 * Queries candidate transactions within a date window and ranks them.
 *
 * Query Parameters:
 * - dateWindowDays: number (default: 7) - days before/after to search
 *
 * Returns:
 * - email_transaction: the email transaction data
 * - suggestions: ranked match suggestions with scores
 * - stats: match statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid email transaction ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse options
    const { searchParams } = new URL(request.url)
    const dateWindowDays = parseInt(searchParams.get('dateWindowDays') || '7', 10)

    // Fetch the email transaction
    const { data: emailTx, error: fetchError } = await supabase
      .from('email_transactions')
      .select(`
        id, subject, from_address, from_name, email_date,
        vendor_id, vendor_name_raw, amount, currency, transaction_date,
        description, order_id, matched_transaction_id, match_confidence,
        match_method, status, classification, extraction_confidence,
        extraction_notes, processed_at, matched_at,
        vendors:vendor_id (id, name)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !emailTx) {
      return NextResponse.json(
        { error: 'Email transaction not found' },
        { status: 404 }
      )
    }

    // If already matched, return the linked transaction info
    if (emailTx.matched_transaction_id) {
      const { data: linkedTx } = await supabase
        .from('transactions')
        .select(`
          id, description, amount, original_currency, transaction_date,
          vendor_id, vendors:vendor_id (id, name),
          payment_methods:payment_method_id (id, name)
        `)
        .eq('id', emailTx.matched_transaction_id)
        .single()

      return NextResponse.json({
        email_transaction: emailTx,
        linked_transaction: linkedTx || null,
        suggestions: [],
        stats: {
          totalCandidates: 0,
          matchingCandidates: 0,
          highConfidenceCount: 0,
          avgScore: 0,
        },
      })
    }

    // Need amount and date to find candidates
    if (!emailTx.amount || !emailTx.transaction_date) {
      return NextResponse.json({
        email_transaction: emailTx,
        suggestions: [],
        stats: {
          totalCandidates: 0,
          matchingCandidates: 0,
          highConfidenceCount: 0,
          avgScore: 0,
        },
      })
    }

    // Calculate date window
    const txDate = new Date(emailTx.transaction_date)
    const dateFrom = new Date(txDate)
    dateFrom.setDate(dateFrom.getDate() - dateWindowDays)
    const dateTo = new Date(txDate)
    dateTo.setDate(dateTo.getDate() + dateWindowDays)

    // Fetch candidate transactions
    const { data: candidates, error: candError } = await supabase
      .from('transactions')
      .select(`
        id, description, amount, original_currency, transaction_date,
        vendor_id, vendors:vendor_id (id, name),
        payment_methods:payment_method_id (id, name)
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', dateFrom.toISOString().split('T')[0])
      .lte('transaction_date', dateTo.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false })
      .limit(50)

    if (candError) {
      console.error('Error fetching candidates:', candError)
      return NextResponse.json(
        { error: 'Failed to fetch candidate transactions' },
        { status: 500 }
      )
    }

    // Build source transaction
    const vendorName = (emailTx.vendors as { name: string } | null)?.name || emailTx.vendor_name_raw || ''
    const source: SourceTransaction = {
      amount: Number(emailTx.amount),
      currency: emailTx.currency || 'USD',
      date: emailTx.transaction_date,
      vendor: vendorName,
      description: emailTx.description || undefined,
    }

    // Build target transactions
    const targets: TargetTransaction[] = (candidates || []).map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount),
      currency: tx.original_currency,
      date: tx.transaction_date,
      vendor: (tx.vendors as { name: string } | null)?.name || tx.description || '',
      description: tx.description || undefined,
    }))

    // Rank matches
    const ranked = await rankMatches(source, targets)

    // Enrich suggestions with transaction details
    const enrichedSuggestions = ranked.suggestions.map((suggestion) => {
      const candidate = (candidates || []).find((c) => c.id === suggestion.targetId)
      return {
        ...suggestion,
        transaction: candidate || null,
      }
    })

    return NextResponse.json({
      email_transaction: emailTx,
      suggestions: enrichedSuggestions,
      stats: ranked.stats,
      status: ranked.status,
      reason: ranked.reason,
      requiresReview: ranked.requiresReview,
    })
  } catch (error) {
    console.error('Error in matches endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
