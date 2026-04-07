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
  /** For email candidates: statement-suggestion composite keys (`${statementId}:${index}`) this email has been rejected from pairing with */
  rejectedPairKeys?: string[]
  /**
   * For statement candidates only: the original foreign-currency amount the
   * merchant billed, when the statement settled in a different currency.
   * Currently populated by the Chase parser, which prints the original
   * THB/VND amount + Visa exchange rate next to each foreign charge.
   * When present, the cross-source pairer treats `foreignAmount` in
   * `foreignCurrency` as a same-currency direct-match signal against email
   * candidates in that currency — much stronger than FX-converting the email.
   */
  foreignAmount?: number
  foreignCurrency?: string
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
  /**
   * True when the match was made by comparing the email amount directly
   * against `statementCandidate.foreignAmount` (a parser-supplied original
   * foreign-currency amount, e.g. from Chase). This is a stronger signal than
   * an FX-converted match because the rate is the issuing network's actual
   * rate at settlement, not a separately-sourced approximation.
   */
  usedForeignAmountSignal?: boolean
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
      usedForeignSignal: boolean
    } | null = null

    const rejectedKeys = email.rejectedPairKeys && email.rejectedPairKeys.length > 0
      ? new Set(email.rejectedPairKeys)
      : null

    for (let si = 0; si < statementCandidates.length; si++) {
      if (usedStatements.has(si)) continue

      const stmt = statementCandidates[si]

      // Skip pairs the user has previously rejected for this email
      if (rejectedKeys && stmt.statementId !== undefined && stmt.statementIndex !== undefined) {
        if (rejectedKeys.has(`${stmt.statementId}:${stmt.statementIndex}`)) continue
      }
      const from = email.currency.toUpperCase()
      const to = stmt.currency.toUpperCase()
      const stmtForeignCurrency = stmt.foreignCurrency?.toUpperCase()

      // Check date proximity
      const daysDiff = calculateDaysDiff(email.date, stmt.date)
      if (daysDiff > maxDaysDiff) continue

      let convertedAmount: number
      let rate: number
      let rateDate: string
      // Track whether this match used the parser-supplied foreign amount
      // (a much stronger signal than FX-converting through exchange_rates).
      let usedForeignSignal = false
      let comparisonStmtAmount = stmt.amount

      if (from === to) {
        // Same-currency: direct comparison, no exchange rate needed
        convertedAmount = email.amount
        rate = 1
        rateDate = email.date
        // For same-currency, require amounts within tolerance % directly
        const directPercentDiff = stmt.amount === 0 ? (email.amount === 0 ? 0 : 100)
          : (Math.abs(email.amount - stmt.amount) / Math.abs(stmt.amount)) * 100
        if (directPercentDiff > tolerance) continue
      } else if (
        stmt.foreignAmount !== undefined &&
        stmtForeignCurrency === from
      ) {
        // The statement carries the original foreign-currency amount
        // (e.g. Chase printed "1,250 THB X 0.032 EXCHG RATE" for this charge)
        // and the email is in that same currency. Compare directly against
        // the foreign amount instead of FX-converting through our own
        // exchange_rates table — this avoids stale-rate noise and gives an
        // exact-match signal sourced straight from Visa.
        convertedAmount = email.amount
        rate = stmt.foreignAmount === 0 ? 1 : stmt.amount / stmt.foreignAmount
        rateDate = stmt.date
        comparisonStmtAmount = stmt.foreignAmount
        usedForeignSignal = true
        const directPercentDiff =
          stmt.foreignAmount === 0
            ? email.amount === 0
              ? 0
              : 100
            : (Math.abs(email.amount - stmt.foreignAmount) /
                Math.abs(stmt.foreignAmount)) *
              100
        if (directPercentDiff > tolerance) continue
      } else {
        // Cross-currency fallback: look up pre-fetched rate from our own
        // exchange_rates table and FX-convert the email.
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

      const percentDiff =
        comparisonStmtAmount === 0
          ? convertedAmount === 0
            ? 0
            : 100
          : (Math.abs(convertedAmount - comparisonStmtAmount) /
              Math.abs(comparisonStmtAmount)) *
            100

      // Bias selection toward foreign-amount-based matches when present:
      // give them an effective tightness bonus so they win against a
      // marginally-tighter FX-converted candidate. This reflects that the
      // foreign-amount signal is more authoritative.
      const _percentDiffForRanking = usedForeignSignal
        ? percentDiff - 0.5
        : percentDiff

      // Pick tightest percentage diff (using ranking-adjusted value so that
      // foreign-amount-sourced matches outrank marginally tighter FX matches).
      const currentBestRanking = bestMatch
        ? (bestMatch.usedForeignSignal ? bestMatch.percentDiff - 0.5 : bestMatch.percentDiff)
        : Infinity
      if (!bestMatch || _percentDiffForRanking < currentBestRanking) {
        bestMatch = {
          stmtIdx: si,
          stmt,
          convertedAmount,
          rate,
          rateDate,
          percentDiff,
          usedForeignSignal,
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
        usedForeignAmountSignal: bestMatch.usedForeignSignal,
      })
    }
  }

  return results
}
