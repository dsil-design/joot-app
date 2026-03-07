/**
 * Rule-Based Proposal Engine (Layer 1)
 *
 * Deterministic, fast (<100ms per item), free proposal generation.
 * Runs for every import item. Fields it can't confidently fill
 * are left for the LLM layer.
 */

import type {
  ProposalInput,
  ProposalEngineResult,
  ProposedFields,
  FieldConfidenceMap,
  RuleEngineContext,
} from './types'
import { matchVendor, suggestVendorName } from './vendor-matcher'
import { findPaymentMethodByParserKey } from './payment-method-mapper'

/**
 * Generate a rule-based proposal for a single queue item.
 */
export function generateRuleProposal(
  item: ProposalInput,
  context: RuleEngineContext
): ProposalEngineResult {
  const startTime = Date.now()
  const fields: ProposedFields = {}
  const fieldConfidence: FieldConfidenceMap = {}

  // 1. Amount
  proposeAmount(item, fields, fieldConfidence)

  // 2. Currency
  proposeCurrency(item, fields, fieldConfidence)

  // 3. Date
  proposeDate(item, fields, fieldConfidence)

  // 4. Transaction Type
  proposeTransactionType(item, context, fields, fieldConfidence)

  // 5. Payment Method
  proposePaymentMethod(item, context, fields, fieldConfidence)

  // 6. Vendor
  proposeVendor(item, context, fields, fieldConfidence)

  // 7. Tags (depends on vendor)
  proposeTags(item, context, fields, fieldConfidence)

  // 8. Description
  proposeDescription(item, context, fields, fieldConfidence)

  // Calculate overall confidence (weighted average of key fields)
  const overallConfidence = calculateOverallConfidence(fieldConfidence)

  return {
    fields,
    fieldConfidence,
    overallConfidence,
    engine: 'rule_based',
    durationMs: Date.now() - startTime,
  }
}

// ── Field proposers ──────────────────────────────────────────────────────

function proposeAmount(
  item: ProposalInput,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  fields.amount = Math.abs(item.amount)
  // Merged items (both sources agree) -> 100, single source -> 95
  const score = item.sourceType === 'merged' ? 100 : 95
  fc.amount = { score, reasoning: item.sourceType === 'merged' ? 'Both sources agree on amount' : 'Direct from import source' }
}

function proposeCurrency(
  item: ProposalInput,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  fields.currency = item.currency
  const score = item.sourceType === 'merged' ? 100 : 95
  fc.currency = { score, reasoning: item.sourceType === 'merged' ? 'Both sources agree on currency' : 'Direct from import source' }
}

function proposeDate(
  item: ProposalInput,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  fields.date = item.date
  if (item.sourceType === 'statement' || item.sourceType === 'merged') {
    fc.date = { score: 100, reasoning: 'Statement date (authoritative)' }
  } else {
    fc.date = { score: 90, reasoning: 'Email-only date (may vary by timezone)' }
  }
}

function proposeTransactionType(
  item: ProposalInput,
  context: RuleEngineContext,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  // Email classification signals
  if (item.classification === 'refund_notification') {
    fields.transactionType = 'income'
    fc.transaction_type = { score: 90, reasoning: 'Email classified as refund notification' }
    return
  }

  // Credit card: positive = expense, negative = refund
  if (item.amount > 0) {
    fields.transactionType = 'expense'
    fc.transaction_type = { score: 95, reasoning: 'Positive amount on statement indicates expense' }
    return
  }

  if (item.amount < 0) {
    fields.transactionType = 'income'
    fc.transaction_type = { score: 90, reasoning: 'Negative amount indicates refund/credit' }
    return
  }

  // Historical vendor pattern
  if (fields.vendorId) {
    const vendorTxns = context.recentTransactions.filter(
      (tx) => tx.vendorId === fields.vendorId
    )
    if (vendorTxns.length > 5) {
      const incomeCount = vendorTxns.filter((tx) => tx.transactionType === 'income').length
      const incomeRatio = incomeCount / vendorTxns.length
      if (incomeRatio > 0.8) {
        fields.transactionType = 'income'
        fc.transaction_type = { score: 75, reasoning: `Vendor has ${Math.round(incomeRatio * 100)}% income transactions` }
        return
      }
    }
  }

  // Default: expense
  fields.transactionType = 'expense'
  fc.transaction_type = { score: 80, reasoning: 'Default: most transactions are expenses' }
}

function proposePaymentMethod(
  item: ProposalInput,
  context: RuleEngineContext,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  // Strategy 1: Statement source has payment method
  if (item.paymentMethodId) {
    fields.paymentMethodId = item.paymentMethodId
    const pmName = item.paymentMethodName ||
      context.paymentMethods.find((pm) => pm.id === item.paymentMethodId)?.name || 'known PM'
    fc.payment_method_id = { score: 95, reasoning: `Statement source: ${pmName}` }
    return
  }

  // For merged items, prefer statement's payment method (already handled above via item.paymentMethodId)

  // Strategy 2: Email parser key mapping
  if (item.parserKey) {
    const matched = findPaymentMethodByParserKey(
      item.parserKey,
      context.paymentMethods.map((pm) => ({ id: pm.id, name: pm.name }))
    )
    if (matched) {
      fields.paymentMethodId = matched.id
      fc.payment_method_id = { score: 85, reasoning: `Parser key '${item.parserKey}' -> ${matched.name}` }
      return
    }
  }

  // Strategy 3: Most-used PM for this vendor + currency
  if (fields.vendorId) {
    const vendorTxns = context.recentTransactions.filter(
      (tx) => tx.vendorId === fields.vendorId && tx.currency === item.currency
    )
    if (vendorTxns.length >= 3) {
      const pmCounts = new Map<string, number>()
      for (const tx of vendorTxns) {
        if (tx.paymentMethodId) {
          pmCounts.set(tx.paymentMethodId, (pmCounts.get(tx.paymentMethodId) || 0) + 1)
        }
      }
      if (pmCounts.size > 0) {
        const [topPmId] = [...pmCounts].sort((a, b) => b[1] - a[1])[0]
        const topPmName = context.paymentMethods.find((pm) => pm.id === topPmId)?.name || 'Unknown'
        fields.paymentMethodId = topPmId
        fc.payment_method_id = { score: 60, reasoning: `Most-used PM for this vendor+currency: ${topPmName}` }
        return
      }
    }
  }

  // No match
  fc.payment_method_id = { score: 0, reasoning: 'No payment method match found' }
}

function proposeVendor(
  item: ProposalInput,
  context: RuleEngineContext,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  // Strategy 1: Email has vendor_id set by parser
  if (item.vendorId) {
    const vendor = context.vendors.find((v) => v.id === item.vendorId)
    if (vendor) {
      fields.vendorId = vendor.id
      fc.vendor_id = { score: 90, reasoning: `Vendor from email parser: ${vendor.name}` }
      return
    }
  }

  // Strategy 2+3+4: Fuzzy match against vendors + historical descriptions
  const match = matchVendor(item.description, context.vendors, context.recentTransactions)
  if (match) {
    fields.vendorId = match.vendorId
    fc.vendor_id = {
      score: match.confidence,
      reasoning: match.reasoning,
    }
    return
  }

  // Strategy 5: Suggest a clean vendor name (no match found)
  const suggestedName = suggestVendorName(item.description)
  if (suggestedName && suggestedName !== item.description) {
    fields.vendorId = null
    fields.vendorNameSuggestion = suggestedName
    fc.vendor_id = { score: 30, reasoning: `No vendor match; suggested: "${suggestedName}"` }
    return
  }

  fc.vendor_id = { score: 0, reasoning: 'No vendor match found' }
}

function proposeTags(
  _item: ProposalInput,
  context: RuleEngineContext,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  if (!fields.vendorId) {
    fc.tag_ids = { score: 0, reasoning: 'No vendor matched — cannot infer tags' }
    return
  }

  // Find tags frequently used with this vendor
  const vendorFreqs = context.vendorTagFrequency.filter(
    (vtf) => vtf.vendorId === fields.vendorId && vtf.frequency > 0.5
  )

  if (vendorFreqs.length === 0) {
    fc.tag_ids = { score: 0, reasoning: 'No frequent tags for this vendor' }
    return
  }

  // Take top 3 tags by frequency
  const topTags = vendorFreqs
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3)

  fields.tagIds = topTags.map((t) => t.tagId)

  const tagNames = topTags.map((t) => `${t.tagName} (${Math.round(t.frequency * 100)}%)`).join(', ')
  const avgFreq = topTags.reduce((sum, t) => sum + t.frequency, 0) / topTags.length
  fc.tag_ids = {
    score: Math.round(avgFreq * 100),
    reasoning: `Tags from vendor history: ${tagNames}`,
  }
}

function proposeDescription(
  item: ProposalInput,
  context: RuleEngineContext,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  // For email with dedicated parser + high confidence: use email description
  if (
    item.sourceType === 'email' || item.sourceType === 'merged'
  ) {
    if (
      item.parserKey &&
      item.parserKey !== 'ai-fallback' &&
      (item.extractionConfidence ?? 0) >= 75
    ) {
      fields.description = item.description
      fc.description = { score: 85, reasoning: `Email parser '${item.parserKey}' description` }
      return
    }
  }

  // For merged: prefer email description
  if (item.sourceType === 'merged') {
    fields.description = item.description
    fc.description = { score: 75, reasoning: 'Email description (merged item)' }
    return
  }

  // Historical: if vendor matched, use most recent description for that vendor
  if (fields.vendorId) {
    const vendorTxns = context.recentTransactions.filter(
      (tx) => tx.vendorId === fields.vendorId
    )
    if (vendorTxns.length > 0) {
      // Sort by date descending, take most recent
      const mostRecent = vendorTxns.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
      if (mostRecent.description) {
        fields.description = mostRecent.description
        fc.description = { score: 70, reasoning: `Most recent description for vendor: "${mostRecent.description}"` }
        return
      }
    }
  }

  // Clean statement description
  fields.description = cleanDescription(item.description)
  fc.description = { score: 75, reasoning: 'Cleaned statement description' }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function cleanDescription(raw: string): string {
  let cleaned = raw
    // Remove card numbers
    .replace(/x{3,}\d{4}/gi, '')
    .replace(/\d{4}\s*\*{4,}/g, '')
    // Remove trailing reference numbers
    .replace(/\s+#?\d{6,}$/g, '')
    // Remove common prefixes
    .replace(/^(POS|ACH|DEBIT|CREDIT|SQ\s*\*|TST\s*\*)\s*/i, '')
    // Clean special chars
    .replace(/[*#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Title case if all uppercase
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = cleaned
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return cleaned || raw
}

function calculateOverallConfidence(fc: FieldConfidenceMap): number {
  // Weighted average of key fields
  const weights: Record<string, number> = {
    vendor_id: 3,
    description: 2,
    tag_ids: 2,
    payment_method_id: 2,
    transaction_type: 1,
    amount: 1,
    currency: 1,
    date: 1,
  }

  let totalWeight = 0
  let weightedSum = 0

  for (const [field, weight] of Object.entries(weights)) {
    if (fc[field]) {
      totalWeight += weight
      weightedSum += fc[field].score * weight
    }
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
}
