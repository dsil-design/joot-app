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

/**
 * Everything the sources behind one review item say about which account paid.
 * Collected from the statement/slip the row was imported from and from the
 * receipt email's own payment block.
 */
export interface PaymentMethodSignals {
  /**
   * The payment method that owns the statement or payment slip this item came
   * from. A statement *is* an account, so a row printed on it was paid with
   * that account — the strongest signal available, and the one a receipt email
   * can never contradict (the Grab receipt says "Grab", the Chase statement it
   * landed on says who actually paid).
   */
  sourcePaymentMethod?: { id: string; name: string } | null
  /** Card digits printed on a receipt email, e.g. Grab's "•••• 1234". */
  cardLastFour?: string
  cardType?: string
  /** Parser that extracted the email (e.g. 'kasikorn', 'grab'). */
  parserKey?: string
  /** bank_detected from payment-slip vision extraction (e.g. 'kbank'). */
  bankDetected?: string
}

export interface ResolvedPaymentMethod {
  id: string
  name: string
  /** Mirrors the rule engine's per-strategy confidence, for display/ordering. */
  confidence: number
  reasoning: string
}

/**
 * Resolve the payment method for an import from its sources.
 *
 * Strategy order matches the server-side rule engine (`proposePaymentMethod`)
 * so a card pre-filled client-side and the same card pre-filled from a
 * generated proposal never disagree.
 */
export function resolvePaymentMethodFromSignals(
  signals: PaymentMethodSignals,
  paymentMethods: Array<{ id: string; name: string; card_last_four?: string | null }>
): ResolvedPaymentMethod | null {
  if (paymentMethods.length === 0) return null

  // 1. The account the statement / slip belongs to
  const source = signals.sourcePaymentMethod
  if (source) {
    // Resolve against the live list: an id the picker doesn't know about would
    // silently render as an empty select.
    const known =
      paymentMethods.find((pm) => pm.id === source.id) ||
      paymentMethods.find((pm) => pm.name.toLowerCase() === source.name?.toLowerCase())
    if (known) {
      return {
        id: known.id,
        name: known.name,
        confidence: 95,
        reasoning: `Imported from ${known.name}`,
      }
    }
  }

  // 2. Card digits printed on the receipt email
  if (signals.cardLastFour) {
    const matched = findPaymentMethodByCardLastFour(signals.cardLastFour, paymentMethods)
    if (matched) {
      const cardDesc = signals.cardType
        ? `${signals.cardType} •••• ${signals.cardLastFour}`
        : `•••• ${signals.cardLastFour}`
      return {
        id: matched.id,
        name: matched.name,
        confidence: 92,
        reasoning: `Receipt shows ${cardDesc} → ${matched.name}`,
      }
    }
  }

  // 3. Email parser key (a KBANK transfer alert means the KBANK account)
  if (signals.parserKey) {
    const matched = findPaymentMethodByParserKey(signals.parserKey, paymentMethods)
    if (matched) {
      return {
        id: matched.id,
        name: matched.name,
        confidence: 85,
        reasoning: `Email parser '${signals.parserKey}' → ${matched.name}`,
      }
    }
  }

  // 4. Bank detected on a payment slip
  if (signals.bankDetected && signals.bankDetected !== 'unknown') {
    const matched = findPaymentMethodByBankDetected(signals.bankDetected, paymentMethods)
    if (matched) {
      return {
        id: matched.id,
        name: matched.name,
        confidence: 85,
        reasoning: `Slip bank '${signals.bankDetected}' → ${matched.name}`,
      }
    }
  }

  return null
}

/**
 * Collect payment-method signals from a review-queue item.
 *
 * Structurally typed so both the queue item (server shape) and the match card
 * (UI shape) satisfy it without this module depending on either.
 */
export function paymentMethodSignalsFromItem(item: {
  paymentMethod?: { id: string; name: string } | null
  emailMetadata?: {
    parserKey?: string
    paymentCardLastFour?: string
    paymentCardType?: string
  }
  mergedEmailData?: {
    metadata: {
      parserKey?: string
      paymentCardLastFour?: string
      paymentCardType?: string
    }
  }
  paymentSlipMetadata?: { bankDetected?: string }
  mergedPaymentSlipData?: { metadata: { bankDetected?: string } }
}): PaymentMethodSignals {
  const emailMeta = item.emailMetadata || item.mergedEmailData?.metadata
  const slipMeta = item.paymentSlipMetadata || item.mergedPaymentSlipData?.metadata

  return {
    sourcePaymentMethod: item.paymentMethod ?? null,
    cardLastFour: emailMeta?.paymentCardLastFour,
    cardType: emailMeta?.paymentCardType,
    parserKey: emailMeta?.parserKey,
    bankDetected: slipMeta?.bankDetected,
  }
}
