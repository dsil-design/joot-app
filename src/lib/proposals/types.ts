/**
 * Smart Transaction Proposals — Type Definitions
 */

// ── Per-field confidence ─────────────────────────────────────────────────

export interface FieldConfidence {
  score: number    // 0-100
  reasoning: string
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

  transactionType?: ProposedField<'expense' | 'income'>
  description?: ProposedField<string>
}

// ── Engine types ─────────────────────────────────────────────────────────

export type ProposalSourceType = 'statement' | 'email' | 'merged'
export type ProposalEngine = 'rule_based' | 'llm' | 'hybrid'
export type ProposalStatus = 'pending' | 'accepted' | 'modified' | 'rejected' | 'stale'

export interface ProposedFields {
  description?: string
  amount?: number
  currency?: string
  transactionType?: 'expense' | 'income'
  date?: string
  vendorId?: string | null
  vendorNameSuggestion?: string
  paymentMethodId?: string
  tagIds?: string[]
}

export interface ProposalEngineResult {
  fields: ProposedFields
  fieldConfidence: FieldConfidenceMap
  overallConfidence: number
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
  proposed_transaction_type?: 'expense' | 'income' | null
  proposed_date?: string | null
  proposed_vendor_id?: string | null
  proposed_vendor_name_suggestion?: string | null
  proposed_payment_method_id?: string | null
  proposed_tag_ids?: string[] | null
  field_confidence: FieldConfidenceMap
  overall_confidence: number
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
  transactionType: 'expense' | 'income'
  tagIds: string[]
}

export interface RuleEngineContext {
  vendors: VendorRecord[]
  paymentMethods: PaymentMethodRecord[]
  tags: TagRecord[]
  recentTransactions: RecentTransaction[]
  vendorTagFrequency: VendorTagFrequency[]
  vendorDescriptionPatterns: VendorDescriptionPattern[]
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
  vendorId?: string
  vendorNameRaw?: string
  parserKey?: string
  classification?: string
  extractionConfidence?: number

  // Statement-specific
  paymentMethodId?: string
  paymentMethodName?: string
}
