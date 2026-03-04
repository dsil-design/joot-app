import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/emails/stats
 *
 * Returns aggregated statistics for email transactions.
 *
 * Query Parameters:
 * - period: '7d' | '30d' | '90d' | 'ytd' (default: '30d')
 *
 * Returns:
 * - status_counts: { [status]: number }
 * - classification_counts: { [classification]: number }
 * - confidence_buckets: { high: number, medium: number, low: number }
 * - monthly_trend: Array<{ month, received, extracted, matched, imported }>
 * - sync: { last_sync_at, folder }
 * - waiting_summary: { count, total_amount, primary_currency }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse period
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    const validPeriods = ['7d', '30d', '90d', 'ytd']
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` },
        { status: 400 }
      )
    }

    // Calculate date cutoff
    const now = new Date()
    let cutoffDate: string
    if (period === 'ytd') {
      cutoffDate = `${now.getFullYear()}-01-01`
    } else {
      const days = parseInt(period)
      const cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() - days)
      cutoffDate = cutoff.toISOString().split('T')[0]
    }

    // Fetch all rows from the unified view for the period
    // This includes both processed (email_transactions) and unprocessed (emails only) rows
    const { data: emails, error: emailsError } = await supabase
      .from('email_hub_unified')
      .select('status, classification, ai_classification, ai_suggested_skip, extraction_confidence, email_date, amount, currency, processed_at, matched_at, is_processed, email_group_id, is_group_primary, parser_key')
      .eq('user_id', user.id)
      .gte('email_date', cutoffDate)

    if (emailsError) {
      console.error('Error fetching email stats:', emailsError)
      return NextResponse.json(
        { error: 'Failed to fetch email statistics' },
        { status: 500 }
      )
    }

    // Aggregate in JS (more flexible than complex SQL through Supabase client)
    const statusCounts: Record<string, number> = {}
    const classificationCounts: Record<string, number> = {}
    const aiClassificationCounts: Record<string, number> = {}
    const confidenceBuckets = { high: 0, medium: 0, low: 0 }
    const monthlyMap = new Map<string, { received: number; extracted: number; matched: number; imported: number }>()

    // Extraction tracking
    let notExtractedCount = 0
    let unprocessedCount = 0

    // AI tracking
    let aiSuggestedSkipCount = 0
    let autoSkippedCount = 0
    let groupCount = 0
    const groupIds = new Set<string>()

    // Waiting summary
    let waitingCount = 0
    let waitingTotalAmount = 0
    const waitingCurrencies: Record<string, number> = {}

    for (const email of emails || []) {
      // Status counts
      const status = email.status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1

      // Classification counts (skip for unprocessed emails)
      if (email.is_processed) {
        const classification = email.classification || 'unknown'
        classificationCounts[classification] = (classificationCounts[classification] || 0) + 1

        // AI classification counts
        if (email.ai_classification) {
          aiClassificationCounts[email.ai_classification] = (aiClassificationCounts[email.ai_classification] || 0) + 1
        }

        // AI skip tracking
        if (email.ai_suggested_skip) {
          aiSuggestedSkipCount++
          if (email.status === 'skipped') {
            autoSkippedCount++
          }
        }

        // Group tracking
        if (email.email_group_id) {
          groupIds.add(email.email_group_id)
        }
      }

      // Track unprocessed and unextracted
      if (!email.is_processed) {
        unprocessedCount++
        notExtractedCount++
      } else if (!email.processed_at || (email.extraction_confidence === 0 && email.amount == null)) {
        notExtractedCount++
      }

      // Confidence buckets (only for processed emails)
      if (email.is_processed) {
        const conf = email.extraction_confidence
        if (conf != null) {
          if (conf >= 90) confidenceBuckets.high++
          else if (conf >= 55) confidenceBuckets.medium++
          else confidenceBuckets.low++
        }
      }

      // Monthly trend
      if (email.email_date) {
        const month = (email.email_date as string).substring(0, 7) // YYYY-MM
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { received: 0, extracted: 0, matched: 0, imported: 0 })
        }
        const entry = monthlyMap.get(month)!
        entry.received++
        if (email.processed_at) entry.extracted++
        if (email.matched_at) entry.matched++
        if (email.status === 'imported') entry.imported++
      }

      // Waiting summary
      if (email.status === 'waiting_for_statement') {
        waitingCount++
        if (email.amount) {
          waitingTotalAmount += Number(email.amount)
        }
        if (email.currency) {
          waitingCurrencies[email.currency] = (waitingCurrencies[email.currency] || 0) + 1
        }
      }
    }

    // Sort monthly trend
    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }))

    // Determine primary currency for waiting items
    let primaryCurrency: string | null = null
    if (Object.keys(waitingCurrencies).length > 0) {
      primaryCurrency = Object.entries(waitingCurrencies)
        .sort(([, a], [, b]) => b - a)[0][0]
    }

    // Fetch sync info
    const { data: syncState } = await supabase
      .from('email_sync_state')
      .select('last_sync_at, folder')
      .eq('user_id', user.id)
      .order('last_sync_at', { ascending: false })
      .limit(1)
      .single()

    // Count total synced emails (raw emails table)
    const { count: totalSyncedEmails } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Count feedback entries
    const { count: feedbackCount } = await supabase
      .from('ai_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    groupCount = groupIds.size

    return NextResponse.json({
      total: (emails || []).length,
      total_synced_emails: totalSyncedEmails || 0,
      not_extracted: notExtractedCount,
      unprocessed: unprocessedCount,
      status_counts: statusCounts,
      classification_counts: classificationCounts,
      ai_classification_counts: aiClassificationCounts,
      confidence_buckets: confidenceBuckets,
      monthly_trend: monthlyTrend,
      sync: syncState ? {
        last_sync_at: syncState.last_sync_at,
        folder: syncState.folder,
      } : null,
      waiting_summary: {
        count: waitingCount,
        total_amount: waitingTotalAmount,
        primary_currency: primaryCurrency,
      },
      ai_stats: {
        suggested_skip_count: aiSuggestedSkipCount,
        auto_skipped_count: autoSkippedCount,
        feedback_count: feedbackCount || 0,
        auto_skip_enabled: (feedbackCount || 0) >= 10,
        group_count: groupCount,
      },
    })
  } catch (error) {
    console.error('Error in email stats API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
