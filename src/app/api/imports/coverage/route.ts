import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/imports/coverage
 *
 * Returns a coverage grid: for each (payment_method, month) cell,
 * the status of statement uploads.
 *
 * Response:
 * {
 *   paymentMethods: [{ id, name }],
 *   months: ["2026-02", "2026-01", ...],
 *   cells: { [paymentMethodId]: { [month]: { status, count?, statementId? } } },
 *   pendingTotal: number,
 *   highConfidenceCount: number,
 * }
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch payment methods
    const { data: paymentMethods, error: pmError } = await supabase
      .from('payment_methods')
      .select('id, name')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })

    if (pmError) {
      return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 })
    }

    // Fetch all statement uploads
    const { data: statements, error: stmtError } = await supabase
      .from('statement_uploads')
      .select(`
        id,
        payment_method_id,
        status,
        statement_period_start,
        statement_period_end,
        created_at,
        extraction_log
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (stmtError) {
      return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 })
    }

    // Compute last 6 months from current date
    const now = new Date()
    const months: string[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    // Build cells map
    type CellStatus = 'missing' | 'processing' | 'pending_review' | 'done'
    interface CellData {
      status: CellStatus
      count?: number
      statementId?: string
    }

    const cells: Record<string, Record<string, CellData>> = {}

    // Initialize all cells as missing
    for (const pm of paymentMethods || []) {
      cells[pm.id] = {}
      for (const month of months) {
        cells[pm.id][month] = { status: 'missing' }
      }
    }

    // Track totals
    let pendingTotal = 0
    let highConfidenceCount = 0

    // Map statements to cells
    for (const stmt of statements || []) {
      if (!stmt.payment_method_id) continue

      // Determine which month this statement covers
      let stmtMonth: string | null = null
      if (stmt.statement_period_start) {
        const d = new Date(stmt.statement_period_start)
        stmtMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      } else if (stmt.created_at) {
        const d = new Date(stmt.created_at)
        stmtMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }

      if (!stmtMonth || !months.includes(stmtMonth)) continue
      if (!cells[stmt.payment_method_id]) continue

      if (stmt.status === 'processing') {
        cells[stmt.payment_method_id][stmtMonth] = {
          status: 'processing',
          statementId: stmt.id,
        }
      } else if (stmt.status === 'completed') {
        // Check if there are pending suggestions
        const extractionLog = stmt.extraction_log as { suggestions?: Array<{ status?: string; confidence?: number }> } | null
        const suggestions = extractionLog?.suggestions || []
        const pendingCount = suggestions.filter(s => !s.status || s.status === 'pending').length
        const highCount = suggestions.filter(
          s => (!s.status || s.status === 'pending') && (s.confidence ?? 0) >= 90
        ).length

        pendingTotal += pendingCount
        highConfidenceCount += highCount

        if (pendingCount > 0) {
          cells[stmt.payment_method_id][stmtMonth] = {
            status: 'pending_review',
            count: pendingCount,
            statementId: stmt.id,
          }
        } else {
          cells[stmt.payment_method_id][stmtMonth] = {
            status: 'done',
            statementId: stmt.id,
          }
        }
      }
    }

    return NextResponse.json({
      paymentMethods: paymentMethods || [],
      months,
      cells,
      pendingTotal,
      highConfidenceCount,
    })
  } catch (error) {
    console.error('Coverage API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
