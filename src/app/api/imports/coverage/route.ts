import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/imports/coverage
 *
 * Returns a coverage grid: for each (payment_method, month) cell,
 * the status of statement uploads — now covering 12 months with
 * billing cycle inference, tooltip counts, aggregates, and email sync info.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch payment methods with extended fields
    const { data: paymentMethods, error: pmError } = await supabase
      .from('payment_methods')
      .select('id, name, preferred_currency, billing_cycle_start_day, sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })

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
        transactions_extracted,
        transactions_matched,
        transactions_new,
        created_at,
        extraction_log
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (stmtError) {
      return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 })
    }

    // Fetch email sync state
    const { data: syncState } = await supabase
      .from('email_sync_state')
      .select('folder, last_sync_at')
      .eq('user_id', user.id)
      .order('last_sync_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Fetch pending email transaction count
    const { count: emailsPendingReview } = await supabase
      .from('email_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending_review')

    // Compute 12 months (current + 11 past)
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const months: string[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    // Infer billing cycle day per payment method
    const inferredBillingCycleDays: Record<string, number> = {}
    for (const pm of paymentMethods || []) {
      // Collect statement_period_start day-of-month across completed statements for this PM
      const pmStatements = (statements || []).filter(
        s => s.payment_method_id === pm.id && s.status === 'completed' && s.statement_period_start
      )
      if (pmStatements.length >= 2) {
        const dayCountMap: Record<number, number> = {}
        for (const s of pmStatements) {
          const day = new Date(s.statement_period_start!).getDate()
          dayCountMap[day] = (dayCountMap[day] || 0) + 1
        }
        // Find mode
        let modeDay = 1
        let modeCount = 0
        for (const [day, count] of Object.entries(dayCountMap)) {
          if (count > modeCount) {
            modeCount = count
            modeDay = parseInt(day)
          }
        }
        // Use if >50% consistency
        if (modeCount / pmStatements.length > 0.5) {
          inferredBillingCycleDays[pm.id] = modeDay
        }
      }
      // Fall back to billing_cycle_start_day column, then default 1
      if (!inferredBillingCycleDays[pm.id]) {
        inferredBillingCycleDays[pm.id] = pm.billing_cycle_start_day ?? 1
      }
    }

    // Build cells map
    type CellStatus = 'missing' | 'processing' | 'pending_review' | 'done' | 'future'
    interface TooltipCounts {
      extracted: number
      matched: number
      newCount: number
    }
    interface CellData {
      status: CellStatus
      count?: number
      statementId?: string
      tooltipCounts?: TooltipCounts
    }

    const cells: Record<string, Record<string, CellData>> = {}

    // Initialize all cells
    for (const pm of paymentMethods || []) {
      cells[pm.id] = {}
      for (const month of months) {
        // Future months are marked as 'future'
        if (month > currentMonth) {
          cells[pm.id][month] = { status: 'future' }
        } else {
          cells[pm.id][month] = { status: 'missing' }
        }
      }
    }

    // Per-payment-method aggregates
    const pmAggregates: Record<string, { extracted: number; matched: number; newCount: number; statementsCount: number }> = {}
    for (const pm of paymentMethods || []) {
      pmAggregates[pm.id] = { extracted: 0, matched: 0, newCount: 0, statementsCount: 0 }
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

      // Build tooltip counts from extraction_log
      const extractionLog = stmt.extraction_log as {
        transactions?: Array<unknown>
        suggestions?: Array<{ status?: string; confidence?: number; is_new?: boolean }>
      } | null

      const extracted = stmt.transactions_extracted ?? extractionLog?.transactions?.length ?? 0
      const matched = stmt.transactions_matched ?? 0
      const newCount = stmt.transactions_new ?? 0
      const tooltipCounts: TooltipCounts = { extracted, matched, newCount }

      if (stmt.status === 'processing') {
        cells[stmt.payment_method_id][stmtMonth] = {
          status: 'processing',
          statementId: stmt.id,
        }
      } else if (stmt.status === 'completed') {
        // Check if there are pending suggestions
        const suggestions = extractionLog?.suggestions || []
        const pendingCount = suggestions.filter(s => !s.status || s.status === 'pending').length
        const highCount = suggestions.filter(
          s => (!s.status || s.status === 'pending') && (s.confidence ?? 0) >= 90
        ).length

        pendingTotal += pendingCount
        highConfidenceCount += highCount

        // Accumulate PM aggregates
        if (pmAggregates[stmt.payment_method_id]) {
          pmAggregates[stmt.payment_method_id].extracted += extracted
          pmAggregates[stmt.payment_method_id].matched += matched
          pmAggregates[stmt.payment_method_id].newCount += newCount
          pmAggregates[stmt.payment_method_id].statementsCount += 1
        }

        if (pendingCount > 0) {
          cells[stmt.payment_method_id][stmtMonth] = {
            status: 'pending_review',
            count: pendingCount,
            statementId: stmt.id,
            tooltipCounts,
          }
        } else {
          cells[stmt.payment_method_id][stmtMonth] = {
            status: 'done',
            statementId: stmt.id,
            tooltipCounts,
          }
        }
      }
    }

    // Calculate overall coverage %
    let totalNonFutureCells = 0
    let coveredCells = 0
    for (const pm of paymentMethods || []) {
      for (const month of months) {
        const cell = cells[pm.id]?.[month]
        if (cell && cell.status !== 'future') {
          totalNonFutureCells++
          if (cell.status === 'done' || cell.status === 'pending_review') {
            coveredCells++
          }
        }
      }
    }
    const overallCoveragePercent = totalNonFutureCells > 0
      ? Math.round((coveredCells / totalNonFutureCells) * 100)
      : 0

    // Build payment methods response with extended data
    const paymentMethodsResponse = (paymentMethods || []).map(pm => {
      const pmCells = cells[pm.id] || {}
      const pmNonFuture = months.filter(m => pmCells[m]?.status !== 'future').length
      const pmCovered = months.filter(m => {
        const s = pmCells[m]?.status
        return s === 'done' || s === 'pending_review'
      }).length

      return {
        id: pm.id,
        name: pm.name,
        preferred_currency: pm.preferred_currency,
        billing_cycle_start_day: pm.billing_cycle_start_day,
        inferredBillingCycleDay: inferredBillingCycleDays[pm.id] ?? 1,
        coveragePercent: pmNonFuture > 0 ? Math.round((pmCovered / pmNonFuture) * 100) : 0,
        aggregates: pmAggregates[pm.id] || { extracted: 0, matched: 0, newCount: 0, statementsCount: 0 },
      }
    })

    return NextResponse.json({
      paymentMethods: paymentMethodsResponse,
      months,
      cells,
      pendingTotal,
      highConfidenceCount,
      overallCoveragePercent,
      lastEmailSync: syncState?.last_sync_at ?? null,
      emailsPendingReview: emailsPendingReview ?? 0,
    })
  } catch (error) {
    console.error('Coverage API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
