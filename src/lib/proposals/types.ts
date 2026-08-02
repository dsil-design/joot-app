/**
 * Smart Transaction Proposals — Type Definitions
 */

// ── Per-field confidence ─────────────────────────────────────────────────

/**
 * Where a field's value came from, which decides whether a later layer
 * (the LLM) is allowed to overrule it.
 *
 * - `arithmetic` — derived from the source document's own numbers: the amount,
 *   the currency, the posting date, or the sign of the amount read against the
 *   account type. These are facts, not opinions, and the LLM may never
 *   override them.
 * - `inferred`   — derived from a heuristic over real signals (learned
 *   mappings, classification, vendor history). Overridable by a
 *   higher-confidence layer.
 * - `default`    — a fallback used when nothing was known. Freely overridable.
 *
 * Optional so proposals persisted before this field existed still parse.
 */
/**
 * Where a field's value came from.
 *
 * 'arithmetic' and 'user_rule' are both protected from LLM override in
 * hybrid-engine's mergeResults: the first is ground truth read off the source
 * document, the second is an explicit instruction from the user. Everything
 * else is a guess the LLM is allowed to improve on.
 */
export type ConfidenceSource = 'arithmetic' | 'user_rule' | 'inferred' | 'default'

export interface FieldConfidence {
  score: number    // 0-100
  reasoning: string
  source?: ConfidenceSource
}

export type FieldConfidenceMap = Record<string, FieldConfidence>

// ── UI-layer proposal types (matches DESIGN_SPEC.md Section 3) ──────────

export interface ProposedField<T> {
  value: T
  confidence: number
  reasoning: string
}

export interface TransactionProposal {
  id: string
  overallConfidence: number
  /**
   * Confidence in the guessed fields only (vendor, description, tags).
   * overallConfidence blends in amount/currency/date — which score 95-100 by
   * construction — so it cannot separate good enrichment from bad; this can.
   * Null for proposals generated before the split.
   */
  enrichmentConfidence?: number | null
  generatedAt: string
  engine: 'rule_based' | 'llm' | 'hybrid'
  status: 'pending' | 'accepted' | 'modified' | 'rejected' | 'stale'

  vendor?: ProposedField<{
    id: string | null
    name: string
    alternatives?: Array<{ id: string; name: string; confidence: number }>
  }>

  amount?: ProposedField<number>
  currency?: ProposedField<string>
  date?: ProposedField<string>

  paymentMethod?: ProposedField<{
    id: string
    name: string
  }>

  tags?: ProposedField<Array<{
    id: string
    name: string
  }>>

  transactionType?: ProposedField<'expense' | 'income' | 'transfer'>
  description?: ProposedField<string>
}

// ── Engine types ─────────────────────────────────────────────────────────

export type ProposalSourceType = 'statement' | 'email' | 'merged' | 'payment_slip'
export type ProposalEngine = 'rule_based' | 'llm' | 'hybrid'
export type ProposalStatus = 'pending' | 'accepted' | 'modified' | 'rejected' | 'stale'

export interface ProposedFields {
  description?: string
  amount?: number
  currency?: string
  transactionType?: 'expense' | 'income' | 'transfer'
  date?: string
  vendorId?: string | null
  vendorNameSuggestion?: string
  paymentMethodId?: string
  tagIds?: string[]
  /**
   * IDs of the auto-tag rules that contributed tags. Not persisted on the
   * proposal — used only to bump each rule's usage counter after generation.
   */
  autoTagRuleIds?: string[]
}

export interface ProposalEngineResult {
  fields: ProposedFields
  fieldConfidence: FieldConfidenceMap
  overallConfidence: number
  /** Confidence over vendor/description/tags only — see TransactionProposal. */
  enrichmentConfidence: number
  engine: ProposalEngine
  llmModel?: string
  llmPromptTokens?: number
  llmResponseTokens?: number
  durationMs: number
}

// ── DB row type ──────────────────────────────────────────────────────────

export interface TransactionProposalRow {
  id: string
  user_id: string
  source_type: ProposalSourceType
  composite_id: string
  statement_upload_id?: string | null
  suggestion_index?: number | null
  email_transaction_id?: string | null
  proposed_description?: string | null
  proposed_amount?: number | null
  proposed_currency?: string | null
  proposed_transaction_type?: 'expense' | 'income' | 'transfer' | null
  proposed_date?: string | null
  proposed_vendor_id?: string | null
  proposed_vendor_name_suggestion?: string | null
  proposed_payment_method_id?: string | null
  proposed_tag_ids?: string[] | null
  field_confidence: FieldConfidenceMap
  overall_confidence: number
  enrichment_confidence?: number | null
  engine: ProposalEngine
  llm_model?: string | null
  llm_prompt_tokens?: number | null
  llm_response_tokens?: number | null
  generation_duration_ms?: number | null
  status: ProposalStatus
  accepted_at?: string | null
  created_transaction_id?: string | null
  user_modifications?: Record<string, { from: unknown; to: unknown }> | null
  created_at: string
  updated_at: string
}

// ── API types ────────────────────────────────────────────────────────────

export interface ProposalGenerateRequest {
  compositeIds?: string[]
  statementUploadId?: string
  emailTransactionIds?: string[]
  regenerateStale?: boolean
  force?: boolean
}

export interface ProposalGenerateResponse {
  generated: number
  skipped: number
  errors: number
  ruleOnly: number
  llmEnhanced: number
  durationMs: number
  /**
   * Composite ids that failed generation this pass. Callers can retry just
   * these (POST the same endpoint with `compositeIds`) instead of a partial
   * failure silently vanishing into the `errors` count.
   */
  failedCompositeIds: string[]
}

// ── Past corrections (feedback learning) ─────────────────────────────────

export interface PastCorrection {
  /** Which field was corrected */
  field: 'vendor_id' | 'description' | 'tag_ids' | 'payment_method_id' | 'transaction_type' | 'date'
  /** Matching context: email sender address */
  fromAddress?: string
  /** Matching context: email sender name */
  fromName?: string
  /** Matching context: parser key */
  parserKey?: string
  /** Original import description (for similarity matching) */
  sourceDescription: string
  /** Vendor that the proposal was associated with at the time of correction */
  vendorId?: string
  /** What the system proposed */
  originalValue: unknown
  /** What the user corrected to */
  correctedValue: unknown
  /** Resolved vendor name (when field is vendor_id) */
  originalVendorName?: string
  correctedVendorName?: string
  /**
   * Amount context of the transaction the correction was made on. A
   * description corrected to "Rent" on a ฿3,500 transfer must not be reused
   * on a ฿400 one — without the amount there is nothing to gate on.
   */
  amount?: number
  currency?: string
  /** When the correction was made */
  correctedAt: string
}

// ── Rule engine context ──────────────────────────────────────────────────

export interface VendorRecord {
  id: string
  name: string
  transactionCount: number
}

export interface PaymentMethodRecord {
  id: string
  name: string
  type?: string
  preferredCurrency?: string
  cardLastFour?: string | null
}

export interface TagRecord {
  id: string
  name: string
  usageCount: number
}

export interface VendorTagFrequency {
  vendorId: string
  tagId: string
  tagName: string
  frequency: number // 0-1
  count: number
}

export interface VendorDescriptionPattern {
  vendorId: string
  vendorName: string
  description: string
  count: number
  frequency: number // 0-1
  totalTransactions: number
  /**
   * Historical amount band for this pattern (absolute amounts in
   * `currency`, the dominant currency among the pattern's transactions).
   * Reusing a learned description on an amount far outside this band is how
   * a ฿45 transfer got labeled "Property Rent" — gate on it.
   */
  minAmount?: number
  maxAmount?: number
  currency?: string
}

export interface RecentTransaction {
  id: string
  description: string
  amount: number
  currency: string
  date: string
  vendorId?: string
  vendorName?: string
  paymentMethodId?: string
  transactionType: 'expense' | 'income' | 'transfer'
  tagIds: string[]
}

export interface VendorRecipientMappingRecord {
  recipientNameNormalized: string
  vendorId: string
  vendorName?: string
  parserKey: string
  matchCount: number
}

export interface StatementDescriptionMappingRecord {
  descriptionNormalized: string
  vendorId: string
  vendorName?: string
  paymentMethodId: string | null
  matchCount: number
}

/**
 * A user-authored auto-tagging rule. Unlike VendorTagFrequency (inferred from
 * history) this is explicit intent and fires on the first matching item.
 */
export interface AutoTagRuleRecord {
  id: string
  matchType: 'vendor' | 'counterparty_pattern'
  vendorId: string | null
  pattern: string | null
  /** Narrowing filter; null means the rule applies to any transaction type. */
  transactionType: 'expense' | 'income' | 'transfer' | null
  /** Narrowing filter; null/empty means the rule applies to any source. */
  sourceTypes: string[] | null
  tagIds: string[]
  priority: number
}

export interface RuleEngineContext {
  vendors: VendorRecord[]
  paymentMethods: PaymentMethodRecord[]
  tags: TagRecord[]
  recentTransactions: RecentTransaction[]
  vendorTagFrequency: VendorTagFrequency[]
  vendorDescriptionPatterns: VendorDescriptionPattern[]
  pastCorrections: PastCorrection[]
  vendorRecipientMappings: VendorRecipientMappingRecord[]
  statementDescriptionMappings: StatementDescriptionMappingRecord[]
  autoTagRules: AutoTagRuleRecord[]
  statementPaymentMethodId?: string
  statementPaymentMethodName?: string
}

// ── Queue item input for proposal engine ─────────────────────────────────

export interface ProposalInput {
  compositeId: string
  sourceType: ProposalSourceType
  statementUploadId?: string
  suggestionIndex?: number
  emailTransactionId?: string

  // Import data
  description: string
  amount: number
  currency: string
  date: string

  // Email-specific
  subject?: string
  fromAddress?: string
  fromName?: string
  vendorId?: string
  vendorNameRaw?: string
  parserKey?: string
  classification?: string
  extractionConfidence?: number
  paymentCardLastFour?: string
  paymentCardType?: string

  // Statement-specific
  paymentMethodId?: string
  paymentMethodName?: string

  // Payment slip-specific
  paymentSlipUploadId?: string
  paymentSlipDescription?: string
  senderName?: string
  recipientName?: string
  bankDetected?: string
  detectedDirection?: 'expense' | 'income' | 'transfer'

  // Prior rejection feedback (for re-queued items)
  rejectionFeedback?: string[]
  /** User-specified correct date from rejection feedback (overrides source date) */
  correctedDate?: string
  /** Secondary date from the paired email (for merged items) */
  emailDate?: string
  /** Secondary date from the paired payment slip (for merged items with slip) */
  slipDate?: string

  // Multi-source enrichment: additional email/slip context attached to this
  // queue item via "Attach a source". Pre-loaded by the route handler so the
  // LLM engine stays pure (no DB access). Used for cases like multi-item
  // Lazada orders where each item has its own email receipt but the credit
  // card aggregates them into a single charge.
  extraEmailContext?: Array<{
    subject?: string
    fromName?: string
    fromAddress?: string
    description?: string
    amount?: number
    currency?: string
    date?: string
  }>
  extraSlipContext?: Array<{
    senderName?: string
    recipientName?: string
    memo?: string
    amount?: number
    currency?: string
    date?: string
  }>
}
