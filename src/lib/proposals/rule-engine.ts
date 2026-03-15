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
  PastCorrection,
} from './types'
import { matchVendor, suggestVendorName } from './vendor-matcher'
import { findPaymentMethodByParserKey, findPaymentMethodByCardLastFour } from './payment-method-mapper'
import { findMappingMatch, isBankParser } from '@/lib/services/vendor-recipient-mapping'

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
  // Strategy 0: Past corrections — user previously corrected payment method for similar items
  const pmCorrection = findBestCorrection(item, context, 'payment_method_id')
  if (pmCorrection && typeof pmCorrection.correctedValue === 'string') {
    const pm = context.paymentMethods.find((p) => p.id === pmCorrection.correctedValue)
    if (pm) {
      fields.paymentMethodId = pm.id
      fc.payment_method_id = {
        score: 88,
        reasoning: `Learned from correction: ${pm.name}`,
      }
      return
    }
  }

  // Strategy 1: Statement source has payment method
  if (item.paymentMethodId) {
    fields.paymentMethodId = item.paymentMethodId
    const pmName = item.paymentMethodName ||
      context.paymentMethods.find((pm) => pm.id === item.paymentMethodId)?.name || 'known PM'
    fc.payment_method_id = { score: 95, reasoning: `Statement source: ${pmName}` }
    return
  }

  // For merged items, prefer statement's payment method (already handled above via item.paymentMethodId)

  // Strategy 2: Card last 4 digits from email receipt
  if (item.paymentCardLastFour) {
    const matched = findPaymentMethodByCardLastFour(
      item.paymentCardLastFour,
      context.paymentMethods.map((pm) => ({ id: pm.id, name: pm.name, card_last_four: pm.cardLastFour }))
    )
    if (matched) {
      fields.paymentMethodId = matched.id
      const cardDesc = item.paymentCardType
        ? `${item.paymentCardType} •••• ${item.paymentCardLastFour}`
        : `•••• ${item.paymentCardLastFour}`
      fc.payment_method_id = { score: 92, reasoning: `Card digits ${cardDesc} -> ${matched.name}` }
      return
    }
  }

  // Strategy 3: Email parser key mapping
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
  // Strategy 0: Past corrections — user previously corrected vendor for similar items
  // Skip for bank transfers: all emails from the same bank share a sender address,
  // so "same sender" corrections would incorrectly apply one vendor to all transfers.
  // Bank transfers use vendor-recipient mappings instead (Strategy 1).
  if (!isBankParser(item.parserKey)) {
    const vendorCorrection = findBestCorrection(item, context, 'vendor_id')
    if (vendorCorrection && typeof vendorCorrection.correctedValue === 'string') {
      const correctedVendorId = vendorCorrection.correctedValue
      const vendor = context.vendors.find((v) => v.id === correctedVendorId)
      if (vendor) {
        fields.vendorId = vendor.id
        const matchType = vendorCorrection.fromAddress && item.fromAddress === vendorCorrection.fromAddress
          ? 'same sender' : 'similar description'
        fc.vendor_id = {
          score: 93,
          reasoning: `Learned from correction (${matchType}): ${vendor.name}`,
        }
        return
      }
    }
  }

  // Strategy 1: Learned vendor-recipient mapping (from past user actions)
  if (item.vendorNameRaw && item.parserKey && context.vendorRecipientMappings.length > 0) {
    const mapping = findMappingMatch(item.vendorNameRaw, item.parserKey, context.vendorRecipientMappings)
    if (mapping) {
      const vendor = context.vendors.find((v) => v.id === mapping.vendorId)
      if (vendor) {
        const confidence = Math.min(92, 80 + mapping.matchCount * 3)
        fields.vendorId = vendor.id
        fc.vendor_id = {
          score: confidence,
          reasoning: `Learned mapping: "${item.vendorNameRaw}" → ${vendor.name} (${mapping.matchCount}× confirmed)`,
        }
        return
      }
    }
  }

  // Strategy 2: Email has vendor_id set by parser
  if (item.vendorId) {
    const vendor = context.vendors.find((v) => v.id === item.vendorId)
    if (vendor) {
      fields.vendorId = vendor.id
      fc.vendor_id = { score: 90, reasoning: `Vendor from email parser: ${vendor.name}` }
      return
    }
  }

  // Strategy 3: Fuzzy match against vendors + historical descriptions
  const match = matchVendor(item.description, context.vendors, context.recentTransactions)
  if (match) {
    fields.vendorId = match.vendorId
    fc.vendor_id = {
      score: match.confidence,
      reasoning: match.reasoning,
    }
    return
  }

  // Strategy 4: Suggest a clean vendor name (no match found)
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
  item: ProposalInput,
  context: RuleEngineContext,
  fields: ProposedFields,
  fc: FieldConfidenceMap
) {
  // Strategy 0: Past corrections — user previously corrected tags for similar items
  const tagCorrection = findBestCorrection(item, context, 'tag_ids')
  if (tagCorrection && Array.isArray(tagCorrection.correctedValue)) {
    const correctedTagIds = tagCorrection.correctedValue as string[]
    const validTags = correctedTagIds.filter((id) => context.tags.some((t) => t.id === id))
    if (validTags.length > 0) {
      fields.tagIds = validTags.slice(0, 3)
      const tagNames = validTags.map((id) => context.tags.find((t) => t.id === id)?.name).filter(Boolean)
      fc.tag_ids = {
        score: 85,
        reasoning: `Learned from correction: ${tagNames.join(', ')}`,
      }
      return
    }
  }

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
  // Strategy 0: Past corrections — user previously corrected description for same sender/vendor
  // This is most useful for emails where the extracted description was poor (e.g. just the subject)
  const descCorrection = findBestCorrection(item, context, 'description')
  if (descCorrection && typeof descCorrection.correctedValue === 'string') {
    // Only apply if the correction came from a strong match (same sender)
    const isSameSender = descCorrection.fromAddress && item.fromAddress
      && descCorrection.fromAddress === item.fromAddress
    const isSameVendor = fields.vendorId && descCorrection.sourceDescription

    if (isSameSender || isSameVendor) {
      fields.description = descCorrection.correctedValue
      const matchType = isSameSender ? 'same sender' : 'same vendor'
      fc.description = {
        score: 88,
        reasoning: `Learned from correction (${matchType}): "${descCorrection.correctedValue}"`,
      }
      return
    }
  }

  // Strategy 1: Email with dedicated parser + high confidence → use parser description
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

  // Strategy 2: For merged items, prefer email description
  if (item.sourceType === 'merged') {
    fields.description = item.description
    fc.description = { score: 75, reasoning: 'Email description (merged item)' }
    return
  }

  // Strategy 3: Vendor description pattern analysis
  // If vendor is matched and has a dominant description pattern, use it
  if (fields.vendorId) {
    const patterns = context.vendorDescriptionPatterns
      .filter((p) => p.vendorId === fields.vendorId)
      .sort((a, b) => b.count - a.count)

    if (patterns.length > 0) {
      const topPattern = patterns[0]

      // High-frequency pattern: >80% of transactions use same description (3+ txns)
      if (topPattern.frequency >= 0.8 && topPattern.totalTransactions >= 3) {
        fields.description = topPattern.description
        fc.description = {
          score: 90,
          reasoning: `Vendor pattern: "${topPattern.description}" used in ${Math.round(topPattern.frequency * 100)}% of ${topPattern.totalTransactions} transactions`,
        }
        return
      }

      // Moderate-frequency pattern: >50% with 3+ uses
      if (topPattern.frequency >= 0.5 && topPattern.count >= 3) {
        fields.description = topPattern.description
        fc.description = {
          score: 80,
          reasoning: `Common vendor description: "${topPattern.description}" (${topPattern.count}/${topPattern.totalTransactions} transactions)`,
        }
        return
      }
    }
  }

  // Strategy 4: Most recent vendor description (fallback for varied-description vendors)
  if (fields.vendorId) {
    const vendorTxns = context.recentTransactions.filter(
      (tx) => tx.vendorId === fields.vendorId
    )
    if (vendorTxns.length > 0) {
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

  // Strategy 5: Clean statement description
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

/**
 * Find the most relevant past correction for a given field and item.
 * Matches by sender address (strongest), parser key, or description similarity.
 */
function findBestCorrection(
  item: ProposalInput,
  context: RuleEngineContext,
  field: PastCorrection['field']
): PastCorrection | null {
  const corrections = context.pastCorrections.filter((c) => c.field === field)
  if (corrections.length === 0) return null

  let best: { correction: PastCorrection; score: number } | null = null

  for (const c of corrections) {
    let score = 0

    // Strongest: same sender address
    if (c.fromAddress && item.fromAddress && c.fromAddress === item.fromAddress) {
      score += 50
    }

    // Strong: same parser key
    if (c.parserKey && item.parserKey && c.parserKey === item.parserKey) {
      score += 30
    }

    // Moderate: similar source description (token overlap)
    if (c.sourceDescription && item.description) {
      const overlap = quickTokenOverlap(c.sourceDescription, item.description)
      score += overlap * 20
    }

    // Must have at least some match signal
    if (score < 20) continue

    if (!best || score > best.score) {
      best = { correction: c, score }
    }
  }

  return best?.correction ?? null
}

/**
 * Quick token overlap for correction matching (0-1)
 */
function quickTokenOverlap(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const tokensA = normalize(a).split(' ').filter((t) => t.length > 1)
  const tokensB = normalize(b).split(' ').filter((t) => t.length > 1)
  if (tokensA.length === 0 || tokensB.length === 0) return 0

  let matches = 0
  for (const ta of tokensA) {
    if (tokensB.some((tb) => tb.includes(ta) || ta.includes(tb))) matches++
  }
  return matches / Math.max(tokensA.length, tokensB.length)
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
