/**
 * Direction agreement between a statement row and a Joot transaction.
 *
 * Money in and money out cannot be the same payment. This was the second of the
 * two blind spots that let the review queue present wrong matches confidently:
 * the statement matcher compared `Math.abs()` on both sides, so an incoming ฿500
 * credit matched an outgoing ฿500 "Caddy Tip" at 95% confidence.
 *
 * Lives in one module because three separate hand-rolled matchers already exist
 * (statement processing, the re-match route, the slip backfill) and they have
 * already drifted apart on exactly this kind of guard. Anything that decides
 * direction should call this rather than reimplementing it.
 */
import { isInterAccountTransferDescription } from './transfer-descriptions'

export type MoneyDirection = 'in' | 'out'

/**
 * Direction implied by the parser's own row type.
 *
 * Read the type, never the sign of `amount`: statements extracted before the PNC
 * sign fix carry a rotted sign alongside a correct type, so a sign-based reading
 * rejects links that are in fact correct.
 *
 * Returns null for types whose direction depends on the account kind ('payment'
 * is a credit on a card but a debit on the funding account) or that are
 * inherently ambiguous ('interest' may be charged or earned, 'adjustment' can go
 * either way). Null means "cannot prove a direction" and must never be treated
 * as a conflict.
 */
export function statementRowDirection(
  rowType: string | null | undefined
): MoneyDirection | null {
  switch (rowType) {
    case 'charge':
    case 'fee':
      return 'out'
    case 'credit':
      return 'in'
    default:
      return null
  }
}

/**
 * Direction implied by a transaction's type. 'transfer' returns null because
 * either leg of a transfer is legitimate.
 */
export function transactionDirection(
  transactionType: string | null | undefined
): MoneyDirection | null {
  switch (transactionType) {
    case 'income':
      return 'in'
    case 'expense':
      return 'out'
    default:
      return null
  }
}

/**
 * True when a statement row and a transaction provably describe opposite
 * movements of money, and so cannot be the same payment.
 *
 * Conservative by construction — it only reports a conflict when BOTH sides
 * resolve to a definite direction. Everything ambiguous is left alone.
 *
 * The inter-account carve-out matters: a transfer between two accounts the user
 * owns is booked once, on the funding side, so the receiving row's direction
 * legitimately disagrees with the transaction's `expense` type. Measured against
 * live data this exempts exactly the `Online Transfer From XXXX…` rows that pair
 * with the user's own account-to-account transfers — 1.4% of statement rows, and
 * none of the Thai everyday-transfer wording ("TRF. PROMPTPAY", "TRF FR OTH BK")
 * where the collisions actually live.
 */
export function hasDirectionConflict(input: {
  rowType: string | null | undefined
  rowDescription: string | null | undefined
  transactionType: string | null | undefined
}): boolean {
  const rowDirection = statementRowDirection(input.rowType)
  const txDirection = transactionDirection(input.transactionType)
  if (!rowDirection || !txDirection) return false
  if (rowDirection === txDirection) return false
  return !isInterAccountTransferDescription(input.rowDescription)
}
