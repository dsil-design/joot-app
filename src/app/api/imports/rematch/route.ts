import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Suggestion } from '@/lib/imports/queue-types'
import type { Json } from '@/lib/supabase/types'
import { hasDirectionConflict } from '@/lib/matching/direction-guard'

interface RematchStats {
  statementsChecked: number
  statementSuggestionsRematched: number
  statementNewMatchesFound: number
  /** Stored matches cleared because they violated currency or direction. */
  statementMatchesDropped: number
  emailsChecked: number
  emailNewMatchesFound: number
  slipsChecked: number
  slipNewMatchesFound: number
}

/**
 * POST /api/imports/rematch
 *
 * Re-runs matching for pending, unmatched (or low-confidence) items
 * against current transactions in the database. Updates stored
 * suggestions/email records so the review queue reflects new matches.
 */
interface RematchFilters {
  source?: string     // 'email' | 'statement' | 'merged' | 'payment_slip'
  currency?: string   // 'USD' | 'THB' etc.
  statementUploadId?: string
  from?: string       // date string YYYY-MM-DD
  to?: string         // date string YYYY-MM-DD
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let filters: RematchFilters = {}
    try {
      const body = await request.json()
      filters = body || {}
    } catch {
      // No body or invalid JSON — rematch everything (backwards-compatible)
    }

    const stats: RematchStats = {
      statementsChecked: 0,
      statementSuggestionsRematched: 0,
      statementNewMatchesFound: 0,
      statementMatchesDropped: 0,
      emailsChecked: 0,
      emailNewMatchesFound: 0,
      slipsChecked: 0,
      slipNewMatchesFound: 0,
    }

    // Only rematch sources that match the active filter
    const shouldRematchStatements = !filters.source || filters.source === 'statement' || filters.source === 'merged'
    const shouldRematchEmails = !filters.source || filters.source === 'email' || filters.source === 'merged'
    const shouldRematchSlips = !filters.source || filters.source === 'payment_slip' || filters.source === 'merged'

    // --- 1. Re-match statement suggestions ---
    if (shouldRematchStatements) {
      await rematchStatementSuggestions(supabase, user.id, stats, filters)
    }

    // --- 2. Re-match email transactions ---
    if (shouldRematchEmails) {
      await rematchEmailTransactions(supabase, user.id, stats, filters)
    }

    // --- 3. Re-match payment slips ---
    if (shouldRematchSlips) {
      await rematchPaymentSlips(supabase, user.id, stats, filters)
    }

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
  stats: RematchStats,
  filters: RematchFilters = {}
) {
  let query = supabase
    .from('statement_uploads')
    .select('id, extraction_log, statement_period_start, statement_period_end')
    .eq('user_id', userId)
    .in('status', ['ready_for_review', 'in_review', 'done'])

  if (filters.statementUploadId) {
    query = query.eq('id', filters.statementUploadId)
  }

  const { data: statements, error } = await query

  if (error || !statements) return

  for (const statement of statements) {
    const extractionLog = statement.extraction_log as { suggestions?: Suggestion[] } | null
    const suggestions = extractionLog?.suggestions
    if (!suggestions || suggestions.length === 0) continue

    // Raw parsed rows sit alongside the suggestions and are index-aligned with
    // them. They carry the parser's `type`, which stored suggestions predating
    // the serialization fix do not — so this is how direction is recovered for
    // matches written before that change.
    const rawRows = (extractionLog as { transactions?: { type?: string }[] } | null)?.transactions

    const passesFilters = (s: Suggestion) => {
      if (filters.currency && s.currency !== filters.currency) return false
      if (filters.from && s.transaction_date < filters.from) return false
      if (filters.to && s.transaction_date > filters.to) return false
      return true
    }

    // Find suggestions worth re-matching: pending AND (unmatched or low confidence)
    const rematchIndices: number[] = []
    // Pending suggestions that already carry a match, to be re-validated against
    // the hard guards. These are invisible to the re-match pass above — it only
    // looks at unmatched or sub-55 rows, and only ever raises confidence — so a
    // wrong match stored at 90 or 95 could never be corrected by any existing
    // path short of reprocessing the statement, which destroys approval history.
    const validateIndices: number[] = []
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i]
      if (s.status && s.status !== 'pending') continue
      if (!passesFilters(s)) continue
      if (s.is_new || (s.confidence > 0 && s.confidence < 55)) {
        rematchIndices.push(i)
      } else if (s.matched_transaction_id) {
        validateIndices.push(i)
      }
    }

    if (rematchIndices.length === 0 && validateIndices.length === 0) continue
    stats.statementsChecked++

    let updated = false

    // ── Pass 1: drop stored matches that violate a hard guard ────────────────
    // Currency and direction disagreements are impossible, not merely unlikely,
    // so a failing link can be cleared without needing a better candidate to
    // replace it. Only the suggestion's own matching metadata is rewritten —
    // the transaction and its `source_statement_upload_id` back-pointer are
    // untouched, and non-pending rows were already excluded, so decisions the
    // user has made stay intact.
    if (validateIndices.length > 0) {
      const linkedIds = [...new Set(validateIndices.map(i => suggestions[i].matched_transaction_id!))]
      const { data: linked } = await supabase
        .from('transactions')
        .select('id, original_currency, transaction_type')
        .eq('user_id', userId)
        .in('id', linkedIds)
      const linkedById = new Map((linked ?? []).map(t => [t.id, t]))

      for (const idx of validateIndices) {
        const s = suggestions[idx]
        const tx = linkedById.get(s.matched_transaction_id!)
        if (!tx) continue // transaction deleted or not visible — leave it alone

        const currencyConflict =
          (tx.original_currency ?? '').toUpperCase() !== (s.currency ?? '').toUpperCase()
        const directionConflict = hasDirectionConflict({
          // Prefer the suggestion's own type (present on statements processed
          // after the serialization fix); fall back to the index-aligned raw row.
          rowType: s.type ?? rawRows?.[idx]?.type,
          rowDescription: s.description,
          transactionType: tx.transaction_type,
        })
        if (!currencyConflict && !directionConflict) continue

        const reason = currencyConflict
          ? `Match dropped: statement row is ${s.currency} but the transaction is ${tx.original_currency}`
          : 'Match dropped: the statement row and the transaction move money in opposite directions'

        const { matched_transaction_id: _dropped, ...rest } = s
        suggestions[idx] = {
          ...rest,
          confidence: 0,
          reasons: [reason],
          is_new: true,
        }
        stats.statementMatchesDropped++
        updated = true
      }
    }

    // ── Pass 2: look for new matches (existing upgrade-only behaviour) ───────
    // Determine date range for candidate lookup (widen by 7 days for tolerance)
    const dates = rematchIndices.map(i => suggestions[i].transaction_date).filter(Boolean)

    if (dates.length > 0) {
      const sortedDates = [...dates].sort()
      const startDate = shiftDate(sortedDates[0], -7)
      const endDate = shiftDate(sortedDates[sortedDates.length - 1], 7)

      // Fetch candidate transactions
      const { data: candidates } = await supabase
        .from('transactions')
        .select('id, amount, original_currency, transaction_date, transaction_type, description, vendors(name)')
        .eq('user_id', userId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .limit(300)

      if (candidates && candidates.length > 0) {
        // Re-match each eligible suggestion
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
      }
    }

    // Persist updated suggestions
    if (updated) {
      await supabase
        .from('statement_uploads')
        .update({
          // Valid JSON, but the typed shape has no index signature and so
          // isn't assignable to the generated Json union.
          extraction_log: { ...extractionLog, suggestions } as unknown as Json,
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
  stats: RematchStats,
  filters: RematchFilters = {}
) {
  let query = supabase
    .from('email_transactions')
    .select('id, amount, currency, transaction_date, description, vendor_name_raw, rejected_transaction_ids')
    .eq('user_id', userId)
    .in('status', ['pending_review', 'ready_to_import', 'waiting_for_statement', 'waiting_for_email', 'waiting_for_slip'])
    .is('matched_transaction_id', null)

  if (filters.currency) {
    query = query.eq('currency', filters.currency)
  }
  if (filters.from) {
    query = query.gte('transaction_date', filters.from)
  }
  if (filters.to) {
    query = query.lte('transaction_date', filters.to)
  }

  const { data: emails, error } = await query

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
    .select('id, amount, original_currency, transaction_date, transaction_type, description, vendors(name)')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .limit(300)

  if (!candidates || candidates.length === 0) return

  for (const email of emails) {
    if (!email.amount || !email.transaction_date) continue
    stats.emailsChecked++

    // Exclude transaction IDs that the user previously rejected for this email
    const rejectedIds = new Set((email.rejected_transaction_ids || []) as string[])
    const eligibleCandidates = rejectedIds.size > 0
      ? candidates.filter((c) => !rejectedIds.has(c.id))
      : candidates

    const match = findBestMatch(
      {
        amount: Number(email.amount),
        currency: email.currency || 'USD',
        date: email.transaction_date,
        description: email.description || email.vendor_name_raw || '',
      },
      eligibleCandidates
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

/**
 * Re-match pending payment slips that are unmatched, honoring previously
 * rejected transaction IDs so the same bad match isn't proposed again.
 */
async function rematchPaymentSlips(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  stats: RematchStats,
  filters: RematchFilters = {}
) {
  // Payment slips are THB-only — if a currency filter is set to anything else, skip.
  if (filters.currency && filters.currency !== 'THB') return

  let query = supabase
    .from('payment_slip_uploads')
    .select('id, amount, currency, transaction_date, sender_name, recipient_name, detected_direction, rejected_transaction_ids')
    .eq('user_id', userId)
    .eq('review_status', 'pending')
    .in('status', ['ready_for_review', 'done'])
    .is('matched_transaction_id', null)

  if (filters.from) {
    query = query.gte('transaction_date', filters.from)
  }
  if (filters.to) {
    query = query.lte('transaction_date', filters.to)
  }

  const { data: slips, error } = await query

  if (error || !slips || slips.length === 0) return

  // Determine date range
  const dates = slips
    .map(s => s.transaction_date)
    .filter(Boolean) as string[]
  if (dates.length === 0) return

  const sortedDates = [...dates].sort()
  const startDate = shiftDate(sortedDates[0], -7)
  const endDate = shiftDate(sortedDates[sortedDates.length - 1], 7)

  // Fetch candidate transactions (THB only — matches initial slip matcher behavior)
  const { data: candidates } = await supabase
    .from('transactions')
    .select('id, amount, original_currency, transaction_date, transaction_type, description, vendors(name)')
    .eq('user_id', userId)
    .eq('original_currency', 'THB')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .limit(300)

  if (!candidates || candidates.length === 0) return

  for (const slip of slips) {
    if (!slip.amount || !slip.transaction_date) continue
    stats.slipsChecked++

    // Exclude transaction IDs the user previously rejected for this slip
    const rejectedIds = new Set((slip.rejected_transaction_ids || []) as string[])
    const eligibleCandidates = rejectedIds.size > 0
      ? candidates.filter((c) => !rejectedIds.has(c.id))
      : candidates

    // Slip descriptions are built from sender/recipient depending on direction
    const description = slip.detected_direction === 'income'
      ? (slip.sender_name || '')
      : (slip.recipient_name || '')

    const match = findBestMatch(
      {
        amount: Number(slip.amount),
        currency: slip.currency || 'THB',
        date: slip.transaction_date,
        description,
      },
      eligibleCandidates
    )

    if (match && match.confidence >= 55) {
      stats.slipNewMatchesFound++
      await supabase
        .from('payment_slip_uploads')
        .update({
          matched_transaction_id: match.id,
          match_confidence: match.confidence,
        })
        .eq('id', slip.id)
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
  transaction_type?: string | null
  description: string | null
  vendors: { name: string } | null
}

function findBestStatementMatch(
  suggestion: Suggestion,
  candidates: CandidateTx[],
  rowType?: string
): { id: string; confidence: number; reasons: string[] } | null {
  return findBestMatch(
    {
      amount: suggestion.amount,
      currency: suggestion.currency,
      date: suggestion.transaction_date,
      description: suggestion.description,
      rowType,
    },
    candidates
  )
}

function findBestMatch(
  source: { amount: number; currency: string; date: string; description: string; rowType?: string },
  candidates: CandidateTx[]
): { id: string; confidence: number; reasons: string[] } | null {
  let best: { id: string; confidence: number; reasons: string[] } | null = null

  const sourceDateStr = toDateOnly(source.date)
  const sourceDate = new Date(sourceDateStr + 'T00:00:00Z')

  for (const tx of candidates) {
    // Same currency check
    if (tx.original_currency !== source.currency) continue

    // Same guard the validation pass applies, so this pass can never create a
    // match the next run would immediately drop.
    if (
      hasDirectionConflict({
        rowType: source.rowType,
        rowDescription: source.description,
        transactionType: tx.transaction_type,
      })
    ) {
      continue
    }

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
