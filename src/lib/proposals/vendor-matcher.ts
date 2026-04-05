/**
 * Vendor Fuzzy Matching Utility (Server-Side)
 *
 * Multi-strategy vendor matching for import descriptions.
 */

import type { VendorRecord, RecentTransaction } from './types'

export interface VendorMatchResult {
  vendorId: string
  vendorName: string
  confidence: number
  reasoning: string
  alternatives: Array<{ id: string; name: string; confidence: number }>
}

/**
 * Normalize a string for comparison: lowercase, strip punctuation/special chars
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[*#@!&$%^(){}[\]<>|\\/:;'",.?`~+=_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract meaningful tokens from a string
 */
function tokenize(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((t) => t.length > 1)
}

/**
 * Compute token overlap score between two strings (0-1)
 */
function tokenOverlap(a: string, b: string): number {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)
  if (tokensA.length === 0 || tokensB.length === 0) return 0

  let matches = 0
  for (const ta of tokensA) {
    if (tokensB.some((tb) => {
      // Exact token match
      if (ta === tb) return true
      // Only allow substring containment for tokens >= 4 chars
      // to prevent short tokens like "pa" matching "payment"
      const shorter = ta.length <= tb.length ? ta : tb
      const longer = ta.length <= tb.length ? tb : ta
      return shorter.length >= 4 && longer.includes(shorter)
    })) {
      matches++
    }
  }

  return matches / Math.max(tokensA.length, tokensB.length)
}

/**
 * Simple Levenshtein distance (for short strings)
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }

  return dp[m][n]
}

/**
 * Compute Levenshtein similarity (0-1)
 */
function levenshteinSimilarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 0
  return 1 - levenshtein(na, nb) / maxLen
}

/**
 * Score a vendor against a description using multiple strategies
 */
function scoreVendor(description: string, vendorName: string): number {
  const normDesc = normalize(description)
  const normVendor = normalize(vendorName)

  // Exact containment (highest signal)
  // Guard: short vendor names (< 4 chars) must match as whole words to avoid
  // false positives (e.g. vendor "PA" matching "payment", "mpay", etc.)
  if (normVendor.length >= 4 && normDesc.includes(normVendor)) {
    return 0.9
  }
  if (normVendor.length < 4 && normVendor.length > 0) {
    const wordBoundary = new RegExp(`\\b${normVendor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (wordBoundary.test(normDesc)) {
      return 0.9
    }
  }
  if (normDesc.length >= 4 && normVendor.includes(normDesc)) {
    return 0.9
  }

  // Token overlap
  const overlap = tokenOverlap(description, vendorName)

  // Levenshtein similarity (useful for typos/abbreviations)
  const levSim = levenshteinSimilarity(description, vendorName)

  // Weighted combination
  return Math.max(overlap * 0.7 + levSim * 0.3, levSim * 0.5 + overlap * 0.5)
}

/**
 * Match an import description against known vendors.
 *
 * Returns the best match (if any) with confidence and alternatives.
 */
export function matchVendor(
  description: string,
  vendors: VendorRecord[],
  recentTransactions: RecentTransaction[]
): VendorMatchResult | null {
  if (!description.trim() || vendors.length === 0) return null

  // Strategy 1: Direct name matching against vendors
  const scored = vendors
    .map((v) => ({
      id: v.id,
      name: v.name,
      score: scoreVendor(description, v.name),
      txCount: v.transactionCount,
    }))
    .filter((v) => v.score > 0.3)
    .sort((a, b) => {
      // Sort by score first, then by transaction count as tiebreaker
      if (Math.abs(a.score - b.score) > 0.05) return b.score - a.score
      return b.txCount - a.txCount
    })

  // Strategy 2: Historical description lookup
  const historicalMatch = findHistoricalVendor(description, recentTransactions)

  // Combine results
  let best = scored[0] || null
  if (historicalMatch) {
    // If historical match is stronger, use it
    if (!best || historicalMatch.score > best.score) {
      best = historicalMatch
    }
  }

  if (!best) return null

  const confidence = Math.round(best.score * 100)
  const alternatives = scored
    .filter((v) => v.id !== best!.id)
    .slice(0, 3)
    .map((v) => ({
      id: v.id,
      name: v.name,
      confidence: Math.round(v.score * 100),
    }))

  let reasoning: string
  if (best.score >= 0.9) {
    reasoning = `Exact match: '${normalize(description)}' contains '${best.name}'`
  } else if (historicalMatch && historicalMatch.id === best.id) {
    reasoning = `Historical: similar descriptions matched to '${best.name}'`
  } else {
    reasoning = `Fuzzy match: '${description.slice(0, 30)}' -> '${best.name}' (${confidence}% similarity)`
  }

  return {
    vendorId: best.id,
    vendorName: best.name,
    confidence,
    reasoning,
    alternatives,
  }
}

/**
 * Find vendor from historical transactions with similar descriptions
 */
function findHistoricalVendor(
  description: string,
  transactions: RecentTransaction[]
): { id: string; name: string; score: number; txCount: number } | null {
  if (transactions.length === 0) return null

  // Find transactions with similar descriptions
  const matches = transactions
    .filter((tx) => tx.vendorId && tx.vendorName)
    .map((tx) => ({
      vendorId: tx.vendorId!,
      vendorName: tx.vendorName!,
      score: scoreVendor(description, tx.description),
    }))
    .filter((m) => m.score > 0.4)

  if (matches.length === 0) return null

  // Count vendor frequency among matches
  const vendorCounts = new Map<string, { name: string; count: number; maxScore: number }>()
  for (const m of matches) {
    const existing = vendorCounts.get(m.vendorId)
    if (existing) {
      existing.count++
      existing.maxScore = Math.max(existing.maxScore, m.score)
    } else {
      vendorCounts.set(m.vendorId, { name: m.vendorName, count: 1, maxScore: m.score })
    }
  }

  // Take the most common vendor
  let bestVendor: { id: string; name: string; score: number; txCount: number } | null = null
  for (const [id, data] of vendorCounts) {
    const combinedScore = data.maxScore * 0.6 + Math.min(data.count / 5, 1) * 0.4
    if (!bestVendor || combinedScore > bestVendor.score) {
      bestVendor = { id, name: data.name, score: combinedScore, txCount: data.count }
    }
  }

  return bestVendor
}

/**
 * Suggest a clean vendor name from a cryptic statement description
 */
export function suggestVendorName(description: string): string {
  let cleaned = description
    // Remove common prefixes (card transaction indicators)
    .replace(/^(SQ\s*\*|TST\s*\*|AMZN\s*\*|PAYPAL\s*\*)/i, '')
    // Remove trailing reference numbers
    .replace(/\s+\d{4,}.*$/, '')
    // Remove dates
    .replace(/\s+\d{1,2}\/\d{1,2}\s*$/, '')
    // Remove city/state suffixes
    .replace(/\s+(US|CA|NY|TX|FL|IL)\s*$/i, '')
    // Clean up
    .replace(/[*#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Title case
  cleaned = cleaned
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return cleaned || description
}
