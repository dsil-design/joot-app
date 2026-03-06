/**
 * AI Journal Service
 *
 * Logs every Gemini AI invocation to the ai_journal table for persistent
 * tracking and pattern analysis. Writes are fire-and-forget database inserts
 * with zero AI cost.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../supabase/server';
import type { RawEmailData, ExtractionResult, AiClassificationResult } from './types';

// ============================================================================
// TYPES
// ============================================================================

export type InvocationType =
  | 'classification_only'
  | 'combined_extraction'
  | 'fallback_extraction'
  | 'reprocess';

export interface JournalEntryParams {
  userId: string;
  invocationType: InvocationType;
  emailId?: string;
  emailTransactionId?: string;
  feedbackId?: string;
  rawEmail: RawEmailData;
  regexParserAttempted: string | null;
  regexExtractionSuccess: boolean;
  aiResult: AiClassificationResult | null;
  extraction: ExtractionResult;
  finalParserKey: string | null;
  finalConfidence: number;
  finalStatus: string;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Log an AI journal entry. Fire-and-forget — errors are caught and logged,
 * never thrown to the caller.
 */
export async function logJournalEntry(
  params: JournalEntryParams,
  supabase?: SupabaseClient
): Promise<void> {
  try {
    const client = supabase || createServiceRoleClient();

    const bodyLength = (params.rawEmail.text_body || params.rawEmail.html_body || '').length;

    const entry = {
      user_id: params.userId,
      invocation_type: params.invocationType,
      email_id: params.emailId || null,
      email_transaction_id: params.emailTransactionId || null,
      // Input metadata
      from_address: params.rawEmail.from_address || null,
      from_name: params.rawEmail.from_name || null,
      subject: params.rawEmail.subject || null,
      email_date: params.rawEmail.email_date?.toISOString() || null,
      body_length: bodyLength,
      // Parser context
      regex_parser_attempted: params.regexParserAttempted,
      regex_extraction_success: params.regexExtractionSuccess,
      // AI output
      ai_classification: params.aiResult?.ai_classification || null,
      ai_suggested_skip: params.aiResult?.should_skip ?? null,
      ai_reasoning: params.aiResult?.reasoning || null,
      ai_extracted_vendor: params.extraction.data?.vendor_name_raw || null,
      ai_extracted_amount: params.extraction.data?.amount || null,
      ai_extracted_currency: params.extraction.data?.currency || null,
      ai_extracted_date: params.extraction.data?.transaction_date
        ? params.extraction.data.transaction_date.toISOString().split('T')[0]
        : null,
      ai_confidence: params.extraction.confidence || null,
      // Final outcome
      final_parser_key: params.finalParserKey,
      final_confidence: params.finalConfidence,
      final_status: params.finalStatus,
      // Performance — from AI result metadata
      duration_ms: params.aiResult?.durationMs ?? null,
      prompt_tokens: params.aiResult?.promptTokens ?? null,
      response_tokens: params.aiResult?.responseTokens ?? null,
      feedback_examples_used: params.aiResult?.feedbackExamplesUsed ?? 0,
      feedback_id: params.feedbackId || null,
    };

    const { error } = await client.from('ai_journal').insert(entry);

    if (error) {
      console.error('Failed to log AI journal entry:', error.message);
    }
  } catch (error) {
    // Fire-and-forget — never break the extraction pipeline
    console.error('AI journal logging error:', error);
  }
}

/**
 * Determine the invocation type based on parser context
 */
export function getInvocationType(
  parserKey: string | null,
  regexExtractionSuccess: boolean,
  isReprocess: boolean
): InvocationType {
  if (isReprocess) return 'reprocess';
  if (parserKey && parserKey !== 'gemini-ai' && regexExtractionSuccess) return 'classification_only';
  if (parserKey && parserKey !== 'gemini-ai' && !regexExtractionSuccess) return 'fallback_extraction';
  return 'combined_extraction';
}

/**
 * Get count of journal entries since a given timestamp for a user.
 * Used by the analysis service to check if enough new entries exist.
 */
export async function getJournalEntriesSince(
  userId: string,
  since: Date | null,
  supabase?: SupabaseClient
): Promise<number> {
  const client = supabase || createServiceRoleClient();

  let query = client
    .from('ai_journal')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (since) {
    query = query.gt('created_at', since.toISOString());
  }

  const { count, error } = await query;

  if (error) {
    console.error('Failed to count journal entries:', error.message);
    return 0;
  }

  return count || 0;
}
