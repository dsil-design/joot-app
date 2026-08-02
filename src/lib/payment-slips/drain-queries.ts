/**
 * Supabase bindings for the slip drain loop.
 *
 * Kept out of the route handler so the API and any recovery script drive the
 * same candidate selection — a recovery path that reimplements these queries
 * is a recovery path that can disagree with production about which slips are
 * stranded.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { STALE_PENDING_MS, STALE_PROCESSING_MS, type DrainDeps } from './drain'

/**
 * - `pending`          — everything awaiting extraction. Used by the API, which
 *                        runs on behalf of a user who is waiting.
 * - `failed-retryable` — transient failures (rate limit / overload / timeout).
 * - `stale`            — abandoned work only: pending for longer than
 *                        STALE_PENDING_MS, or orphaned at `processing`. Used by
 *                        the sweeper so it cannot race a live user drain.
 */
export type DrainScope = 'pending' | 'failed-retryable' | 'stale'

/** SQL predicate for a slip orphaned mid-extraction. */
function staleProcessingClause(): string {
  const before = new Date(Date.now() - STALE_PROCESSING_MS).toISOString()
  return `and(status.eq.processing,extraction_started_at.lt.${before})`
}

export interface DrainQueryOptions {
  scope?: DrainScope
  /** Explicit slip ids to (re)process, overriding the scope. */
  explicitIds?: string[]
  processSlip: (id: string) => Promise<unknown>
}

/**
 * Build the candidate query for a scope.
 *
 * The `pending` scope also reclaims rows stuck in `processing` past
 * STALE_PROCESSING_MS. Those are slips whose invocation died mid-extraction;
 * they match neither `pending` nor `failed`, so without this they have no path
 * back into the queue and are stranded the way the June 2026 batch was.
 */
function candidateQuery(
  supabase: SupabaseClient,
  userId: string,
  scope: DrainScope,
  explicitIds: string[] | undefined
) {
  const query = supabase
    .from('payment_slip_uploads')
    .select('id')
    .eq('user_id', userId)

  if (explicitIds) {
    return query.in('id', explicitIds)
  }

  if (scope === 'failed-retryable') {
    return query
      .eq('status', 'failed')
      .or('extraction_log->>retryable.eq.true,extraction_error.ilike.%rate_limit%')
  }

  if (scope === 'stale') {
    // A slip only counts as abandoned once it has outlived any drain that
    // could still be working on it — see STALE_PENDING_MS.
    const pendingBefore = new Date(Date.now() - STALE_PENDING_MS).toISOString()
    return query.or(
      `and(status.eq.pending,uploaded_at.lt.${pendingBefore}),${staleProcessingClause()}`
    )
  }

  return query.or(`status.eq.pending,${staleProcessingClause()}`)
}

async function candidateIds(
  supabase: SupabaseClient,
  userId: string,
  scope: DrainScope,
  explicitIds: string[] | undefined,
  limit?: number
): Promise<string[]> {
  let query = candidateQuery(supabase, userId, scope, explicitIds).order('uploaded_at', {
    ascending: true,
  })
  if (limit !== undefined) query = query.limit(limit)

  const { data } = await query
  return ((data as { id: string }[] | null) || []).map((r) => r.id)
}

/** Wire a user's slip queue to the drain loop. */
export function buildDrainDeps(
  supabase: SupabaseClient,
  userId: string,
  options: DrainQueryOptions
): DrainDeps {
  const scope: DrainScope = options.scope ?? 'pending'
  const explicitIds =
    options.explicitIds && options.explicitIds.length > 0 ? options.explicitIds : undefined

  return {
    claimCandidates: async (limit, exclude) => {
      // Over-fetch by the exclusion count so a full page of already-attempted
      // ids cannot masquerade as an empty queue.
      const ids = await candidateIds(supabase, userId, scope, explicitIds, limit + exclude.size)
      return ids.filter((id) => !exclude.has(id)).slice(0, limit)
    },

    countRemaining: async (exclude) => {
      const ids = await candidateIds(supabase, userId, scope, explicitIds)
      return ids.filter((id) => !exclude.has(id)).length
    },

    resetBatch: async (ids) => {
      await supabase
        .from('payment_slip_uploads')
        .update({
          status: 'pending',
          extraction_error: null,
          extraction_data: null,
          extraction_confidence: null,
          matched_transaction_id: null,
          match_confidence: null,
        })
        .eq('user_id', userId)
        .in('id', ids)
    },

    processSlip: options.processSlip,
  }
}

/**
 * User ids owning at least one abandoned slip.
 *
 * Deliberately scoped to `stale` so the sweeper never claims slips a user's
 * own in-flight drain is still working through.
 */
export async function listUsersWithStrandedSlips(
  supabase: SupabaseClient
): Promise<string[]> {
  const pendingBefore = new Date(Date.now() - STALE_PENDING_MS).toISOString()

  const { data } = await supabase
    .from('payment_slip_uploads')
    .select('user_id')
    .or(`and(status.eq.pending,uploaded_at.lt.${pendingBefore}),${staleProcessingClause()}`)

  const ids = ((data as { user_id: string }[] | null) || []).map((r) => r.user_id)
  return [...new Set(ids)]
}
