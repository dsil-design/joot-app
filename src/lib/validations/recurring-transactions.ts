/**
 * Zod Validation Schemas for Recurring Transactions API
 *
 * Provides request body validation for all Month View and Recurring Transactions API endpoints.
 */

import { z } from 'zod'

// ===========================
// Template Validation Schemas
// ===========================

export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().max(500).optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  payment_method_id: z.string().uuid().nullable().optional(),
  amount: z.number().positive('Amount must be positive'),
  original_currency: z.enum(['USD', 'THB', 'VND', 'MYR', 'CNY']),
  transaction_type: z.enum(['expense', 'income']),
  frequency: z.enum(['monthly', 'weekly', 'bi-weekly', 'quarterly', 'annually', 'custom']),
  frequency_interval: z.number().int().min(1).default(1),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
})

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  payment_method_id: z.string().uuid().nullable().optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  original_currency: z.enum(['USD', 'THB', 'VND', 'MYR', 'CNY']).optional(),
  frequency: z.enum(['monthly', 'weekly', 'bi-weekly', 'quarterly', 'annually', 'custom']).optional(),
  frequency_interval: z.number().int().min(1).optional(),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
})

// ===========================
// Month Plan Validation Schemas
// ===========================

export const CreateMonthPlanSchema = z.object({
  month_year: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000).nullable().optional(),
})

export const UpdateMonthPlanSchema = z.object({
  status: z.enum(['draft', 'active', 'closed']).optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export const GenerateExpectedSchema = z.object({
  template_ids: z.array(z.string().uuid()).optional(),
  override_existing: z.boolean().default(false),
})

export const AutoMatchSchema = z.object({
  confidence_threshold: z.number().min(0).max(100).default(80),
  require_manual_review: z.boolean().default(false),
})

// ===========================
// Expected Transaction Validation Schemas
// ===========================

export const CreateExpectedTransactionSchema = z.object({
  month_plan_id: z.string().uuid('Invalid month plan ID'),
  vendor_id: z.string().uuid().nullable().optional(),
  payment_method_id: z.string().uuid().nullable().optional(),
  description: z.string().min(1, 'Description is required').max(500),
  expected_amount: z.number().positive('Expected amount must be positive'),
  original_currency: z.enum(['USD', 'THB', 'VND', 'MYR', 'CNY']),
  transaction_type: z.enum(['expense', 'income']),
  expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000).nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
})

export const UpdateExpectedTransactionSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  expected_amount: z.number().positive('Expected amount must be positive').optional(),
  expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  payment_method_id: z.string().uuid().nullable().optional(),
  status: z.enum(['pending', 'matched', 'overdue', 'skipped']).optional(),
  notes: z.string().max(1000).nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
})

export const MatchTransactionSchema = z.object({
  transaction_id: z.string().uuid('Invalid transaction ID'),
})

export const SkipTransactionSchema = z.object({
  notes: z.string().max(1000).default(''),
})

// ===========================
// Type exports for TypeScript
// ===========================

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>
export type CreateMonthPlanInput = z.infer<typeof CreateMonthPlanSchema>
export type UpdateMonthPlanInput = z.infer<typeof UpdateMonthPlanSchema>
export type GenerateExpectedInput = z.infer<typeof GenerateExpectedSchema>
export type AutoMatchInput = z.infer<typeof AutoMatchSchema>
export type CreateExpectedTransactionInput = z.infer<typeof CreateExpectedTransactionSchema>
export type UpdateExpectedTransactionInput = z.infer<typeof UpdateExpectedTransactionSchema>
export type MatchTransactionInput = z.infer<typeof MatchTransactionSchema>
export type SkipTransactionInput = z.infer<typeof SkipTransactionSchema>
