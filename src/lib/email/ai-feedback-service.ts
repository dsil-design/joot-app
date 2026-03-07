/**
 * AI Feedback Service
 *
 * Stores user corrections and retrieves them for few-shot prompt injection.
 * When users correct AI classifications, skip decisions, or extracted data,
 * those corrections are stored and injected into future AI prompts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../supabase/server';
import type { AiFeedbackType, AiClassification } from '../types/email-imports';

// ============================================================================
// TYPES
// ============================================================================

export interface FeedbackExample {
  email_subject: string | null;
  email_from: string | null;
  email_body_preview: string | null;
  original_ai_classification: string | null;
  original_ai_suggested_skip: boolean | null;
  corrected_classification: string | null;
  corrected_skip: boolean | null;
}

export interface RecordFeedbackParams {
  userId: string;
  emailTransactionId: string;
  feedbackType: AiFeedbackType;
  originalAiClassification: AiClassification | string | null;
  originalAiSuggestedSkip: boolean | null;
  correctedClassification?: AiClassification | string | null;
  correctedSkip?: boolean | null;
  emailSubject?: string | null;
  emailFrom?: string | null;
  emailBodyPreview?: string | null;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const feedbackCache = new Map<string, CacheEntry<FeedbackExample[]>>();
const countCache = new Map<string, CacheEntry<number>>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.value;
  }
  cache.delete(key);
  return null;
}

function setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Clear feedback caches (useful after recording new feedback)
 */
export function clearFeedbackCache(userId: string): void {
  feedbackCache.delete(userId);
  countCache.delete(userId);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Record user feedback (correction) for an AI classification or extraction
 */
export async function recordFeedback(
  params: RecordFeedbackParams,
  supabase?: SupabaseClient
): Promise<string | null> {
  const client = supabase || createServiceRoleClient();

  const { data, error } = await client.from('ai_feedback').insert({
    user_id: params.userId,
    email_transaction_id: params.emailTransactionId,
    feedback_type: params.feedbackType,
    original_ai_classification: params.originalAiClassification,
    original_ai_suggested_skip: params.originalAiSuggestedSkip,
    corrected_classification: params.correctedClassification ?? null,
    corrected_skip: params.correctedSkip ?? null,
    email_subject: params.emailSubject ?? null,
    email_from: params.emailFrom ?? null,
    email_body_preview: params.emailBodyPreview?.slice(0, 500) ?? null,
  }).select('id').single();

  // Invalidate cache so next batch uses updated feedback
  clearFeedbackCache(params.userId);

  if (error) {
    console.error('Failed to record AI feedback:', error);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Get the 5 most recent feedback entries for few-shot prompt injection.
 * Cached for 60 seconds during batch processing.
 */
export async function getRecentFeedback(
  userId: string,
  supabase?: SupabaseClient
): Promise<FeedbackExample[]> {
  // Check cache first
  const cached = getCached(feedbackCache, userId);
  if (cached !== null) {
    return cached;
  }

  const client = supabase || createServiceRoleClient();

  const { data, error } = await client
    .from('ai_feedback')
    .select('email_subject, email_from, email_body_preview, original_ai_classification, original_ai_suggested_skip, corrected_classification, corrected_skip')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Failed to fetch AI feedback:', error);
    return [];
  }

  const examples: FeedbackExample[] = (data || []).map(row => ({
    email_subject: row.email_subject,
    email_from: row.email_from,
    email_body_preview: row.email_body_preview,
    original_ai_classification: row.original_ai_classification,
    original_ai_suggested_skip: row.original_ai_suggested_skip,
    corrected_classification: row.corrected_classification,
    corrected_skip: row.corrected_skip,
  }));

  setCached(feedbackCache, userId, examples);
  return examples;
}

/**
 * Get total feedback count for auto-skip threshold check.
 * Cached for 60 seconds during batch processing.
 */
export async function getFeedbackCount(
  userId: string,
  supabase?: SupabaseClient
): Promise<number> {
  // Check cache first
  const cached = getCached(countCache, userId);
  if (cached !== null) {
    return cached;
  }

  const client = supabase || createServiceRoleClient();

  const { count, error } = await client
    .from('ai_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch AI feedback count:', error);
    return 0;
  }

  const total = count || 0;
  setCached(countCache, userId, total);
  return total;
}
