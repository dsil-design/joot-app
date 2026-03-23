/**
 * LLM Proposal Engine (Layer 2)
 *
 * Uses Claude Haiku to enhance proposals when rule engine confidence is low.
 * Called only when average confidence of key fields < 70%.
 */

import { callAi, AI_MODEL } from '@/lib/email/ai-client'
import type {
  ProposalInput,
  ProposalEngineResult,
  ProposedFields,
  FieldConfidenceMap,
  RuleEngineContext,
  RecentTransaction,
  PastCorrection,
} from './types'

interface LLMProposalResponse {
  vendor_name?: string
  vendor_id?: string
  description?: string
  transaction_type?: 'expense' | 'income' | 'transfer'
  payment_method_id?: string
  tag_ids?: string[]
  confidence: {
    vendor?: number
    description?: number
    transaction_type?: number
    payment_method?: number
    tags?: number
  }
  reasoning: {
    vendor?: string
    description?: string
    transaction_type?: string
    payment_method?: string
    tags?: string
  }
}

/**
 * Call Claude Haiku to enhance a proposal with AI.
 */
export async function generateLLMProposal(
  item: ProposalInput,
  context: RuleEngineContext
): Promise<ProposalEngineResult> {
  const startTime = Date.now()

  // Build context for the prompt
  const similarTxns = findSimilarTransactions(item.description, context.recentTransactions, 10)
  const topVendors = context.vendors
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, 50)
  const topTags = context.tags
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 20)

  // Find relevant past corrections for this item
  const relevantCorrections = findRelevantCorrections(item, context.pastCorrections)

  const prompt = buildPrompt(item, similarTxns, topVendors, context.paymentMethods, topTags, context.vendorDescriptionPatterns, relevantCorrections, item.rejectionFeedback)

  const { data, tokenUsage } = await callAi<LLMProposalResponse>(prompt)

  const fields: ProposedFields = {}
  const fieldConfidence: FieldConfidenceMap = {}

  // Map LLM response to fields
  if (data.vendor_id && context.vendors.some((v) => v.id === data.vendor_id)) {
    fields.vendorId = data.vendor_id
    const vendorName = context.vendors.find((v) => v.id === data.vendor_id)?.name || ''
    fieldConfidence.vendor_id = {
      score: data.confidence.vendor || 70,
      reasoning: data.reasoning.vendor || `AI: matched to ${vendorName}`,
    }
  } else if (data.vendor_name) {
    // Try to find the vendor by name
    const matchedVendor = context.vendors.find(
      (v) => v.name.toLowerCase() === data.vendor_name!.toLowerCase()
    )
    if (matchedVendor) {
      fields.vendorId = matchedVendor.id
      fieldConfidence.vendor_id = {
        score: data.confidence.vendor || 70,
        reasoning: data.reasoning.vendor || `AI: matched to ${matchedVendor.name}`,
      }
    } else {
      fields.vendorId = null
      fields.vendorNameSuggestion = data.vendor_name
      fieldConfidence.vendor_id = {
        score: Math.min(data.confidence.vendor || 50, 50),
        reasoning: data.reasoning.vendor || `AI suggested new vendor: ${data.vendor_name}`,
      }
    }
  }

  if (data.description) {
    fields.description = data.description
    fieldConfidence.description = {
      score: data.confidence.description || 70,
      reasoning: data.reasoning.description || 'AI-generated description',
    }
  }

  if (data.transaction_type) {
    fields.transactionType = data.transaction_type
    fieldConfidence.transaction_type = {
      score: data.confidence.transaction_type || 80,
      reasoning: data.reasoning.transaction_type || 'AI-classified transaction type',
    }
  }

  if (data.payment_method_id && context.paymentMethods.some((pm) => pm.id === data.payment_method_id)) {
    fields.paymentMethodId = data.payment_method_id
    fieldConfidence.payment_method_id = {
      score: data.confidence.payment_method || 60,
      reasoning: data.reasoning.payment_method || 'AI-suggested payment method',
    }
  }

  if (data.tag_ids && data.tag_ids.length > 0) {
    const validTags = data.tag_ids.filter((id) => context.tags.some((t) => t.id === id))
    if (validTags.length > 0) {
      fields.tagIds = validTags.slice(0, 3)
      fieldConfidence.tag_ids = {
        score: data.confidence.tags || 60,
        reasoning: data.reasoning.tags || 'AI-suggested tags',
      }
    }
  }

  const totalDurationMs = Date.now() - startTime

  // Calculate overall confidence
  let totalWeight = 0
  let weightedSum = 0
  const weights: Record<string, number> = { vendor_id: 3, description: 2, tag_ids: 2, payment_method_id: 2, transaction_type: 1 }
  for (const [field, weight] of Object.entries(weights)) {
    if (fieldConfidence[field]) {
      totalWeight += weight
      weightedSum += fieldConfidence[field].score * weight
    }
  }

  return {
    fields,
    fieldConfidence,
    overallConfidence: totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50,
    engine: 'llm',
    llmModel: AI_MODEL,
    llmPromptTokens: tokenUsage.promptTokens,
    llmResponseTokens: tokenUsage.responseTokens,
    durationMs: totalDurationMs,
  }
}

function buildPrompt(
  item: ProposalInput,
  similarTxns: RecentTransaction[],
  vendors: Array<{ id: string; name: string }>,
  paymentMethods: Array<{ id: string; name: string }>,
  tags: Array<{ id: string; name: string }>,
  vendorDescriptionPatterns?: Array<{ vendorId: string; vendorName: string; description: string; count: number; frequency: number }>,
  pastCorrections?: PastCorrection[],
  rejectionFeedback?: string[]
): string {
  const parts: string[] = []

  parts.push(`You are a transaction categorization assistant for a personal finance app.`)
  parts.push(`Given a raw import item, propose the best vendor, description, transaction type, payment method, and tags.`)
  parts.push('')
  parts.push(`## Import Item`)
  parts.push(`- Description: "${item.description}"`)
  if (item.subject) parts.push(`- Email Subject: "${item.subject}"`)
  if (item.fromName) parts.push(`- From: ${item.fromName}${item.fromAddress ? ` (${item.fromAddress})` : ''}`)
  parts.push(`- Amount: ${item.amount} ${item.currency}`)
  parts.push(`- Date: ${item.date}`)
  parts.push(`- Source: ${item.sourceType}`)
  if (item.parserKey) parts.push(`- Parser key: ${item.parserKey}`)
  if (item.paymentCardLastFour) parts.push(`- Payment card: ${item.paymentCardType || 'card'} ending ${item.paymentCardLastFour}`)
  if (item.senderName) parts.push(`- Sender: ${item.senderName}`)
  if (item.recipientName) parts.push(`- Recipient: ${item.recipientName}`)
  if (item.bankDetected) parts.push(`- Bank: ${item.bankDetected}`)
  if (item.detectedDirection) parts.push(`- Detected direction: ${item.detectedDirection} (based on bank account matching)`)

  if (similarTxns.length > 0) {
    parts.push('')
    parts.push(`## Similar Historical Transactions`)
    for (const tx of similarTxns.slice(0, 10)) {
      parts.push(`- "${tx.description}" | ${tx.vendorName || 'no vendor'} | ${tx.amount} ${tx.currency} | ${tx.transactionType} | ${tx.date}`)
    }
  }

  // Add vendor description patterns so the LLM knows established conventions
  if (vendorDescriptionPatterns && vendorDescriptionPatterns.length > 0) {
    // Show top patterns (most frequently used descriptions per vendor)
    const topPatterns = vendorDescriptionPatterns
      .filter((p) => p.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)

    if (topPatterns.length > 0) {
      parts.push('')
      parts.push(`## Vendor Description Patterns (established conventions)`)
      parts.push(`These are the user's preferred description formats for each vendor. Match these patterns when possible:`)
      for (const p of topPatterns) {
        parts.push(`- ${p.vendorName}: "${p.description}" (used ${p.count}x, ${Math.round(p.frequency * 100)}%)`)
      }
    }
  }

  // Past corrections — teach the LLM from user feedback
  if (pastCorrections && pastCorrections.length > 0) {
    parts.push('')
    parts.push(`## User Corrections (learn from these)`)
    parts.push(`The user has previously corrected proposals. Apply the same corrections to similar items:`)
    for (const c of pastCorrections) {
      if (c.field === 'vendor_id' && c.correctedVendorName) {
        const from = c.originalVendorName || String(c.originalValue || 'none')
        parts.push(`- Description "${c.sourceDescription}"${c.fromAddress ? ` from ${c.fromAddress}` : ''}: corrected vendor from "${from}" to "${c.correctedVendorName}"`)
      } else if (c.field === 'description') {
        parts.push(`- Corrected description from "${c.originalValue}" to "${c.correctedValue}"${c.fromAddress ? ` (sender: ${c.fromAddress})` : ''}`)
      } else if (c.field === 'tag_ids') {
        parts.push(`- Corrected tags for "${c.sourceDescription}": ${JSON.stringify(c.correctedValue)}`)
      } else if (c.field === 'payment_method_id') {
        parts.push(`- Corrected payment method for "${c.sourceDescription}": ${c.correctedValue}`)
      }
    }
  }

  // Prior rejection feedback — the user rejected previous proposals for this item
  if (rejectionFeedback && rejectionFeedback.length > 0) {
    parts.push('')
    parts.push(`## IMPORTANT: Prior Rejection Feedback for This Item`)
    parts.push(`The user previously rejected proposals for this exact item. You MUST address these issues:`)
    for (const fb of rejectionFeedback) {
      parts.push(`- ${fb}`)
    }
    parts.push(`Carefully re-examine the import data and adjust your proposal to fix the problems described above.`)
  }

  parts.push('')
  parts.push(`## Available Vendors (top by usage)`)
  for (const v of vendors.slice(0, 30)) {
    parts.push(`- ${v.id}: ${v.name}`)
  }

  parts.push('')
  parts.push(`## Available Payment Methods`)
  for (const pm of paymentMethods) {
    parts.push(`- ${pm.id}: ${pm.name}`)
  }

  parts.push('')
  parts.push(`## Available Tags`)
  for (const t of tags) {
    parts.push(`- ${t.id}: ${t.name}`)
  }

  parts.push('')
  parts.push(`## Description Conventions`)
  parts.push(`Follow these description format rules strictly:`)
  parts.push(`- Recurring bills: "[Type] Bill" (e.g. "Cell Phone Bill", "Electricity Bill", "Water Bill")`)
  parts.push(`- Rent payments: "Monthly Rent"`)
  parts.push(`- Food delivery: "[MealType]: [Restaurant Name]" where MealType is Breakfast (before 11am), Lunch (11am-3pm), Dinner (5pm+), or Meal (other)`)
  parts.push(`- Coffee orders: "Coffee: [Shop Name]"`)
  parts.push(`- Grocery delivery: "Groceries - [Store Name]"`)
  parts.push(`- Taxi/rides: "Taxi to [Destination]"`)
  parts.push(`- Flights/airlines: "Flight: [Origin]-[Destination]" using airport codes (e.g. "Flight: EWR-SRQ", "Flight: BKK-NRT"). Extract route from email subject/description if available.`)
  parts.push(`- Hotels/lodging: "Hotel: [City/Name]" (e.g. "Hotel: Tokyo", "Hotel: Marriott Bangkok")`)
  parts.push(`- Subscriptions: just the service name (e.g. "Netflix", "Paramount+")`)
  parts.push(`- Cleaning services: "Cleaning Service"`)
  parts.push(`- Massage/wellness: "Massage" or the specific service type`)
  parts.push(`- Weekly meal plans: "Weekly Meal Plan"`)
  parts.push(`- If the vendor has an established description pattern (see above), use it unless the raw description clearly indicates something different`)
  parts.push('')
  parts.push(`## Instructions`)
  parts.push(`1. Match the description to an existing vendor if possible (use the vendor ID). If no match, suggest a clean vendor name.`)
  parts.push(`2. Write a clean, human-readable description following the Description Conventions above. If similar historical transactions exist, follow their description style.`)
  parts.push(`3. Classify as "expense" or "income".`)
  parts.push(`4. Suggest a payment method if you can determine one. If a payment card (last 4 digits or type) is provided, match it to a payment method that has matching card details.`)
  parts.push(`5. Suggest up to 3 relevant tags.`)
  parts.push(`6. For each field, provide a confidence score (0-100) and brief reasoning.`)
  parts.push('')
  parts.push(`Return JSON with this structure:`)
  parts.push(`{`)
  parts.push(`  "vendor_id": "uuid or null",`)
  parts.push(`  "vendor_name": "suggested name if no vendor_id match",`)
  parts.push(`  "description": "clean description",`)
  parts.push(`  "transaction_type": "expense" or "income",`)
  parts.push(`  "payment_method_id": "uuid or null",`)
  parts.push(`  "tag_ids": ["uuid1", "uuid2"],`)
  parts.push(`  "confidence": { "vendor": 80, "description": 90, "transaction_type": 95, "payment_method": 60, "tags": 70 },`)
  parts.push(`  "reasoning": { "vendor": "...", "description": "...", "transaction_type": "...", "payment_method": "...", "tags": "..." }`)
  parts.push(`}`)

  return parts.join('\n')
}

/**
 * Filter past corrections to those relevant to the current item.
 * Limits to 10 most relevant to avoid prompt bloat.
 */
function findRelevantCorrections(
  item: ProposalInput,
  corrections: PastCorrection[]
): PastCorrection[] {
  if (corrections.length === 0) return []

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

  const scored = corrections.map((c) => {
    let score = 0

    // Same sender
    if (c.fromAddress && item.fromAddress && c.fromAddress === item.fromAddress) {
      score += 50
    }

    // Same parser key
    if (c.parserKey && item.parserKey && c.parserKey === item.parserKey) {
      score += 30
    }

    // Description similarity
    if (c.sourceDescription && item.description) {
      const normC = normalize(c.sourceDescription)
      const normI = normalize(item.description)
      const tokensC = normC.split(' ').filter((t) => t.length > 1)
      const tokensI = normI.split(' ').filter((t) => t.length > 1)
      if (tokensC.length > 0 && tokensI.length > 0) {
        let matches = 0
        for (const t of tokensC) {
          if (tokensI.some((ti) => ti.includes(t) || t.includes(ti))) matches++
        }
        score += (matches / Math.max(tokensC.length, tokensI.length)) * 20
      }
    }

    return { correction: c, score }
  })

  return scored
    .filter((s) => s.score >= 15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => s.correction)
}

function findSimilarTransactions(
  description: string,
  transactions: RecentTransaction[],
  limit: number
): RecentTransaction[] {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

  const normDesc = normalize(description)
  const descTokens = normDesc.split(' ').filter((t) => t.length > 1)

  if (descTokens.length === 0) return transactions.slice(0, limit)

  return transactions
    .map((tx) => {
      const normTx = normalize(tx.description)
      const txTokens = normTx.split(' ').filter((t) => t.length > 1)
      let matches = 0
      for (const dt of descTokens) {
        if (txTokens.some((tt) => tt.includes(dt) || dt.includes(tt))) matches++
      }
      return { tx, score: matches / Math.max(descTokens.length, txTokens.length) }
    })
    .filter((r) => r.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.tx)
}
