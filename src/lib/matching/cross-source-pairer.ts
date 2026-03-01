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

      // Skip same-currency pairs — different matching concern
      if (email.currency.toUpperCase() === stmt.currency.toUpperCase()) continue

      // Check date proximity
      const daysDiff = calculateDaysDiff(email.date, stmt.date)
      if (daysDiff > maxDaysDiff) continue

      // Convert email amount to statement currency
      const conversion = await convertAmount(
        supabase,
        email.amount,
        email.currency,
        stmt.currency,
        email.date
      )
      if (!conversion) continue

      // Check amount tolerance
      if (!isWithinConversionTolerance(email.amount, conversion.convertedAmount, stmt.amount, tolerance)) {
        continue
      }

      const percentDiff = (Math.abs(conversion.convertedAmount - stmt.amount) / Math.abs(stmt.amount)) * 100

      // Pick tightest percentage diff
      if (!bestMatch || percentDiff < bestMatch.percentDiff) {
        bestMatch = {
          stmtIdx: si,
          stmt,
          convertedAmount: conversion.convertedAmount,
          rate: conversion.rate,
          rateDate: conversion.rateDate,
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
