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
