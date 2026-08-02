/**
 * LLM Proposal Engine (Layer 2)
 *
 * Uses Claude Haiku to enhance proposals when rule engine confidence is low.
 * Called only when average confidence of key fields < 70%.
 */

import { callAi, AI_MODEL } from '@/lib/email/ai-client'
import { calculateEnrichmentConfidence } from './confidence'
import type {
  ProposalInput,
  ProposalEngineResult,
  ProposedFields,
  FieldConfidenceMap,
  RuleEngineContext,
  RecentTransaction,
  PastCorrection,
  VendorDescriptionPattern,
  VendorDescriptionSample,
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
export interface LLMProposalHints {
  /** Vendor the rule engine already resolved, if any. */
  vendorId?: string
  /** Name it suggested when no existing vendor matched. */
  vendorNameSuggestion?: string
}

export async function generateLLMProposal(
  item: ProposalInput,
  context: RuleEngineContext,
  hints?: LLMProposalHints
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

  // Account type decides what the amount's sign means; the prompt states the
  // convention explicitly so the model can't invert it.
  const accountType = context.paymentMethods.find((pm) => pm.id === item.paymentMethodId)?.type

  // The user's own descriptions for the vendor this item most likely belongs
  // to. For vendors where every purchase is different (Amazon, Lazada) this is
  // the only place the house style is visible — the frequency-based pattern
  // table is empty for them by construction.
  const vendorStyle = findVendorStyleExamples(context, hints?.vendorId)

  const prompt = buildPrompt(
    item,
    similarTxns,
    topVendors,
    context.paymentMethods,
    topTags,
    context.vendorDescriptionPatterns,
    relevantCorrections,
    item.rejectionFeedback,
    accountType,
    vendorStyle
  )

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
      // The model's self-scored confidence is not comparable to a rule-derived
      // one — an inverted sign reading can arrive at 95+. Cap it below every
      // signal-backed rule score so it can only beat the rule engine's
      // no-arithmetic default (80), never an arithmetic or classified type.
      score: Math.min(data.confidence.transaction_type || 80, 85),
      reasoning: data.reasoning.transaction_type || 'AI-classified transaction type',
      source: 'inferred',
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
    enrichmentConfidence: calculateEnrichmentConfidence(fieldConfidence),
    engine: 'llm',
    llmModel: AI_MODEL,
    llmPromptTokens: tokenUsage.promptTokens,
    llmResponseTokens: tokenUsage.responseTokens,
    durationMs: totalDurationMs,
  }
}

/**
 * The vendor's own recent descriptions, newest first.
 *
 * Returns null rather than an empty array so the prompt builder can leave the
 * section out entirely — an empty "here is the style" heading reads as "this
 * vendor has no style", which is not what an absent sample set means.
 */
function findVendorStyleExamples(
  context: RuleEngineContext,
  vendorId?: string
): { vendorName: string; samples: VendorDescriptionSample[] } | null {
  if (!vendorId) return null
  const samples = context.vendorDescriptionSamples?.get(vendorId)
  if (!samples || samples.length === 0) return null
  const vendorName = context.vendors.find((v) => v.id === vendorId)?.name || 'this vendor'
  return { vendorName, samples: samples.slice(0, 20) }
}

function buildPrompt(
  item: ProposalInput,
  similarTxns: RecentTransaction[],
  vendors: Array<{ id: string; name: string }>,
  paymentMethods: Array<{ id: string; name: string }>,
  tags: Array<{ id: string; name: string }>,
  vendorDescriptionPatterns?: VendorDescriptionPattern[],
  pastCorrections?: PastCorrection[],
  rejectionFeedback?: string[],
  accountType?: string,
  vendorStyle?: { vendorName: string; samples: VendorDescriptionSample[] } | null
): string {
  const parts: string[] = []

  parts.push(`You are a transaction categorization assistant for a personal finance app.`)
  parts.push(`Given a raw import item, propose the best vendor, description, transaction type, payment method, and tags.`)
  parts.push('')
  parts.push(`## Import Item`)
  parts.push(`- Description: "${item.description}"`)
  if (item.statementDescription && item.statementDescription !== item.description) {
    parts.push(`- Statement merchant descriptor: "${item.statementDescription}" (names where the money went; never use it as the description)`)
  }
  if (item.subject) parts.push(`- Email Subject: "${item.subject}"`)
  if (item.fromName) parts.push(`- From: ${item.fromName}${item.fromAddress ? ` (${item.fromAddress})` : ''}`)
  parts.push(`- Amount: ${item.amount} ${item.currency}`)
  parts.push(`- Date: ${item.date}`)
  parts.push(`- Source: ${item.sourceType}`)
  if (accountType) parts.push(`- Account type: ${accountType}`)
  if (item.parserKey) parts.push(`- Parser key: ${item.parserKey}`)
  if (item.paymentCardLastFour) parts.push(`- Payment card: ${item.paymentCardType || 'card'} ending ${item.paymentCardLastFour}`)
  if (item.senderName) parts.push(`- Sender: ${item.senderName}`)
  if (item.recipientName) parts.push(`- Recipient: ${item.recipientName}`)
  if (item.bankDetected) parts.push(`- Bank: ${item.bankDetected}`)
  if (item.detectedDirection) parts.push(`- Detected direction: ${item.detectedDirection} (based on bank account matching)`)

  // Multi-source enrichment: additional email/slip receipts the user has
  // manually attached to this queue item. They all describe the same
  // underlying transaction (e.g. multi-item Lazada order → multiple per-item
  // receipts → one credit card charge). Treat them as supporting context.
  if (item.extraEmailContext && item.extraEmailContext.length > 0) {
    parts.push('')
    parts.push(`## Additional Email Receipts (${item.extraEmailContext.length})`)
    parts.push(`The user has manually attached these additional email receipts. They describe the same transaction as the main item above (e.g. each line item from a multi-item order). Use them to better understand the vendor, what was purchased, and to write a more descriptive summary.`)
    for (const e of item.extraEmailContext) {
      const bits: string[] = []
      if (e.subject) bits.push(`subject: "${e.subject}"`)
      if (e.fromName) bits.push(`from: ${e.fromName}${e.fromAddress ? ` <${e.fromAddress}>` : ''}`)
      if (e.description) bits.push(`desc: "${e.description}"`)
      if (e.amount != null && e.currency) bits.push(`amount: ${e.amount} ${e.currency}`)
      if (e.date) bits.push(`date: ${e.date}`)
      parts.push(`- ${bits.join(' | ')}`)
    }
  }

  if (item.extraSlipContext && item.extraSlipContext.length > 0) {
    parts.push('')
    parts.push(`## Additional Payment Slips (${item.extraSlipContext.length})`)
    parts.push(`The user has manually attached these additional payment slips related to the same transaction.`)
    for (const s of item.extraSlipContext) {
      const bits: string[] = []
      if (s.senderName) bits.push(`from: ${s.senderName}`)
      if (s.recipientName) bits.push(`to: ${s.recipientName}`)
      if (s.memo) bits.push(`memo: "${s.memo}"`)
      if (s.amount != null && s.currency) bits.push(`amount: ${s.amount} ${s.currency}`)
      if (s.date) bits.push(`date: ${s.date}`)
      parts.push(`- ${bits.join(' | ')}`)
    }
  }

  // Online-retail orders: the raw description is one product-listing title,
  // which is neither complete (a shipment usually holds several items) nor
  // readable. The recovered item list is what the description must summarize.
  if (item.retailOrderItems && item.retailOrderItems.length > 0) {
    parts.push('')
    parts.push(`## Items in This Order (${item.retailOrderItems.length})`)
    parts.push(`These are the products on THIS charge, read from the order email. The "Description" field above is only the first product's raw listing title — describe the whole list below instead.`)
    for (const line of item.retailOrderItems) {
      const bits = [`"${line.name}"`]
      if (line.quantity > 1) bits.push(`qty ${line.quantity}`)
      if (line.amount != null) bits.push(`${line.amount} ${line.currency || item.currency}`)
      parts.push(`- ${bits.join(' | ')}`)
    }
  }

  if (vendorStyle) {
    parts.push('')
    parts.push(`## How the User Describes ${vendorStyle.vendorName} Purchases`)
    parts.push(`These are descriptions the user wrote themselves for this vendor, newest first. Match this VOICE — length, capitalization, level of detail, and any prefixes they use.`)
    parts.push(`Do NOT copy one verbatim unless this transaction really is the same purchase. The amounts are given so you can judge that: a description written on a 3,500 THB charge must not be reused on a 400 THB one.`)
    for (const s of vendorStyle.samples) {
      const amountCtx = s.currency ? ` (${s.amount} ${s.currency})` : ''
      parts.push(`- "${s.description}"${amountCtx}`)
    }
  }

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
      parts.push(`These are the user's preferred description formats for each vendor, with the amount range each was historically used for.`)
      parts.push(`Reuse a pattern ONLY when this transaction's amount is in the same range (same order of magnitude). A ฿45 transfer labelled "Monthly Rent" because the vendor once received rent is WRONG — when the amount doesn't fit, write a neutral description from the raw data instead.`)
      for (const p of topPatterns) {
        const range = p.minAmount != null && p.maxAmount != null && p.currency
          ? `, typical amount ${p.minAmount}–${p.maxAmount} ${p.currency}`
          : ''
        parts.push(`- ${p.vendorName}: "${p.description}" (used ${p.count}x, ${Math.round(p.frequency * 100)}%${range})`)
      }
    }
  }

  // Past corrections — teach the LLM from user feedback
  if (pastCorrections && pastCorrections.length > 0) {
    parts.push('')
    parts.push(`## User Corrections (learn from these)`)
    parts.push(`The user has previously corrected proposals. Apply the same corrections to similar items — but ONLY when this transaction's amount is in the same range as the corrected one. Do not label a small transfer "Rent" because a rent-sized transfer from the same sender was once corrected to that.`)
    for (const c of pastCorrections) {
      const amountCtx = c.amount != null && c.currency ? ` (on a ${c.amount} ${c.currency} transaction)` : ''
      if (c.field === 'vendor_id' && c.correctedVendorName) {
        const from = c.originalVendorName || String(c.originalValue || 'none')
        parts.push(`- Description "${c.sourceDescription}"${c.fromAddress ? ` from ${c.fromAddress}` : ''}: corrected vendor from "${from}" to "${c.correctedVendorName}"${amountCtx}`)
      } else if (c.field === 'description') {
        parts.push(`- Corrected description from "${c.originalValue}" to "${c.correctedValue}"${c.fromAddress ? ` (sender: ${c.fromAddress})` : ''}${amountCtx}`)
      } else if (c.field === 'tag_ids') {
        parts.push(`- Corrected tags for "${c.sourceDescription}": ${JSON.stringify(c.correctedValue)}`)
      } else if (c.field === 'payment_method_id') {
        parts.push(`- Corrected payment method for "${c.sourceDescription}": ${c.correctedValue}`)
      } else if (c.field === 'date') {
        parts.push(`- Corrected date from "${c.originalValue}" to "${c.correctedValue}"${c.parserKey ? ` (parser: ${c.parserKey})` : ''}`)
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
  parts.push(`### Online retail & marketplace orders (Amazon, Lazada, and similar)`)
  parts.push(`The raw description for these is the SELLER'S product-listing title — keyword soup written to win search results, not to describe anything. NEVER pass it through, and never merely truncate it. Say what the thing IS, the way the user would:`)
  parts.push(`- Name the product in 2-6 words. "Wine Saver with Bottle Stoppers", not "Vacu Vin Original Wine Saver with 2 Vacuum Bottle Stoppers – Wine Preserver Pump for Red or White Wine – Manual Air Remo".`)
  parts.push(`- Keep the brand only when it identifies the product ("Anker Power Bank", "Philips Norelco Shaving Heads SH60/72", "ZUGU Case for iPad Pro 11"). Drop no-name seller brands: "TACVASEN Workout Shirts for Men Muscle Tank Top … Mulled Teal XL" is just "Workout Tank Tops".`)
  parts.push(`- Several DIFFERENT items on one charge: comma-separated, most expensive or most significant first — "Magnesium, Tote Bag", "Command Strips, Command Mini Clips", "Golf Balls, Loofa".`)
  parts.push(`- Several of the SAME item: collapse to one name with a count — "Workout Tank Tops (4)".`)
  parts.push(`- Drop sizes, colours, model variants, pack counts, and marketing adjectives unless the variant IS the point of the purchase.`)
  parts.push(`- Use the user's prefixes when they apply: "Gift for [Name]: ...", "Refund: ...", "Book: ...", "Game: ...", "Annual Subscription: ...".`)
  parts.push(`- Title Case, no trailing punctuation, at most ~60 characters.`)
  parts.push(`- If the raw description is a stand-in like "Amazon order (2 sub-orders)" or "Multiple orders: ...", it carries no information — describe the itemized list instead. If there is no item list either, write the neutral "[Vendor] Order" rather than inventing goods.`)
  parts.push('')
  parts.push(`### Never describe more than the evidence supports`)
  parts.push(`- When the ONLY source is a statement merchant descriptor — no email receipt, no item list — you do not know what was bought. Say what is known and stop: "Amazon Order", "Wawa", "Lazada Order". Borrowing a description from a different purchase at the same vendor is a fabrication, no matter how close the amounts are.`)
  parts.push(`- Never return a cleaned-up merchant descriptor as the description. "AMAZON MKTPL BJ3IM3GE1 Amzn.com/bill WA", "WAWA# 5216 VENICE FL", "TST* FOXTAIL COFFEE" are processor strings — strip the store numbers, reference codes, city and state and use the merchant name, or the convention that fits it ("Coffee: Foxtail Coffee").`)
  parts.push(`- A vendor's past descriptions show you their VOICE. They are not evidence about this transaction.`)
  parts.push('')
  parts.push(`## Instructions`)
  parts.push(`1. Match the description to an existing vendor if possible (use the vendor ID). If no match, suggest a clean vendor name.`)
  parts.push(`2. Write a clean, human-readable description following the Description Conventions above. When this vendor's own past descriptions are listed, they outrank the generic conventions — imitate them. Never echo a raw import description back unchanged when it reads as machine output.`)
  parts.push(`3. Classify as "expense", "income", or "transfer". The amount's SIGN is ground truth — never reinterpret it:`)
  parts.push(`   - Bank/debit accounts: POSITIVE = money leaving the account (expense); NEGATIVE = money arriving (income).`)
  parts.push(`   - Credit cards: POSITIVE = a charge (expense); NEGATIVE = a refund/credit or a payment toward the card balance — NEVER income.`)
  parts.push(`   - A row that is one leg of a movement between the user's own accounts (e.g. "AUTOMATIC PAYMENT - THANK YOU", autopay, card payment) is a "transfer".`)
  parts.push(`4. Suggest a payment method if you can determine one. If a payment card (last 4 digits or type) is provided, match it to a payment method that has matching card details.`)
  parts.push(`5. Suggest up to 3 relevant tags.`)
  parts.push(`6. For each field, provide a confidence score (0-100) and brief reasoning.`)
  parts.push('')
  parts.push(`Return JSON with this structure:`)
  parts.push(`{`)
  parts.push(`  "vendor_id": "uuid or null",`)
  parts.push(`  "vendor_name": "suggested name if no vendor_id match",`)
  parts.push(`  "description": "clean description",`)
  parts.push(`  "transaction_type": "expense" | "income" | "transfer",`)
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
