/**
 * Cross-Source Pairer
 *
 * Matches email receipts with credit card statement entries that represent
 * the same purchase but in different currencies (e.g., email=THB, statement=USD).
 *
 * Uses greedy 1:1 matching with tightest percentage-diff priority.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateDaysDiff } from '@/lib/matching/date-matcher'
import { convertAmount, isWithinConversionTolerance } from '@/lib/matching/cross-currency'

/**
 * A candidate item for cross-source pairing
 */
export interface PairCandidate {
  source: 'email' | 'statement'
  emailId?: string
  statementId?: string
  statementIndex?: number
  date: string
  amount: number
  currency: string
  description: string
}

/**
 * Result of a successful cross-source pair
 */
export interface PairResult {
  emailCandidate: PairCandidate
  statementCandidate: PairCandidate
  convertedEmailAmount: number
  rate: number
  rateDate: string
  percentDiff: number
}

/**
 * Configuration for cross-source pairing
 */
export interface PairConfig {
  /** Maximum days between email and statement dates (default: 5) */
  maxDaysDiff?: number
  /** Percentage tolerance for amount matching (default: 2) */
  tolerance?: number
}

/**
 * Find cross-source pairs between email and statement candidates.
 *
 * Algorithm: O(n*m) greedy matching — for each email candidate, find the
 * statement candidate with the tightest percentage diff. Mark both as used
 * for 1:1 matching.
 */
export async function findCrossSourcePairs(
  supabase: SupabaseClient,
  candidates: PairCandidate[],
  config: PairConfig = {}
): Promise<PairResult[]> {
  const { maxDaysDiff = 5, tolerance = 2 } = config

  const emailCandidates = candidates.filter(c => c.source === 'email')
  const statementCandidates = candidates.filter(c => c.source === 'statement')

  if (emailCandidates.length === 0 || statementCandidates.length === 0) {
    return []
  }

  // Pre-fetch all needed exchange rates in batch to avoid O(n*m) DB queries.
  // Collect unique (fromCurrency, toCurrency, date) combinations, then fetch
  // rates for the full date range in a single query per currency pair.
  const rateCache = new Map<string, { rate: number; rateDate: string } | null>()
  const currencyPairs = new Set<string>()
  const allDates: string[] = []

  for (const email of emailCandidates) {
    for (const stmt of statementCandidates) {
      const from = email.currency.toUpperCase()
      const to = stmt.currency.toUpperCase()
      if (from === to) continue
      currencyPairs.add(`${from}:${to}`)
      allDates.push(email.date)
    }
  }

  // Fetch rates for each currency pair covering the full date range
  if (currencyPairs.size > 0 && allDates.length > 0) {
    const sortedDates = [...new Set(allDates)].sort()
    const minDate = sortedDates[0]
    const maxDate = sortedDates[sortedDates.length - 1]

    // Expand range to allow fallback lookups (30 days before, 7 days after)
    const rangeStart = new Date(minDate)
    rangeStart.setDate(rangeStart.getDate() - 30)
    const rangeEnd = new Date(maxDate)
    rangeEnd.setDate(rangeEnd.getDate() + 7)
    const rangeStartStr = rangeStart.toISOString().split('T')[0]
    const rangeEndStr = rangeEnd.toISOString().split('T')[0]

    for (const pair of currencyPairs) {
      const [from, to] = pair.split(':')
      const { data: rates } = await supabase
        .from('exchange_rates')
        .select('rate, date')
        .eq('from_currency', from)
        .eq('to_currency', to)
        .gte('date', rangeStartStr)
        .lte('date', rangeEndStr)
        .order('date', { ascending: false })

      if (rates) {
        // For each unique email date, find the best rate (exact or nearest)
        for (const date of sortedDates) {
          const cacheKey = `${from}:${to}:${date}`
          const exact = rates.find(r => r.date === date)
          if (exact) {
            rateCache.set(cacheKey, { rate: exact.rate, rateDate: exact.date })
          } else {
            // Find nearest earlier rate
            const earlier = rates.find(r => r.date <= date)
            if (earlier) {
              rateCache.set(cacheKey, { rate: earlier.rate, rateDate: earlier.date })
            } else {
              // Find nearest future rate
              const future = [...rates].reverse().find(r => r.date > date)
              rateCache.set(cacheKey, future ? { rate: future.rate, rateDate: future.date } : null)
            }
          }
        }
      }
    }
  }

  const results: PairResult[] = []
  const usedStatements = new Set<number>()

  for (const email of emailCandidates) {
    let bestMatch: {
      stmtIdx: number
      stmt: PairCandidate
      convertedAmount: number
      rate: number
      rateDate: string
      percentDiff: number
    } | null = null

    for (let si = 0; si < statementCandidates.length; si++) {
      if (usedStatements.has(si)) continue

      const stmt = statementCandidates[si]
      const from = email.currency.toUpperCase()
      const to = stmt.currency.toUpperCase()

      // Check date proximity
      const daysDiff = calculateDaysDiff(email.date, stmt.date)
      if (daysDiff > maxDaysDiff) continue

      let convertedAmount: number
      let rate: number
      let rateDate: string

      if (from === to) {
        // Same-currency: direct comparison, no exchange rate needed
        convertedAmount = email.amount
        rate = 1
        rateDate = email.date
        // For same-currency, require amounts within tolerance % directly
        const directPercentDiff = stmt.amount === 0 ? (email.amount === 0 ? 0 : 100)
          : (Math.abs(email.amount - stmt.amount) / Math.abs(stmt.amount)) * 100
        if (directPercentDiff > tolerance) continue
      } else {
        // Cross-currency: look up pre-fetched rate
        const cacheKey = `${from}:${to}:${email.date}`
        const cached = rateCache.get(cacheKey)
        if (!cached) continue

        convertedAmount = email.amount * cached.rate
        rate = cached.rate
        rateDate = cached.rateDate

        // Check amount tolerance
        if (!isWithinConversionTolerance(email.amount, convertedAmount, stmt.amount, tolerance)) {
          continue
        }
      }

      const percentDiff = (Math.abs(convertedAmount - stmt.amount) / Math.abs(stmt.amount)) * 100

      // Pick tightest percentage diff
      if (!bestMatch || percentDiff < bestMatch.percentDiff) {
        bestMatch = {
          stmtIdx: si,
          stmt,
          convertedAmount,
          rate,
          rateDate,
          percentDiff,
        }
      }
    }

    if (bestMatch) {
      usedStatements.add(bestMatch.stmtIdx)
      results.push({
        emailCandidate: email,
        statementCandidate: bestMatch.stmt,
        convertedEmailAmount: bestMatch.convertedAmount,
        rate: bestMatch.rate,
        rateDate: bestMatch.rateDate,
        percentDiff: bestMatch.percentDiff,
      })
    }
  }

  return results
}
