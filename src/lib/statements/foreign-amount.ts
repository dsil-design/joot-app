/**
 * Validity of a statement row's printed foreign-currency block.
 *
 * Chase prints the original foreign amount and the network's exchange rate on
 * the lines following a foreign charge. The parser scans the next few lines to
 * find them, which means it can attach the *next* row's block to a US-domestic
 * charge that has none of its own — and the true owner keeps its copy, so the
 * duplicate is pure fabrication.
 *
 * Measured over 328 stored blocks: 306 reconcile to within 0.002%, 22 are off
 * by 11% or more, and nothing falls in between. Examples of the fabricated kind:
 * a $100 "ANTHROPIC* CLAUDE SUB" carrying 11,021 THB (which belongs to the
 * "AMERICAN INTERNATIONAL BANGKOK" row on the following line), and a $7.42
 * Google Workspace charge carrying 7,240 THB — a 2,897% error.
 *
 * These are not cosmetic. The cross-source pairer treats a printed foreign
 * amount as an authoritative same-currency signal and gives it a ranking bonus
 * over genuinely FX-converted candidates, so a fabricated block wins matches it
 * should lose; the review card also renders it to the user as fact.
 */

/**
 * Widest relative error still accepted as a real block.
 *
 * The observed gap is enormous — worst genuine block 0.002%, mildest fabricated
 * one 11.3% — so any threshold in between separates them perfectly. 2% sits
 * ~1000x above the worst real block and ~5x below the mildest fake, which
 * leaves room for a future layout that prints a rate against a fee-inclusive
 * total without letting a copied block through.
 */
export const FOREIGN_AMOUNT_TOLERANCE = 0.02

/**
 * True when `originalAmount x exchangeRate` reproduces the row's settled amount,
 * i.e. the printed block actually belongs to this row.
 *
 * Returns true when the check cannot be performed (missing rate, zero amounts)
 * rather than rejecting: the guard exists to catch provable fabrication, not to
 * discard blocks it merely cannot verify.
 */
export function foreignBlockReconciles(input: {
  rowAmount: number | null | undefined
  originalAmount: number | null | undefined
  exchangeRate: number | null | undefined
}): boolean {
  const row = Math.abs(Number(input.rowAmount))
  const original = Number(input.originalAmount)
  const rate = Number(input.exchangeRate)

  if (!Number.isFinite(row) || row === 0) return true
  if (!Number.isFinite(original) || !Number.isFinite(rate) || rate === 0) return true

  const implied = original * rate
  return Math.abs(implied - row) / row <= FOREIGN_AMOUNT_TOLERANCE
}
