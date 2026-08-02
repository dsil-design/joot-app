/**
 * Card-payment / autopay description recognition.
 *
 * A credit-card payment appears twice in the evidence: once on the card
 * (money reducing the balance) and once on the funding bank account (money
 * leaving). Neither leg is income or expense — together they are one
 * transfer between the user's own accounts.
 *
 * Both the rule engine (to type the row) and the self-transfer detector (to
 * pair the two legs) need to recognise this text, so the patterns live here
 * rather than being duplicated.
 */

/**
 * Phrases that identify a row as one leg of a credit-card payment.
 *
 * Deliberately narrow: each phrase is a full banking idiom rather than a bare
 * word like "payment", which appears on ordinary purchases too. Matched
 * case-insensitively against the raw statement description.
 */
const CARD_PAYMENT_PATTERNS: RegExp[] = [
  /\bautomatic\s+payment\b/i,
  /\bautopay\b/i,
  /\bauto\s+pay\b/i,
  /\bpayment\s*[-–—]?\s*thank\s*you\b/i,
  /\bthank\s*you\s*[-–—]?\s*payment\b/i,
  /\bdirect\s+payment\b/i,
  /\belectronic\s+payment\b/i,
  /\bonline\s+payment\b/i,
  /\bcredit\s+cr(?:d|ed)\w*\s+p(?:ay|mt)\w*\b/i,
  /\bpayment\s+to\s+credit\s+card\b/i,
  /\bcard\s+payment\b/i,
]

/**
 * True when a statement description reads as one leg of a credit-card payment
 * (an autopay debit on the funding account, or the matching credit on the card).
 */
export function isCardPaymentDescription(description: string | null | undefined): boolean {
  if (!description) return false
  return CARD_PAYMENT_PATTERNS.some((re) => re.test(description))
}

/**
 * Phrases that identify a row as one leg of a transfer between two accounts the
 * user owns (as opposed to a card payment, above).
 *
 * Same design rule as CARD_PAYMENT_PATTERNS: full banking idioms, and each one
 * anchored on an account-number token where possible, so ordinary descriptions
 * containing the word "transfer" (Thai bank rows say "TRF. PROMPTPAY" for
 * everyday person-to-person payments) do not match.
 */
const INTER_ACCOUNT_TRANSFER_PATTERNS: RegExp[] = [
  /\bonline\s*transfer\b/i,
  /\btransfer\s+(?:from|to)\s+x+\d{3,}/i,
  /\bovft\b/i,
]

/**
 * True when a statement description reads as one leg of a transfer between the
 * user's own accounts.
 *
 * Both legs are booked once, on the funding side, so the receiving row's
 * direction legitimately disagrees with the transaction's `expense` type. Any
 * direction check must skip these or it severs correct links — measured on live
 * data, this exempts exactly the two `Online Transfer From XXXX5668` rows that
 * pair with the user's own "Florida House" / "FL House Savings" transfers, and
 * nothing else.
 */
export function isInterAccountTransferDescription(
  description: string | null | undefined
): boolean {
  if (!description) return false
  return INTER_ACCOUNT_TRANSFER_PATTERNS.some((re) => re.test(description))
}
