/**
 * Vendor pre-fill for review dialogs (client-side)
 *
 * The review dialogs fill a vendor before any proposal exists, from whatever
 * the parsed sources already say. They can't use the proposal engine's vendor
 * matcher directly — that scores against the user's *whole* vendor list, which
 * the browser doesn't hold — so they first fetch candidates with a substring
 * search and then score those.
 *
 * That candidate step is where every Amazon receipt was losing its vendor:
 * the Amazon parser stores `vendor_name_raw = "Amazon.com"`, the vendor record
 * is named "Amazon", and `name ILIKE '%Amazon.com%'` matches nothing. The
 * dialog then had no candidates to score, so a 90%-confidence match never got
 * the chance to happen and the field rendered blank.
 *
 * So: derive several search queries per signal (the raw name, its cleaned
 * merchant form, and its distinctive word tokens), pool the results, and score
 * once with the same matcher the proposal engine uses.
 */

import { cleanMerchantDescriptor } from '@/lib/matching/vendor-matcher'
import { matchVendor } from './vendor-matcher'

/** Minimum score to accept an automatic pre-fill. Below this, leave it blank:
 *  an empty field costs a click, a wrong vendor corrupts the history that
 *  later proposals learn from. */
export const VENDOR_PREFILL_MIN_CONFIDENCE = 70

/**
 * Word-level tokens that identify nothing on their own and would drag in
 * unrelated vendors as candidates ("com" would match "Comcast").
 */
const NON_IDENTIFYING_TOKENS = new Set([
  'com', 'net', 'org', 'www', 'http', 'https', 'co', 'th', 'inc', 'llc', 'ltd',
  'the', 'and', 'for', 'shop', 'store', 'online', 'payment', 'purchase', 'order',
  'bill', 'pay', 'mktpl', 'marketplace', 'amzn',
])

const MAX_QUERIES = 6

/**
 * Search strings to try for one signal, most specific first.
 *
 * "Amazon.com"                        → ["Amazon.com", "Amazon"]
 * "AMAZON MKTPL*BV3AR0KY1 Amzn.com/bill WA" → ["Amazon Mktpl", "AMAZON", ...]
 */
export function buildVendorSearchQueries(signal: string): string[] {
  const raw = signal.trim()
  if (!raw) return []

  const queries: string[] = [raw]

  const cleaned = cleanMerchantDescriptor(raw).trim()
  if (cleaned && cleaned.toLowerCase() !== raw.toLowerCase()) queries.push(cleaned)

  // Split on anything that isn't a letter or digit, so "Amazon.com" yields
  // "Amazon" — the whitespace-only split that used to run here did not.
  const tokens = `${raw} ${cleaned}`
    .split(/[^A-Za-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !NON_IDENTIFYING_TOKENS.has(t.toLowerCase()) && !/^\d+$/.test(t))
    // Longer tokens are more identifying than shorter ones.
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)

  queries.push(...tokens)

  const seen = new Set<string>()
  return queries.filter((q) => {
    const key = q.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, MAX_QUERIES)
}

export interface VendorPrefillSignals {
  /** Vendor name the email parser extracted, e.g. "Amazon.com". */
  vendorNameRaw?: string
  /** Display name on the email, e.g. "Amazon.com". */
  fromName?: string
  /** The statement line's own merchant descriptor. */
  statementDescription?: string
}

export interface VendorPrefillResult {
  id: string
  name: string
  confidence: number
  reasoning: string
}

type VendorSearchFn = (
  query: string,
  limit?: number
) => Promise<Array<{ id: string; name: string }>>

/**
 * Resolve a vendor from the signals a queue item carries.
 *
 * Signals are tried in order of how directly they name a merchant; the first
 * one that produces a confident match wins. All of them contribute candidates,
 * so a statement descriptor can supply the vendor record that the email's
 * extracted name then matches against.
 */
export async function resolveVendorFromSignals(
  signals: VendorPrefillSignals,
  searchVendors: VendorSearchFn,
  minConfidence: number = VENDOR_PREFILL_MIN_CONFIDENCE
): Promise<VendorPrefillResult | null> {
  const ordered: Array<{ label: string; value: string }> = [
    { label: 'receipt vendor', value: signals.vendorNameRaw ?? '' },
    { label: 'email sender', value: signals.fromName ?? '' },
    { label: 'statement descriptor', value: signals.statementDescription ?? '' },
  ].filter((s) => s.value.trim().length > 0)

  if (ordered.length === 0) return null

  const queries = new Set<string>()
  for (const signal of ordered) {
    for (const q of buildVendorSearchQueries(signal.value)) queries.add(q)
  }

  const candidates = new Map<string, { id: string; name: string; transactionCount: number }>()
  const results = await Promise.all(
    Array.from(queries).map((q) => searchVendors(q, 10).catch(() => []))
  )
  for (const list of results) {
    for (const v of list) candidates.set(v.id, { id: v.id, name: v.name, transactionCount: 0 })
  }
  if (candidates.size === 0) return null

  const pool = Array.from(candidates.values())

  for (const signal of ordered) {
    const match = matchVendor(signal.value, pool, [])
    if (match && match.confidence >= minConfidence) {
      return {
        id: match.vendorId,
        name: match.vendorName,
        confidence: match.confidence,
        reasoning: `Matched ${signal.label} "${signal.value.slice(0, 40)}" → ${match.vendorName}`,
      }
    }
  }

  return null
}
