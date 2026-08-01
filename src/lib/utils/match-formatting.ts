/**
 * Formatting utilities for match cards and transaction comparisons.
 *
 * Pure functions — no JSX, no side effects.
 */

/**
 * Format a monetary amount for display.
 * Always uses absolute value — sign handling is the caller's responsibility.
 */
export function formatMatchAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

/**
 * Format a date string as "Mon DD, YYYY" (e.g. "Jan 3, 2025").
 * Falls back to the raw string on parse failure.
 */
export function formatMatchDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

export interface MatchDeltas {
  dateDelta: string
  amountDelta: string
}

/**
 * Compute human-readable delta strings between statement and matched transaction.
 *
 * `matchedCurrency` is required to compare amounts at all. Without it this
 * subtracted the two numbers regardless of denomination and labelled the
 * result with the statement's currency symbol — a THB 139 transaction against
 * a USD 4.27 statement row rendered as "+$134.73 diff", which reads as a
 * near-$135 discrepancy when the two figures simply aren't comparable.
 */
export function computeMatchDeltas(
  statementDate: string,
  statementAmount: number,
  statementCurrency: string,
  matchedDate: string,
  matchedAmount: number,
  matchedCurrency?: string
): MatchDeltas {
  const stmtDate = new Date(statementDate)
  const mDate = new Date(matchedDate)
  const dayDiff = Math.round(
    (mDate.getTime() - stmtDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  let dateDelta: string
  if (dayDiff === 0) dateDelta = "(same day)"
  else if (dayDiff > 0)
    dateDelta = `(+${dayDiff} day${dayDiff > 1 ? "s" : ""})`
  else dateDelta = `(${dayDiff} day${dayDiff < -1 ? "s" : ""})`

  let amountDelta: string
  const sameCurrency =
    !matchedCurrency ||
    matchedCurrency.toUpperCase() === statementCurrency.toUpperCase()

  if (!sameCurrency) {
    // Different denominations: state that plainly rather than inventing a
    // difference. Converting here would need an FX rate the caller doesn't have.
    amountDelta = `(vs ${formatMatchAmount(statementAmount, statementCurrency)} on statement)`
  } else {
    const amountDiff = Math.abs(matchedAmount) - Math.abs(statementAmount)
    if (Math.abs(amountDiff) < 0.01) {
      amountDelta = "(exact)"
    } else {
      const sign = amountDiff > 0 ? "+" : ""
      amountDelta = `(${sign}${formatMatchAmount(amountDiff, statementCurrency)} diff)`
    }
  }

  return { dateDelta, amountDelta }
}
