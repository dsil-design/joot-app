import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Suggestion } from '@/lib/imports/queue-types'

interface RematchStats {
  statementsChecked: number
  statementSuggestionsRematched: number
  statementNewMatchesFound: number
  emailsChecked: number
  emailNewMatchesFound: number
}

/**
 * POST /api/imports/rematch
 *
 * Re-runs matching for pending, unmatched (or low-confidence) items
 * against current transactions in the database. Updates stored
 * suggestions/email records so the review queue reflects new matches.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats: RematchStats = {
      statementsChecked: 0,
      statementSuggestionsRematched: 0,
      statementNewMatchesFound: 0,
      emailsChecked: 0,
      emailNewMatchesFound: 0,
    }

    // --- 1. Re-match statement suggestions ---
    await rematchStatementSuggestions(supabase, user.id, stats)

    // --- 2. Re-match email transactions ---
    await rematchEmailTransactions(supabase, user.id, stats)

    // After rematch, mark affected proposals as stale
    try {
      const { markStaleProposals } = await import('@/lib/proposals/proposal-service')
      await markStaleProposals(supabase, user.id)
    } catch (err) {
      console.error('Failed to mark proposals stale after rematch:', err)
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Rematch API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Re-match pending statement suggestions that are unmatched or low-confidence.
 */
async function rematchStatementSuggestions(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  stats: RematchStats
) {
  const { data: statements, error } = await supabase
    .from('statement_uploads')
    .select('id, extraction_log, statement_period_start, statement_period_end')
    .eq('user_id', userId)
    .in('status', ['ready_for_review', 'in_review', 'done'])

  if (error || !statements) return

  for (const statement of statements) {
    const extractionLog = statement.extraction_log as { suggestions?: Suggestion[] } | null
    const suggestions = extractionLog?.suggestions
    if (!suggestions || suggestions.length === 0) continue

    // Find suggestions worth re-matching: pending AND (unmatched or low confidence)
    const rematchIndices: number[] = []
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i]
      if (s.status && s.status !== 'pending') continue
      if (s.is_new || (s.confidence > 0 && s.confidence < 55)) {
        rematchIndices.push(i)
      }
    }

    if (rematchIndices.length === 0) continue
    stats.statementsChecked++

    // Determine date range for candidate lookup (widen by 7 days for tolerance)
    const dates = rematchIndices.map(i => suggestions[i].transaction_date).filter(Boolean)
    if (dates.length === 0) continue

    const sortedDates = [...dates].sort()
    const startDate = shiftDate(sortedDates[0], -7)
    const endDate = shiftDate(sortedDates[sortedDates.length - 1], 7)

    // Fetch candidate transactions
    const { data: candidates } = await supabase
      .from('transactions')
      .select('id, amount, original_currency, transaction_date, description, vendors(name)')
      .eq('user_id', userId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .limit(300)

    if (!candidates || candidates.length === 0) continue

    // Re-match each eligible suggestion
    let updated = false
    for (const idx of rematchIndices) {
      const s = suggestions[idx]
      stats.statementSuggestionsRematched++

      const match = findBestStatementMatch(s, candidates)
      if (match && match.confidence > s.confidence) {
        suggestions[idx] = {
          ...s,
          matched_transaction_id: match.id,
          confidence: match.confidence,
          reasons: match.reasons,
          is_new: false,
        }
        stats.statementNewMatchesFound++
        updated = true
      }
    }

    // Persist updated suggestions
    if (updated) {
      await supabase
        .from('statement_uploads')
        .update({
          extraction_log: { ...extractionLog, suggestions },
        })
        .eq('id', statement.id)
    }
  }
}

/**
 * Re-match pending email transactions that are unmatched.
 */
async function rematchEmailTransactions(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  stats: RematchStats
) {
  const { data: emails, error } = await supabase
    .from('email_transactions')
    .select('id, amount, currency, transaction_date, description, vendor_name_raw')
    .eq('user_id', userId)
    .in('status', ['pending_review', 'ready_to_import', 'waiting_for_statement'])
    .is('matched_transaction_id', null)

  if (error || !emails || emails.length === 0) return

  // Determine date range
  const dates = emails
    .map(e => e.transaction_date)
    .filter(Boolean) as string[]
  if (dates.length === 0) return

  const sortedDates = [...dates].sort()
  const startDate = shiftDate(sortedDates[0], -7)
  const endDate = shiftDate(sortedDates[sortedDates.length - 1], 7)

  // Fetch candidate transactions
  const { data: candidates } = await supabase
    .from('transactions')
    .select('id, amount, original_currency, transaction_date, description, vendors(name)')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .limit(300)

  if (!candidates || candidates.length === 0) return

  for (const email of emails) {
    if (!email.amount || !email.transaction_date) continue
    stats.emailsChecked++

    const match = findBestMatch(
      {
        amount: Number(email.amount),
        currency: email.currency || 'USD',
        date: email.transaction_date,
        description: email.description || email.vendor_name_raw || '',
      },
      candidates
    )

    if (match && match.confidence >= 55) {
      stats.emailNewMatchesFound++
      await supabase
        .from('email_transactions')
        .update({
          matched_transaction_id: match.id,
          match_confidence: match.confidence,
        })
        .eq('id', email.id)
        .eq('user_id', userId)
    }
  }
}

// --- Matching helpers (mirrors statement-processor logic) ---

interface CandidateTx {
  id: string
  amount: number
  original_currency: string
  transaction_date: string
  description: string | null
  vendors: { name: string } | null
}

function findBestStatementMatch(
  suggestion: Suggestion,
  candidates: CandidateTx[]
): { id: string; confidence: number; reasons: string[] } | null {
  return findBestMatch(
    {
      amount: suggestion.amount,
      currency: suggestion.currency,
      date: suggestion.transaction_date,
      description: suggestion.description,
    },
    candidates
  )
}

function findBestMatch(
  source: { amount: number; currency: string; date: string; description: string },
  candidates: CandidateTx[]
): { id: string; confidence: number; reasons: string[] } | null {
  let best: { id: string; confidence: number; reasons: string[] } | null = null

  const sourceDateStr = toDateOnly(source.date)
  const sourceDate = new Date(sourceDateStr + 'T00:00:00Z')

  for (const tx of candidates) {
    // Same currency check
    if (tx.original_currency !== source.currency) continue

    const amountMatch = Math.abs(Number(tx.amount)) === Math.abs(source.amount)
    if (!amountMatch) continue

    const dbDate = new Date(tx.transaction_date + 'T00:00:00Z')
    const dayDiff = Math.abs(
      Math.round((sourceDate.getTime() - dbDate.getTime()) / (1000 * 60 * 60 * 24))
    )

    let confidence = 0
    const reasons: string[] = []

    if (dayDiff === 0) {
      confidence = 95
      reasons.push('Amount matches exactly', 'Date matches exactly')
    } else if (dayDiff === 1) {
      confidence = 90
      reasons.push('Amount matches exactly', 'Date within 1 day (timezone adjustment)')
    } else if (dayDiff <= 3) {
      confidence = 60
      reasons.push('Amount matches exactly', `Date differs by ${dayDiff} days`)
    } else {
      continue
    }

    if (!best || confidence > best.confidence) {
      best = { id: tx.id, confidence, reasons }
    }

    if (confidence >= 95) break
  }

  return best
}

function toDateOnly(dateStr: string): string {
  if (!dateStr.includes('T')) return dateStr.slice(0, 10)
  const d = new Date(dateStr)
  if (d.getUTCHours() >= 12) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]
}

function shiftDate(dateStr: string, days: number): string {
  const normalized = toDateOnly(dateStr)
  const d = new Date(normalized + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}
