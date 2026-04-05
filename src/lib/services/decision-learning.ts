/**
 * Unified Decision Learning Service
 *
 * Single entry point for recording all user decisions from the review queue.
 * Routes learning signals to the appropriate specialized services:
 * - Statement descriptions → statement-description-learning
 * - Email vendor names → vendor-recipient-learning
 * - Payment slip counterparties → payment-slip-learning
 *
 * All calls are fire-and-forget: errors are logged but never block the caller.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { upsertStatementDescriptionMapping } from './statement-description-learning'
import { learnVendorRecipientMapping } from './vendor-recipient-learning'
import { learnPaymentSlipMapping } from './payment-slip-learning'
import { triggerBatchAnalysis } from '../email/ai-analysis-service'

export interface DecisionEvent {
  userId: string
  decisionType: 'approve_match' | 'approve_create' | 'reject' | 'link'
  sourceType: 'statement' | 'email' | 'payment_slip' | 'merged' | 'merged_slip_email' | 'merged_slip_stmt' | 'self_transfer'
  compositeId: string

  // Source identifiers
  statementUploadId?: string
  suggestionIndex?: number
  emailTransactionId?: string
  paymentSlipId?: string
  transactionId?: string

  // Source data
  statementDescription?: string
  emailFromAddress?: string
  emailVendorNameRaw?: string
  emailParserKey?: string
  slipCounterpartyName?: string
  amount?: number
  currency?: string

  // Decision outcome
  vendorId?: string
  paymentMethodId?: string
  tagIds?: string[]
  matchConfidence?: number
  wasAutoMatched?: boolean

  // For rejections
  rejectedTransactionId?: string
}

/**
 * Record a user decision and dispatch to specialized learning services.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function recordDecision(
  supabase: SupabaseClient,
  event: DecisionEvent
): Promise<void> {
  try {
    // 1. Always log to user_decision_log
    const { error: logError } = await supabase
      .from('user_decision_log')
      .insert({
        user_id: event.userId,
        decision_type: event.decisionType,
        source_type: event.sourceType,
        composite_id: event.compositeId,
        statement_upload_id: event.statementUploadId || null,
        suggestion_index: event.suggestionIndex ?? null,
        email_transaction_id: event.emailTransactionId || null,
        payment_slip_id: event.paymentSlipId || null,
        transaction_id: event.transactionId || null,
        vendor_id: event.vendorId || null,
        payment_method_id: event.paymentMethodId || null,
        tag_ids: event.tagIds || [],
        statement_description: event.statementDescription || null,
        email_from_address: event.emailFromAddress || null,
        email_vendor_name_raw: event.emailVendorNameRaw || null,
        email_parser_key: event.emailParserKey || null,
        slip_counterparty_name: event.slipCounterpartyName || null,
        amount: event.amount ?? null,
        currency: event.currency || null,
        match_confidence: event.matchConfidence ?? null,
        was_auto_matched: event.wasAutoMatched ?? false,
        rejected_transaction_id: event.rejectedTransactionId || null,
      })

    if (logError) {
      console.error('Failed to insert decision log:', logError.message)
    }

    // 2. Dispatch to specialized learning services (only for approvals/links with a vendor)
    if (event.decisionType === 'reject') return

    if (!event.vendorId || !event.transactionId) return

    // Statement description → vendor learning
    if (event.statementDescription && (
      event.sourceType === 'statement' ||
      event.sourceType === 'merged' ||
      event.sourceType === 'merged_slip_stmt' ||
      event.sourceType === 'self_transfer'
    )) {
      await upsertStatementDescriptionMapping(
        supabase,
        event.userId,
        event.statementDescription,
        event.vendorId,
        event.paymentMethodId || null
      )
    }

    // Email vendor name → vendor learning (handled by existing service)
    if (event.emailTransactionId && event.transactionId && (
      event.sourceType === 'email' ||
      event.sourceType === 'merged' ||
      event.sourceType === 'merged_slip_email'
    )) {
      await learnVendorRecipientMapping(
        supabase,
        event.userId,
        event.emailTransactionId,
        event.transactionId
      )
    }

    // Payment slip counterparty → vendor learning (handled by existing service)
    if (event.paymentSlipId && event.transactionId && (
      event.sourceType === 'payment_slip' ||
      event.sourceType === 'merged_slip_email' ||
      event.sourceType === 'merged_slip_stmt'
    )) {
      await learnPaymentSlipMapping(
        supabase,
        event.userId,
        event.paymentSlipId,
        event.transactionId
      )
    }

    // Trigger batch analysis (fire-and-forget) — the analysis service
    // will check if enough entries have accumulated since the last run
    triggerBatchAnalysis(event.userId)
  } catch (error) {
    console.error('Decision learning error (non-fatal):', error)
  }
}

/**
 * Get count of decision log entries since a given timestamp.
 * Used by the analysis service to check if enough new decisions exist.
 */
export async function getDecisionCountSince(
  supabase: SupabaseClient,
  userId: string,
  since: Date | null
): Promise<number> {
  let query = supabase
    .from('user_decision_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (since) {
    query = query.gt('created_at', since.toISOString())
  }

  const { count, error } = await query

  if (error) {
    console.error('Failed to count decision log entries:', error.message)
    return 0
  }

  return count || 0
}
