/**
 * Choosing the transaction a payment slip belongs to.
 *
 * The previous rule walked the candidate rows in whatever order Postgres
 * returned them and took the first whose amount matched, computing
 * "is the date exact?" only to pick a confidence number. It never *preferred*
 * the same-day row. With a recurring amount that is a coin flip: IMG_1345, a
 * ฿65 payment on 2026-02-10, bound to the 2026-02-11 ฿65 coffee while the
 * correct 2026-02-10 row sat in the same candidate list — reported at high
 * confidence, on a slip nobody had reviewed.
 *
 * Ranking is explicit here, and a genuine tie is left unmatched rather than
 * guessed. A wrong link is worse than no link: it silently attaches money to
 * the wrong day, whereas an unmatched slip simply stays in the review queue.
 */

/** Amounts within this differ only by rounding. */
export const AMOUNT_TOLERANCE = 0.01

/** How far from the slip's own date a transaction may sit and still match. */
export const MAX_DAY_DISTANCE = 1

export const CONFIDENCE_EXACT_DATE = 95
export const CONFIDENCE_ADJACENT_DATE = 85
/**
 * A tie broken only by "the other candidate is already spoken for". Real, but
 * inferred from bookkeeping rather than from the slip, so it stays below the
 * auto-approve threshold and lands in the review queue.
 */
export const CONFIDENCE_DISAMBIGUATED = 70

export interface MatchCandidate {
  id: string
  amount: number | string
  transaction_date: string
}

export type MatchReason =
  | 'exact_date'
  | 'adjacent_date'
  | 'disambiguated_by_existing_link'
  | 'ambiguous'
  | 'no_candidate'

export interface MatchSelection {
  transactionId: string | null
  confidence: number | null
  reason: MatchReason
  /** Candidates that tied, when the choice was left to a human. */
  tiedTransactionIds?: string[]
}

/** Whole days between two ISO (YYYY-MM-DD) dates, ignoring time and zone. */
export function dayDistance(a: string, b: string): number {
  const parse = (d: string) => {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number)
    return Date.UTC(y, (m || 1) - 1, day || 1)
  }
  return Math.abs(Math.round((parse(a) - parse(b)) / 86_400_000))
}

/**
 * Pick the transaction a slip belongs to, or nothing.
 *
 * Candidates are ranked by distance from the slip's date, so a same-day row
 * always beats an adjacent-day row regardless of query order. Within the best
 * tier, a single candidate matches; several candidates are a tie, and a tie is
 * only broken when exactly one of them is not already linked to another slip.
 */
export function selectTransactionMatch(
  candidates: MatchCandidate[],
  slip: { amount: number; date: string },
  linkedTransactionIds: ReadonlySet<string> = new Set()
): MatchSelection {
  if (!slip.amount || !slip.date || candidates.length === 0) {
    return { transactionId: null, confidence: null, reason: 'no_candidate' }
  }

  const viable = candidates
    .filter((c) => Math.abs(Number(c.amount) - slip.amount) < AMOUNT_TOLERANCE)
    .map((c) => ({ candidate: c, distance: dayDistance(c.transaction_date, slip.date) }))
    .filter((c) => c.distance <= MAX_DAY_DISTANCE)

  if (viable.length === 0) {
    return { transactionId: null, confidence: null, reason: 'no_candidate' }
  }

  const bestDistance = Math.min(...viable.map((v) => v.distance))
  const tier = viable.filter((v) => v.distance === bestDistance)
  const baseConfidence = bestDistance === 0 ? CONFIDENCE_EXACT_DATE : CONFIDENCE_ADJACENT_DATE

  if (tier.length === 1) {
    return {
      transactionId: tier[0].candidate.id,
      confidence: baseConfidence,
      reason: bestDistance === 0 ? 'exact_date' : 'adjacent_date',
    }
  }

  // Several equally-good candidates. A transaction already claimed by another
  // slip is not available, so if that leaves exactly one, the choice is made.
  const unclaimed = tier.filter((v) => !linkedTransactionIds.has(v.candidate.id))
  if (unclaimed.length === 1) {
    return {
      transactionId: unclaimed[0].candidate.id,
      confidence: CONFIDENCE_DISAMBIGUATED,
      reason: 'disambiguated_by_existing_link',
    }
  }

  return {
    transactionId: null,
    confidence: null,
    reason: 'ambiguous',
    tiedTransactionIds: tier.map((v) => v.candidate.id).sort(),
  }
}

/** Warning shown when a slip could belong to more than one transaction. */
export function ambiguousMatchWarning(selection: MatchSelection, amount: number): string {
  const count = selection.tiedTransactionIds?.length ?? 0
  return `Not auto-linked: ${count} transactions of ${amount} THB sit within a day of this slip, so the correct one is ambiguous — link it manually.`
}
