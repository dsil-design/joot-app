import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/sources/search
 *
 * Unified lookup across the three source types (email, payment_slip, statement).
 * Used by the "Attach a source" dialog on the Review Queue and transaction detail pages.
 *
 * Query params:
 *   type            - 'email' | 'payment_slip' | 'statement' (required)
 *   q               - free-text search string (optional)
 *   includeMatched  - 'true' to include sources already linked to a transaction (default: false)
 *   limit           - default 25
 */

export interface SourceSearchResult {
  /** Composite import id (`email:<uuid>`, `slip:<uuid>`, `stmt:<uuid>:<index>`) */
  compositeId: string
  type: 'email' | 'payment_slip' | 'statement'
  /** Underlying row id (email_transactions.id, payment_slip_uploads.id, or statement_uploads.id) */
  sourceId: string
  /** For statement type only */
  suggestionIndex?: number
  title: string
  subtitle?: string
  amount: number | null
  currency: string | null
  date: string | null
  isMatched: boolean
  matchedTransactionId: string | null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'email' | 'payment_slip' | 'statement' | null
    const q = (searchParams.get('q') || '').trim()
    const includeMatched = searchParams.get('includeMatched') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 100)

    if (!type || !['email', 'payment_slip', 'statement'].includes(type)) {
      return NextResponse.json({ error: 'type must be email, payment_slip, or statement' }, { status: 400 })
    }

    const service = createServiceRoleClient()
    let results: SourceSearchResult[] = []

    if (type === 'email') {
      let query = service
        .from('email_transactions')
        .select('id, subject, from_address, from_name, amount, currency, transaction_date, matched_transaction_id, description')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (!includeMatched) {
        query = query.is('matched_transaction_id', null)
      }
      if (q) {
        const like = `%${q}%`
        query = query.or(
          `subject.ilike.${like},from_address.ilike.${like},from_name.ilike.${like},description.ilike.${like}`
        )
      }

      const { data, error } = await query
      if (error) throw error

      results = (data || []).map((row) => ({
        compositeId: `email:${row.id}`,
        type: 'email' as const,
        sourceId: row.id,
        title: row.subject || row.description || '(no subject)',
        subtitle: row.from_name || row.from_address || undefined,
        amount: row.amount != null ? Number(row.amount) : null,
        currency: row.currency,
        date: row.transaction_date,
        isMatched: !!row.matched_transaction_id,
        matchedTransactionId: row.matched_transaction_id,
      }))
    } else if (type === 'payment_slip') {
      let query = service
        .from('payment_slip_uploads')
        .select(
          'id, filename, sender_name, recipient_name, amount, currency, transaction_date, matched_transaction_id, memo'
        )
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (!includeMatched) {
        query = query.is('matched_transaction_id', null)
      }
      if (q) {
        const like = `%${q}%`
        query = query.or(
          `filename.ilike.${like},sender_name.ilike.${like},recipient_name.ilike.${like},memo.ilike.${like}`
        )
      }

      const { data, error } = await query
      if (error) throw error

      results = (data || []).map((row) => ({
        compositeId: `slip:${row.id}`,
        type: 'payment_slip' as const,
        sourceId: row.id,
        title: row.recipient_name || row.sender_name || row.filename || '(payment slip)',
        subtitle: row.memo || row.filename || undefined,
        amount: row.amount != null ? Number(row.amount) : null,
        currency: row.currency,
        date: row.transaction_date,
        isMatched: !!row.matched_transaction_id,
        matchedTransactionId: row.matched_transaction_id,
      }))
    } else {
      // statement: fetch recent statements, expand their extraction_log.suggestions
      const { data: statements, error } = await service
        .from('statement_uploads')
        .select('id, filename, extraction_log, statement_period_end')
        .eq('user_id', user.id)
        .in('status', ['ready_for_review', 'in_review', 'done'])
        .order('statement_period_end', { ascending: false, nullsFirst: false })
        .limit(20)

      if (error) throw error

      const qLower = q.toLowerCase()
      const rows: SourceSearchResult[] = []

      for (const stmt of statements || []) {
        const log = stmt.extraction_log as { suggestions?: Array<Record<string, unknown>> } | null
        const suggestions = log?.suggestions || []
        for (let i = 0; i < suggestions.length; i++) {
          const s = suggestions[i] as {
            description?: string
            amount?: number
            currency?: string
            transaction_date?: string
            matched_transaction_id?: string | null
          }
          const isMatched = !!s.matched_transaction_id
          if (!includeMatched && isMatched) continue
          if (q && !(s.description || '').toLowerCase().includes(qLower)) continue

          rows.push({
            compositeId: `stmt:${stmt.id}:${i}`,
            type: 'statement',
            sourceId: stmt.id,
            suggestionIndex: i,
            title: s.description || '(statement row)',
            subtitle: stmt.filename || undefined,
            amount: s.amount != null ? Number(s.amount) : null,
            currency: s.currency || null,
            date: s.transaction_date || null,
            isMatched,
            matchedTransactionId: s.matched_transaction_id || null,
          })

          if (rows.length >= limit) break
        }
        if (rows.length >= limit) break
      }

      results = rows
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Source search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
