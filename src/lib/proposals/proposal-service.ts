/**
 * Proposal Persistence Service
 *
 * CRUD + orchestration for transaction proposals.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateHybridProposal } from './hybrid-engine'
import { parseImportId } from '@/lib/utils/import-id'
import type {
  ProposalInput,
  ProposalEngineResult,
  RuleEngineContext,
  VendorRecord,
  PaymentMethodRecord,
  TagRecord,
  VendorTagFrequency,
  RecentTransaction,
  TransactionProposalRow,
  ProposalGenerateResponse,
  TransactionProposal,
  FieldConfidenceMap,
} from './types'

/**
 * Pre-fetch all reference data needed by the rule engine.
 * Called once per batch to avoid repeated queries.
 */
export async function prefetchRuleEngineContext(
  supabase: SupabaseClient,
  userId: string,
  dateRange?: { from: string; to: string }
): Promise<RuleEngineContext> {
  const [vendors, paymentMethods, tags, recentTxns, vendorTagFreqs] = await Promise.all([
    fetchVendors(supabase, userId),
    fetchPaymentMethods(supabase, userId),
    fetchTags(supabase, userId),
    fetchRecentTransactions(supabase, userId, dateRange),
    fetchVendorTagFrequency(supabase, userId),
  ])

  return {
    vendors,
    paymentMethods,
    tags,
    recentTransactions: recentTxns,
    vendorTagFrequency: vendorTagFreqs,
  }
}

async function fetchVendors(supabase: SupabaseClient, userId: string): Promise<VendorRecord[]> {
  // Get vendors with transaction counts
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('user_id', userId)
    .order('name')

  if (!vendors) return []

  // Get transaction counts per vendor
  const { data: counts } = await supabase
    .from('transactions')
    .select('vendor_id')
    .eq('user_id', userId)
    .not('vendor_id', 'is', null)

  const countMap = new Map<string, number>()
  if (counts) {
    for (const row of counts) {
      if (row.vendor_id) {
        countMap.set(row.vendor_id, (countMap.get(row.vendor_id) || 0) + 1)
      }
    }
  }

  return vendors.map((v) => ({
    id: v.id,
    name: v.name,
    transactionCount: countMap.get(v.id) || 0,
  }))
}

async function fetchPaymentMethods(supabase: SupabaseClient, userId: string): Promise<PaymentMethodRecord[]> {
  const { data } = await supabase
    .from('payment_methods')
    .select('id, name, type, preferred_currency')
    .eq('user_id', userId)

  return (data || []).map((pm) => ({
    id: pm.id,
    name: pm.name,
    type: pm.type || undefined,
    preferredCurrency: pm.preferred_currency || undefined,
  }))
}

async function fetchTags(supabase: SupabaseClient, userId: string): Promise<TagRecord[]> {
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId)

  if (!tags) return []

  const { data: tagCounts } = await supabase
    .from('transaction_tags')
    .select('tag_id')

  const countMap = new Map<string, number>()
  if (tagCounts) {
    for (const row of tagCounts) {
      countMap.set(row.tag_id, (countMap.get(row.tag_id) || 0) + 1)
    }
  }

  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    usageCount: countMap.get(t.id) || 0,
  }))
}

async function fetchRecentTransactions(
  supabase: SupabaseClient,
  userId: string,
  dateRange?: { from: string; to: string }
): Promise<RecentTransaction[]> {
  let query = supabase
    .from('transactions')
    .select('id, description, amount, original_currency, transaction_date, vendor_id, payment_method_id, transaction_type, vendors(name)')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .limit(200)

  if (dateRange) {
    // Widen range by 90 days for pattern matching
    const from = shiftDate(dateRange.from, -90)
    const to = shiftDate(dateRange.to, 30)
    query = query.gte('transaction_date', from).lte('transaction_date', to)
  }

  const { data } = await query

  if (!data) return []

  // Fetch tag associations for these transactions
  const txIds = data.map((tx) => tx.id)
  const { data: tagLinks } = await supabase
    .from('transaction_tags')
    .select('transaction_id, tag_id')
    .in('transaction_id', txIds.slice(0, 200)) // limit to avoid too-large IN clause

  const tagMap = new Map<string, string[]>()
  if (tagLinks) {
    for (const link of tagLinks) {
      const existing = tagMap.get(link.transaction_id) || []
      existing.push(link.tag_id)
      tagMap.set(link.transaction_id, existing)
    }
  }

  return data.map((tx) => ({
    id: tx.id,
    description: tx.description || '',
    amount: Number(tx.amount),
    currency: tx.original_currency,
    date: tx.transaction_date,
    vendorId: tx.vendor_id || undefined,
    vendorName: (tx.vendors as { name: string } | null)?.name || undefined,
    paymentMethodId: tx.payment_method_id || undefined,
    transactionType: tx.transaction_type as 'expense' | 'income',
    tagIds: tagMap.get(tx.id) || [],
  }))
}

async function fetchVendorTagFrequency(
  supabase: SupabaseClient,
  userId: string
): Promise<VendorTagFrequency[]> {
  // Get vendor -> tag associations with frequency
  const { data: txns } = await supabase
    .from('transactions')
    .select('id, vendor_id')
    .eq('user_id', userId)
    .not('vendor_id', 'is', null)

  if (!txns || txns.length === 0) return []

  const txIds = txns.map((t) => t.id)
  const { data: tagLinks } = await supabase
    .from('transaction_tags')
    .select('transaction_id, tag_id, tags(name)')
    .in('transaction_id', txIds.slice(0, 500))

  if (!tagLinks) return []

  // Build vendor -> tag frequency map
  const vendorTxCount = new Map<string, number>()
  const vendorTagCount = new Map<string, Map<string, { name: string; count: number }>>()

  for (const tx of txns) {
    if (tx.vendor_id) {
      vendorTxCount.set(tx.vendor_id, (vendorTxCount.get(tx.vendor_id) || 0) + 1)
    }
  }

  // Map transaction_id -> vendor_id
  const txVendorMap = new Map<string, string>()
  for (const tx of txns) {
    if (tx.vendor_id) txVendorMap.set(tx.id, tx.vendor_id)
  }

  for (const link of tagLinks) {
    const vendorId = txVendorMap.get(link.transaction_id)
    if (!vendorId) continue

    const tagName = (link.tags as { name: string } | null)?.name || ''
    let vendorMap = vendorTagCount.get(vendorId)
    if (!vendorMap) {
      vendorMap = new Map()
      vendorTagCount.set(vendorId, vendorMap)
    }
    const existing = vendorMap.get(link.tag_id) || { name: tagName, count: 0 }
    existing.count++
    vendorMap.set(link.tag_id, existing)
  }

  // Build result
  const results: VendorTagFrequency[] = []
  for (const [vendorId, tagMap] of vendorTagCount) {
    const totalTxns = vendorTxCount.get(vendorId) || 1
    for (const [tagId, data] of tagMap) {
      results.push({
        vendorId,
        tagId,
        tagName: data.name,
        frequency: data.count / totalTxns,
        count: data.count,
      })
    }
  }

  return results
}

/**
 * Generate and store proposals for a set of import items.
 */
export async function generateAndStoreProposals(
  supabase: SupabaseClient,
  userId: string,
  items: ProposalInput[],
  options?: { force?: boolean; context?: RuleEngineContext }
): Promise<ProposalGenerateResponse> {
  const startTime = Date.now()
  const response: ProposalGenerateResponse = {
    generated: 0,
    skipped: 0,
    errors: 0,
    ruleOnly: 0,
    llmEnhanced: 0,
    durationMs: 0,
  }

  if (items.length === 0) {
    return response
  }

  // Pre-fetch context if not provided
  const dateRange = getDateRange(items)
  const context = options?.context || await prefetchRuleEngineContext(supabase, userId, dateRange)

  // Check existing proposals unless force
  let existingCompositeIds = new Set<string>()
  if (!options?.force) {
    const { data: existing } = await supabase
      .from('transaction_proposals')
      .select('composite_id')
      .eq('user_id', userId)
      .in('composite_id', items.map((i) => i.compositeId))
      .in('status', ['pending', 'accepted', 'modified'])

    if (existing) {
      existingCompositeIds = new Set(existing.map((e) => e.composite_id))
    }
  }

  // Filter to only items that need generation
  const itemsToProcess = items.filter((item) => {
    if (!options?.force && existingCompositeIds.has(item.compositeId)) {
      response.skipped++
      return false
    }
    return true
  })

  // Process in parallel batches of 5
  const BATCH_SIZE = 5
  for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
    const batch = itemsToProcess.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const itemContext: RuleEngineContext = {
          ...context,
          statementPaymentMethodId: item.paymentMethodId,
          statementPaymentMethodName: item.paymentMethodName,
        }

        const result = await generateHybridProposal(item, itemContext)
        await upsertProposal(supabase, userId, item, result)
        return result
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        response.generated++
        if (result.value.engine === 'rule_based') response.ruleOnly++
        else response.llmEnhanced++
      } else {
        console.error('Error generating proposal:', result.reason)
        response.errors++
      }
    }
  }

  response.durationMs = Date.now() - startTime
  return response
}

/**
 * Insert or update a proposal in the database.
 */
async function upsertProposal(
  supabase: SupabaseClient,
  userId: string,
  item: ProposalInput,
  result: ProposalEngineResult
): Promise<void> {
  const parsed = parseImportId(item.compositeId)

  const row = {
    user_id: userId,
    source_type: item.sourceType,
    composite_id: item.compositeId,
    statement_upload_id: item.statementUploadId || null,
    suggestion_index: item.suggestionIndex ?? null,
    email_transaction_id: item.emailTransactionId || null,
    proposed_description: result.fields.description || null,
    proposed_amount: result.fields.amount ?? null,
    proposed_currency: result.fields.currency || null,
    proposed_transaction_type: result.fields.transactionType || null,
    proposed_date: result.fields.date || null,
    proposed_vendor_id: result.fields.vendorId || null,
    proposed_vendor_name_suggestion: result.fields.vendorNameSuggestion || null,
    proposed_payment_method_id: result.fields.paymentMethodId || null,
    proposed_tag_ids: result.fields.tagIds || [],
    field_confidence: result.fieldConfidence,
    overall_confidence: result.overallConfidence,
    engine: result.engine,
    llm_model: result.llmModel || null,
    llm_prompt_tokens: result.llmPromptTokens || null,
    llm_response_tokens: result.llmResponseTokens || null,
    generation_duration_ms: result.durationMs,
    status: 'pending' as const,
  }

  // Upsert by composite_id + user_id
  await supabase
    .from('transaction_proposals')
    .upsert(row, { onConflict: 'composite_id,user_id' })

  // Suppress the unused variable warning — parsed is used for validation/debugging
  void parsed
}

/**
 * Bulk fetch proposals for queue items.
 */
export async function getProposalsForItems(
  supabase: SupabaseClient,
  userId: string,
  compositeIds: string[]
): Promise<Map<string, TransactionProposalRow>> {
  if (compositeIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('transaction_proposals')
    .select('*')
    .eq('user_id', userId)
    .in('composite_id', compositeIds)

  if (error || !data) return new Map()

  const map = new Map<string, TransactionProposalRow>()
  for (const row of data) {
    map.set(row.composite_id, row as TransactionProposalRow)
  }
  return map
}

/**
 * Update proposal status after user action.
 */
export async function updateProposalStatus(
  supabase: SupabaseClient,
  proposalId: string,
  status: 'accepted' | 'modified' | 'rejected',
  options?: {
    createdTransactionId?: string
    userModifications?: Record<string, { from: unknown; to: unknown }>
  }
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    accepted_at: status === 'accepted' || status === 'modified' ? new Date().toISOString() : null,
  }

  if (options?.createdTransactionId) {
    update.created_transaction_id = options.createdTransactionId
  }

  if (options?.userModifications) {
    update.user_modifications = options.userModifications
  }

  await supabase
    .from('transaction_proposals')
    .update(update)
    .eq('id', proposalId)
}

/**
 * Mark proposals as stale.
 */
export async function markStaleProposals(
  supabase: SupabaseClient,
  userId: string,
  compositeIds?: string[]
): Promise<number> {
  let query = supabase
    .from('transaction_proposals')
    .update({ status: 'stale' })
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (compositeIds && compositeIds.length > 0) {
    query = query.in('composite_id', compositeIds)
  }

  const { count } = await query.select('id', { count: 'exact', head: true })
  return count || 0
}

/**
 * Transform a DB row into the UI-layer TransactionProposal type.
 * Resolves vendor/PM/tag names from context.
 */
export function transformProposalRow(
  row: TransactionProposalRow,
  context: {
    vendors: Map<string, string>
    paymentMethods: Map<string, string>
    tags: Map<string, string>
  }
): TransactionProposal {
  const fc = row.field_confidence as FieldConfidenceMap

  const proposal: TransactionProposal = {
    id: row.id,
    overallConfidence: row.overall_confidence,
    generatedAt: row.created_at,
    engine: row.engine,
    status: row.status,
  }

  // Amount
  if (row.proposed_amount != null) {
    proposal.amount = {
      value: Number(row.proposed_amount),
      confidence: fc.amount?.score ?? 95,
      reasoning: fc.amount?.reasoning ?? 'From import source',
    }
  }

  // Currency
  if (row.proposed_currency) {
    proposal.currency = {
      value: row.proposed_currency,
      confidence: fc.currency?.score ?? 95,
      reasoning: fc.currency?.reasoning ?? 'From import source',
    }
  }

  // Date
  if (row.proposed_date) {
    proposal.date = {
      value: row.proposed_date,
      confidence: fc.date?.score ?? 90,
      reasoning: fc.date?.reasoning ?? 'From import source',
    }
  }

  // Transaction type
  if (row.proposed_transaction_type) {
    proposal.transactionType = {
      value: row.proposed_transaction_type,
      confidence: fc.transaction_type?.score ?? 80,
      reasoning: fc.transaction_type?.reasoning ?? 'Default',
    }
  }

  // Vendor
  if (row.proposed_vendor_id || row.proposed_vendor_name_suggestion) {
    const vendorName = row.proposed_vendor_id
      ? (context.vendors.get(row.proposed_vendor_id) || row.proposed_vendor_name_suggestion || 'Unknown')
      : (row.proposed_vendor_name_suggestion || 'Unknown')

    proposal.vendor = {
      value: {
        id: row.proposed_vendor_id,
        name: vendorName,
      },
      confidence: fc.vendor_id?.score ?? 0,
      reasoning: fc.vendor_id?.reasoning ?? 'No match',
    }
  }

  // Payment method
  if (row.proposed_payment_method_id) {
    const pmName = context.paymentMethods.get(row.proposed_payment_method_id) || 'Unknown'
    proposal.paymentMethod = {
      value: {
        id: row.proposed_payment_method_id,
        name: pmName,
      },
      confidence: fc.payment_method_id?.score ?? 0,
      reasoning: fc.payment_method_id?.reasoning ?? 'No match',
    }
  }

  // Tags
  if (row.proposed_tag_ids && row.proposed_tag_ids.length > 0) {
    const tagValues = row.proposed_tag_ids
      .map((id) => ({
        id,
        name: context.tags.get(id) || 'Unknown',
      }))
      .filter((t) => t.name !== 'Unknown')

    if (tagValues.length > 0) {
      proposal.tags = {
        value: tagValues,
        confidence: fc.tag_ids?.score ?? 0,
        reasoning: fc.tag_ids?.reasoning ?? 'No tags',
      }
    }
  }

  // Description
  if (row.proposed_description) {
    proposal.description = {
      value: row.proposed_description,
      confidence: fc.description?.score ?? 75,
      reasoning: fc.description?.reasoning ?? 'From import',
    }
  }

  return proposal
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getDateRange(items: ProposalInput[]): { from: string; to: string } | undefined {
  const dates = items.map((i) => i.date).filter(Boolean).sort()
  if (dates.length === 0) return undefined
  return { from: dates[0], to: dates[dates.length - 1] }
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}
