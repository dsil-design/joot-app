/**
 * Vendor Fuzzy Matching Utility (Server-Side)
 *
 * Multi-strategy vendor matching for import descriptions.
 *
 * Guard rails (added after an audit found confident false positives like
 * `AUTOMATIC PAYMENT - THANK YOU` → "Thank You Cafe" and
 * `TST* FOXTAIL COFFEE` → a person named Nidnoi):
 *
 * - Descriptors are cleaned with the shared merchant normalizer first
 *   (processor prefixes, store numbers, city/state suffixes, airport codes).
 * - Generic tokens (payment words, bank names, place names, meal-category
 *   words) are stopworded out before scoring — they cannot carry a match.
 * - A match must share at least one DISTINCTIVE token; raw edit distance on
 *   short merchant strings matches coincidental character overlap and may
 *   never establish a match on its own.
 * - Nothing matches on a bare substring any more, at either level: containment
 *   is whole-token, and two tokens meet only outright. A second audit over the
 *   real vendor_name_raw corpus found `HEALTHLINK CO.,LTD.` → "Link",
 *   `American Express` → "Eric", `HomePro Online Shopping` → "Hopp",
 *   `MoonPay` → "Moon", all at 0.87–0.9.
 * - Exact name equality outranks containment, so the most specific vendor
 *   wins: "Grab Taxi" beats "Grab", "Xfinity" beats "Xfinity Live".
 * - The fuzzy tier needs real token overlap, not just one shared word plus a
 *   flattering edit distance ("Turkish Airlines" → "United Airlines").
 * - The admission floor is 0.55 (was 0.3). Below it we propose a cleaned
 *   NEW vendor name instead: a blank is recoverable, but a wrong vendor
 *   corrupts the history later proposals learn from.
 */

import { cleanMerchantDescriptor } from '@/lib/matching/vendor-matcher'
import type { VendorRecord, RecentTransaction } from './types'

export interface VendorMatchResult {
  vendorId: string
  vendorName: string
  confidence: number
  reasoning: string
  alternatives: Array<{ id: string; name: string; confidence: number }>
}

/** Minimum blended score for a candidate to be admitted at all. */
const ADMISSION_FLOOR = 0.55

/**
 * Score tiers. EXACT clears CONTAINMENT by more than the 0.05 tolerance the
 * candidate sort treats as a tie, so an exactly-named vendor always wins
 * outright rather than falling through to the transaction-count tiebreak.
 */
const EXACT_SCORE = 0.98
const CONTAINMENT_SCORE = 0.9

/**
 * Minimum distinctive-token overlap for the fuzzy tier. Below it the two names
 * agree on one word and disagree on the rest — "American Express" vs "Kerry
 * Express", "Turkish Airlines" vs "United Airlines", "Jennifer Siller" vs
 * "Jennifer Stewart" — which is a different entity, not a typo.
 *
 * Swept against both live corpora before being set here. At 0.6 it drops five
 * matches on the email corpus, all five wrong, and costs nothing on the 168
 * statement rows whose linked transaction gives a known-correct vendor. Going
 * further to 0.67 buys one more (`Provincial Electricity Authority` vs the
 * waterworks) but loses two real matches, `BEST WINE CHIANGMAI` → "Best Wine
 * and Spirit" and `TELLO MOBILE TELLO.COM GA` → "My Tello".
 */
const FUZZY_OVERLAP_FLOOR = 0.6

/**
 * Tokens that must never carry a vendor match on their own: transaction
 * phrasing, bank/processor names, geography, and the meal/category prefixes
 * from Joot's description conventions ("Coffee: X", "Dinner: Y").
 */
const GENERIC_TOKENS = new Set([
  // transaction phrasing
  'payment', 'payments', 'automatic', 'autopay', 'thank', 'you', 'trf', 'pos', 'atm',
  'transfer', 'promptpay', 'purchase', 'debit', 'credit', 'card', 'direct', 'online',
  'bill', 'fee', 'from', 'to', 'mr', 'mrs', 'ms', 'miss', 'co', 'ltd', 'inc', 'llc',
  'the', 'and', 'www', 'com', 'http', 'https', 'store', 'shop',
  // banks / processors
  'kbank', 'kasikorn', 'scb', 'ktb', 'bbl', 'krungthai', 'krungsri', 'chase', 'pnc',
  'amex', 'visa', 'mastercard', 'paypal', 'wise', 'bank',
  // geography (statement suffixes)
  'bangkok', 'chiangmai', 'chiangma', 'chiang', 'mai', 'nana', 'nonthaburi', 'lamphun', 'phuket', 'thailand',
  'venice', 'ellenton', 'sarasota', 'kissimmee', 'orlando', 'tampa', 'mississauga',
  'toronto', 'florida',
  // category words from description conventions
  'coffee', 'breakfast', 'lunch', 'dinner', 'meal', 'taxi', 'groceries', 'grocery',
  'rent', 'massage', 'hotel', 'flight', 'cleaning', 'service', 'monthly', 'weekly',
  // category nouns that appear inside the legal entity names Thai bank emails
  // carry ("(A/C Name: PRANAKORN FOOD CO.,LTD.)") and inside statement
  // descriptors ("SCT-SUANPLGRN MARKET BANGKOK") — a vendor named only "Food"
  // / "House" / "Restaurant" / "Market" may not claim those rows
  'food', 'foods', 'restaurant', 'house', 'home', 'market',
])

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
 * Tokens that are allowed to carry a match: not generic, not pure digits.
 */
function distinctiveTokens(s: string): string[] {
  return tokenize(s).filter((t) => !GENERIC_TOKENS.has(t) && !/^\d+$/.test(t))
}

/**
 * Fold a token to its comparison form: a trailing "s" is dropped so plurals
 * and normalized possessives still meet ("mcdonalds" = "mcdonald" from
 * "McDonald's", "foods" = "food").
 */
function foldToken(t: string): string {
  return t.length >= 4 && t.endsWith('s') ? t.slice(0, -1) : t
}

/**
 * Tokens match only outright (modulo a trailing "s"). Substring containment
 * used to count here — that is what let "link" carry `HEALTHLINK`, "eric"
 * carry `American Express`, "hopp" carry `HomePro Online Shopping`, and
 * "moon" carry `MoonPay`. Across the real vendor_name_raw corpus it bought
 * exactly one true match and a dozen coincidences, so it is gone; a merchant
 * whose name merely concatenates a known brand now falls through to a NEW
 * vendor suggestion instead of being filed under the wrong one.
 */
function tokensShare(ta: string, tb: string): boolean {
  return foldToken(ta) === foldToken(tb)
}

/**
 * True when the two strings share at least one distinctive token — the
 * precondition for any fuzzy match.
 */
function sharesDistinctiveToken(a: string, b: string): boolean {
  const tokensA = distinctiveTokens(a)
  const tokensB = distinctiveTokens(b)
  return tokensA.some((ta) => tokensB.some((tb) => tokensShare(ta, tb)))
}

/**
 * Compute token overlap score between two strings (0-1), over distinctive
 * tokens only — generic tokens neither help nor hurt.
 */
function tokenOverlap(a: string, b: string): number {
  const tokensA = distinctiveTokens(a)
  const tokensB = distinctiveTokens(b)
  if (tokensA.length === 0 || tokensB.length === 0) return 0

  let matches = 0
  for (const ta of tokensA) {
    if (tokensB.some((tb) => tokensShare(ta, tb))) {
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

interface VendorScore {
  score: number
  /**
   * Length of the vendor name that matched verbatim, 0 for fuzzy matches.
   * Breaks ties between equally-scored candidates so the most specific name
   * wins: "Juneko House" over "House", "GrabFood" over "Grab".
   */
  specificity: number
}

const NO_MATCH: VendorScore = { score: 0, specificity: 0 }

/**
 * Score a vendor against a description using multiple strategies
 */
function scoreVendor(description: string, vendorName: string): VendorScore {
  // Strip processor prefixes, store numbers, and location suffixes before
  // scoring — `WM SUPERCENTER #769 VENICE FL` should score as `WM SUPERCENTER`
  const cleanedDesc = cleanMerchantDescriptor(description)
  const normDesc = normalize(cleanedDesc)
  const normVendor = normalize(vendorName)
  if (!normDesc || !normVendor) return NO_MATCH

  // Same name (ignoring spacing) — the strongest signal there is, and the only
  // one strong enough to stand without a distinctive token: `WAL-MART #0769
  // VENICE FL` → "Walmart". Ranked above containment so the most specific
  // vendor wins the row: "Grab Taxi" over "Grab", "Xfinity" over "Xfinity Live".
  if (normDesc === normVendor || normDesc.replace(/ /g, '') === normVendor.replace(/ /g, '')) {
    return { score: EXACT_SCORE, specificity: normVendor.length }
  }

  // No shared distinctive token → no match, whatever the edit distance says.
  // Levenshtein on short merchant strings rewards coincidental character
  // overlap ("AWN(1201 CENTRAL CHIANGMA" once matched the city "Chiangmai").
  if (!sharesDistinctiveToken(cleanedDesc, vendorName)) {
    return NO_MATCH
  }

  // Whole-token containment. Both sides are space-padded so a vendor name can
  // only match on token boundaries — " link " is not inside " healthlink ",
  // " eric " is not inside " american express ", " hopp " is not inside
  // " homepro online shopping ". Raw substring containment scored all three at
  // 0.9 and short-circuited every guard below.
  if (` ${normDesc} `.includes(` ${normVendor} `)) {
    return { score: CONTAINMENT_SCORE, specificity: normVendor.length }
  }

  // A description contained in a LONGER vendor name gets no containment credit:
  // the vendor is more specific than the row, and its extra tokens are
  // unexplained ("Citizens Bank" is not "Citizens Bank Park"). Such pairs fall
  // through to the fuzzy blend below, which prices the unmatched tokens in.

  // Token overlap over distinctive tokens
  const overlap = tokenOverlap(cleanedDesc, vendorName)

  // One shared word against several unshared ones is a different entity, not a
  // near-miss on the same one — no edit distance may rescue it.
  if (overlap < FUZZY_OVERLAP_FLOOR) return NO_MATCH

  // Levenshtein similarity (useful for typos/abbreviations) — capped as a
  // secondary signal; it can support a token match, never establish one
  const levSim = levenshteinSimilarity(cleanedDesc, vendorName)

  // Weighted combination
  return {
    score: Math.max(overlap * 0.7 + levSim * 0.3, levSim * 0.5 + overlap * 0.5),
    specificity: 0,
  }
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
      ...scoreVendor(description, v.name),
      txCount: v.transactionCount,
    }))
    .filter((v) => v.score >= ADMISSION_FLOOR)
    .sort((a, b) => {
      // Score first, then the more specific name (so "Rally House" beats
      // "House" on the same row), then transaction count
      if (Math.abs(a.score - b.score) > 0.05) return b.score - a.score
      if (a.specificity !== b.specificity) return b.specificity - a.specificity
      return b.txCount - a.txCount
    })

  // Strategy 2: Historical description lookup
  const historicalMatch = findHistoricalVendor(description, recentTransactions)

  // Combine results
  let best: { id: string; name: string; score: number; txCount: number } | null = scored[0] || null
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
  if (best.score >= EXACT_SCORE) {
    reasoning = `Exact match: '${normalize(description)}' is '${best.name}'`
  } else if (best.score >= CONTAINMENT_SCORE) {
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

  // Find transactions with similar descriptions. scoreVendor requires a
  // shared distinctive token, so category words ("Coffee: …", "Dinner: …")
  // can no longer chain a merchant to an unrelated vendor's history.
  const matches = transactions
    .filter((tx) => tx.vendorId && tx.vendorName)
    .map((tx) => ({
      vendorId: tx.vendorId!,
      vendorName: tx.vendorName!,
      score: scoreVendor(description, tx.description).score,
    }))
    .filter((m) => m.score >= ADMISSION_FLOOR)

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
 * Suggest a clean vendor name from a cryptic statement description.
 * Uses the same shared merchant cleanup as matching, so the suggested name
 * for `WAL-MART #0769 VENICE FL` is "Wal-Mart", not "Wal-Mart 0769 Venice".
 */
export function suggestVendorName(description: string): string {
  let cleaned = cleanMerchantDescriptor(description)
    // Remove trailing reference numbers
    .replace(/\s+\d{4,}.*$/, '')
    // Remove dates
    .replace(/\s+\d{1,2}\/\d{1,2}\s*$/, '')
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
