import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/statements
 *
 * Returns all statement uploads for the authenticated user,
 * with payment method name joined.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rows, error: stmtError } = await supabase
      .from('statement_uploads')
      .select(`
        id,
        filename,
        file_size,
        payment_method_id,
        status,
        statement_period_start,
        statement_period_end,
        transactions_extracted,
        transactions_matched,
        transactions_new,
        uploaded_at,
        extraction_error,
        extraction_log,
        payment_methods(id, name, type)
      `)
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (stmtError) {
      return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 })
    }

    // Compute live linked counts from suggestion data
    interface Suggestion { status?: string; matched_transaction_id?: string }
    const statements = (rows ?? []).map(row => {
      const suggestions = (row.extraction_log as { suggestions?: Suggestion[] } | null)?.suggestions || []
      const totalExtracted = suggestions.length || row.transactions_extracted || 0
      const totalLinked = suggestions.filter(
        (s: Suggestion) => s.status === 'approved' && s.matched_transaction_id
      ).length
      const { extraction_log: _, ...rest } = row
      return {
        ...rest,
        transactions_extracted: totalExtracted,
        transactions_matched: totalLinked,
        transactions_new: totalExtracted - totalLinked,
      }
    })

    return NextResponse.json({ statements })
  } catch (error) {
    console.error('Statements API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
