/**
 * Type definitions for recurring transactions and month template system
 */

import type { CurrencyType, TransactionType } from '@/lib/supabase/types'

// Re-export types for convenience
export type { CurrencyType, TransactionType } from '@/lib/supabase/types'

// ============================================================================
// TRANSACTION TEMPLATES
// ============================================================================

export type FrequencyType = 'monthly' | 'bi-weekly' | 'weekly' | 'quarterly' | 'annually' | 'custom'

export interface TransactionTemplate {
  id: string
  user_id: string

  // Template identification
  name: string
  description: string | null
  is_active: boolean

  // Transaction details
  vendor_id: string | null
  payment_method_id: string | null
  amount: number
  original_currency: CurrencyType
  transaction_type: TransactionType

  // Recurrence pattern
  frequency: FrequencyType
  frequency_interval: number
  day_of_month: number | null
  day_of_week: number | null

  // Schedule boundaries
  start_date: string // ISO date string
  end_date: string | null

  // Metadata
  created_at: string
  updated_at: string

  // Joined data
  vendor?: {
    id: string
    name: string
  }
  payment_method?: {
    id: string
    name: string
  }
  tags?: Array<{
    id: string
    name: string
    color: string
  }>
}

export interface CreateTemplateData {
  name: string
  description?: string
  vendor_id?: string
  payment_method_id?: string
  amount: number
  original_currency: CurrencyType
  transaction_type: TransactionType
  frequency: FrequencyType
  frequency_interval?: number
  day_of_month?: number
  day_of_week?: number
  start_date: string
  end_date?: string
  tag_ids?: string[]
}

export interface UpdateTemplateData {
  name?: string
  description?: string
  is_active?: boolean
  vendor_id?: string
  payment_method_id?: string
  amount?: number
  original_currency?: CurrencyType
  frequency?: FrequencyType
  frequency_interval?: number
  day_of_month?: number
  day_of_week?: number
  end_date?: string
  tag_ids?: string[]
}

export interface TemplateFilters {
  is_active?: boolean
  frequency?: FrequencyType
  transaction_type?: TransactionType
}

// ============================================================================
// MONTH PLANS
// ============================================================================

export type MonthPlanStatus = 'draft' | 'active' | 'closed' | 'archived'

export interface MonthPlan {
  id: string
  user_id: string
  month_year: string // ISO date string (first day of month)
  status: MonthPlanStatus
  notes: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

export interface MonthPlanWithStats extends MonthPlan {
  stats: MonthPlanStats
}

export interface MonthPlanStats {
  expected_count: number
  matched_count: number
  pending_count: number
  overdue_count: number
  skipped_count: number
  total_expected_expenses: Partial<Record<CurrencyType, number>>
  total_actual_expenses: Partial<Record<CurrencyType, number>>
  total_expected_income: Partial<Record<CurrencyType, number>>
  total_actual_income: Partial<Record<CurrencyType, number>>
}

export interface CreateMonthPlanData {
  month_year: string
  notes?: string
}

export interface UpdateMonthPlanData {
  status?: MonthPlanStatus
  notes?: string
}

export interface GenerateExpectedOptions {
  template_ids?: string[] // If omitted, use all active templates
  override_existing?: boolean // If true, regenerate even if expected transactions exist
}

export interface GenerateExpectedResult {
  generated_count: number
  skipped_count: number
  message: string
}

export interface MonthPlanFilters {
  year?: number
  status?: MonthPlanStatus
  limit?: number
}

// ============================================================================
// EXPECTED TRANSACTIONS
// ============================================================================

export type ExpectedTransactionStatus = 'pending' | 'matched' | 'skipped' | 'overdue'

export interface ExpectedTransaction {
  id: string
  user_id: string

  // Source tracking
  template_id: string | null
  month_plan_id: string

  // Transaction details
  vendor_id: string | null
  payment_method_id: string | null
  description: string
  expected_amount: number
  original_currency: CurrencyType
  transaction_type: TransactionType
  expected_date: string // ISO date string

  // Status tracking
  status: ExpectedTransactionStatus

  // Matching
  matched_transaction_id: string | null
  matched_at: string | null

  // Variance tracking
  actual_amount: number | null
  variance_amount: number | null
  variance_percentage: number | null

  // Metadata
  notes: string | null
  created_at: string
  updated_at: string

  // Joined data
  vendor?: {
    id: string
    name: string
  }
  payment_method?: {
    id: string
    name: string
  }
  tags?: Array<{
    id: string
    name: string
    color: string
  }>
  matched_transaction?: {
    id: string
    transaction_date: string
    amount: number
    description: string
  }
}

export interface CreateExpectedTransactionData {
  month_plan_id: string
  description: string
  expected_amount: number
  original_currency: CurrencyType
  transaction_type: TransactionType
  expected_date: string
  vendor_id?: string
  payment_method_id?: string
  tag_ids?: string[]
  notes?: string
}

export interface UpdateExpectedTransactionData {
  description?: string
  expected_amount?: number
  expected_date?: string
  vendor_id?: string
  payment_method_id?: string
  status?: ExpectedTransactionStatus
  notes?: string
  tag_ids?: string[]
}

export interface ExpectedTransactionFilters {
  month_plan_id: string
  status?: ExpectedTransactionStatus | ExpectedTransactionStatus[]
  transaction_type?: TransactionType
  vendor_ids?: string[]
  include_matched?: boolean
}

// ============================================================================
// TRANSACTION MATCHING
// ============================================================================

export interface MatchSuggestion {
  expected_transaction_id: string
  transaction_id: string
  confidence_score: number // 0-100
  match_reasons: string[]
  expected: ExpectedTransaction
  actual: Transaction
}

export interface MatchScore {
  confidence: number // 0-100
  reasons: string[]
  penalties: string[]
  breakdown: {
    vendor_score: number
    amount_score: number
    date_score: number
    payment_method_score: number
    tags_score: number
  }
}

export interface AutoMatchOptions {
  confidence_threshold: number // Default: 85
  require_manual_review: boolean // If true, don't auto-match, just return suggestions
}

export interface AutoMatchResult {
  matched_count: number
  suggestions_count: number
  message: string
  matched_pairs?: Array<{
    expected_id: string
    transaction_id: string
    confidence: number
  }>
  suggestions?: MatchSuggestion[]
}

export interface MatchTransactionRequest {
  transaction_id: string
}

export interface SkipExpectedTransactionRequest {
  notes?: string
}

// ============================================================================
// VARIANCE REPORTS
// ============================================================================

export interface VarianceReport {
  month_year: string
  summary: VarianceSummary
  by_category: CategoryVariance[]
  by_vendor: VendorVariance[]
  largest_variances: VarianceItem[]
}

export interface VarianceSummary {
  total_expected_expenses: Partial<Record<CurrencyType, number>>
  total_actual_expenses: Partial<Record<CurrencyType, number>>
  total_expected_income: Partial<Record<CurrencyType, number>>
  total_actual_income: Partial<Record<CurrencyType, number>>
  total_variance: Partial<Record<CurrencyType, number>>
  variance_percentage: Partial<Record<CurrencyType, number>>
}

export interface CategoryVariance {
  tag: {
    id: string
    name: string
    color: string
  }
  expected: Partial<Record<CurrencyType, number>>
  actual: Partial<Record<CurrencyType, number>>
  variance: Partial<Record<CurrencyType, number>>
  variance_percentage: number
}

export interface VendorVariance {
  vendor: {
    id: string
    name: string
  }
  expected: Partial<Record<CurrencyType, number>>
  actual: Partial<Record<CurrencyType, number>>
  variance: Partial<Record<CurrencyType, number>>
  variance_percentage: number
}

export interface VarianceItem {
  expected_transaction: ExpectedTransaction
  variance_amount: number
  variance_percentage: number
}

export interface VarianceTrend {
  month_year: string
  total_variance: Partial<Record<CurrencyType, number>>
  variance_percentage: number
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface TemplatesResponse {
  templates: TransactionTemplate[]
  totalCount: number
}

export interface MonthPlansResponse {
  month_plans: MonthPlanWithStats[]
  totalCount: number
}

export interface ExpectedTransactionsResponse {
  expected_transactions: ExpectedTransaction[]
  totalCount: number
}

export interface MatchSuggestionsResponse {
  suggestions: MatchSuggestion[]
  totalCount: number
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface Transaction {
  id: string
  user_id: string
  vendor_id: string | null
  payment_method_id: string | null
  description: string
  amount: number
  original_currency: CurrencyType
  transaction_type: TransactionType
  transaction_date: string
  source_type: 'manual' | 'matched' | 'imported'
  expected_transaction_id: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Sunday = 0, Saturday = 6
export type DayOfMonth = number // 1-31

export interface RecurrencePattern {
  frequency: FrequencyType
  frequency_interval: number
  day_of_month?: DayOfMonth
  day_of_week?: DayOfWeek
}

export interface DateRange {
  start_date: string
  end_date: string | null
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class TemplateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TemplateError'
  }
}

export class MonthPlanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MonthPlanError'
  }
}

export class ExpectedTransactionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpectedTransactionError'
  }
}

export class MatchingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatchingError'
  }
}
