/**
 * Payment Method Mapper
 *
 * Maps parser keys and statement sources to payment method IDs.
 * Shared between client-side dialog pre-fill and server-side proposal engine.
 */

/**
 * Map parser keys to payment method name patterns for auto-matching.
 * Keys are parser keys, values are substrings to match against payment method names (case-insensitive).
 */
export const PARSER_PAYMENT_METHOD_MAP: Record<string, string[]> = {
  "bangkok-bank": ["bangkok bank", "bbl", "bualuang"],
  kasikorn: ["kasikorn", "kbank", "k plus", "kplus"],
  grab: ["grab"],
  bolt: ["bolt"],
  apple: ["apple"],
  stripe: ["stripe"],
  lazada: ["lazada"],
}

/**
 * Map payment slip bank_detected values to the same payment method name patterns.
 * bank_detected comes from Claude Vision extraction (e.g. "kbank", "bangkok_bank").
 */
export const BANK_DETECTED_PAYMENT_METHOD_MAP: Record<string, string[]> = {
  kbank: ["kasikorn", "kbank", "k plus", "kplus"],
  bangkok_bank: ["bangkok bank", "bbl", "bualuang"],
}

/**
 * Find a payment method by matching card last 4 digits.
 * This takes priority over parser key matching since it's more specific.
 */
export function findPaymentMethodByCardLastFour(
  cardLastFour: string,
  paymentMethods: Array<{ id: string; name: string; card_last_four?: string | null }>
): { id: string; name: string } | null {
  if (!cardLastFour) return null

  const matched = paymentMethods.find(
    (pm) => pm.card_last_four === cardLastFour
  )

  return matched ? { id: matched.id, name: matched.name } : null
}

/**
 * Find a payment method ID by matching parser key against available payment methods.
 */
export function findPaymentMethodByParserKey(
  parserKey: string,
  paymentMethods: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  const patterns = PARSER_PAYMENT_METHOD_MAP[parserKey]
  if (!patterns) return null

  const matched = paymentMethods.find((pm) =>
    patterns.some((p) => pm.name.toLowerCase().includes(p))
  )

  return matched || null
}

/**
 * Find a payment method by matching the bank_detected value from payment slip extraction.
 */
export function findPaymentMethodByBankDetected(
  bankDetected: string,
  paymentMethods: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  const patterns = BANK_DETECTED_PAYMENT_METHOD_MAP[bankDetected]
  if (!patterns) return null

  const matched = paymentMethods.find((pm) =>
    patterns.some((p) => pm.name.toLowerCase().includes(p))
  )

  return matched || null
}
