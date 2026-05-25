import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/supabase/types'
import type { Suggestion } from './queue-types'

export interface CanonicalStatementLink {
  statementId: string
  index: number
}

interface ExtractionLog {
  suggestions?: Suggestion[]
  [key: string]: unknown
}

/**
 * Clear stale `matched_transaction_id` values on any other pending statement
 * suggestion that was auto-matched to the given transaction.
 *
 * Context: the auto-matcher can claim the same Joot transaction for multiple
 * statement suggestions when several charges share an amount and fall within
 * the date window (common with batched Amazon orders). Only one of those is
 * the real link — the one the user actually approved, captured on the
 * transaction itself via `source_statement_upload_id` + `source_statement_suggestion_index`.
 * The rest are false positives that, left in place, get re-grouped by the
 * queue's matched-tx dedup pass and pull the previously-approved merged card
 * back to `pending` on every refresh.
 *
 * Strategy: walk every statement for the user, find suggestions whose
 * `matched_transaction_id` equals this transaction, skip every (statementId,
 * index) pair in `keep` (callers pass the canonical link; self-transfers pass
 * both debit + credit sides since both legitimately reference the same tx),
 * skip any non-pending suggestion (an already-approved duplicate is the
 * user's call, not ours), and rewrite the rest as unmatched
 * (`matched_transaction_id` removed, `confidence` reset to 0, `is_new`
 * flipped back to true so the queue card surfaces a new-tx CTA).
 */
export async function clearDuplicateStatementMatches(
  client: SupabaseClient,
  userId: string,
  transactionId: string,
  keep: CanonicalStatementLink | CanonicalStatementLink[],
): Promise<{ statementsScanned: number; clearedCount: number }> {
  const keepList = Array.isArray(keep) ? keep : [keep]
  const keepSet = new Set(keepList.map((k) => `${k.statementId}:${k.index}`))

  const { data: statements, error } = await client
    .from('statement_uploads')
    .select('id, extraction_log')
    .eq('user_id', userId)

  if (error) {
    console.error('clearDuplicateStatementMatches: failed to fetch statements', error)
    return { statementsScanned: 0, clearedCount: 0 }
  }
  if (!statements) return { statementsScanned: 0, clearedCount: 0 }

  let clearedCount = 0

  for (const stmt of statements) {
    const ext = stmt.extraction_log as ExtractionLog | null
    const suggestions = ext?.suggestions
    if (!suggestions || suggestions.length === 0) continue

    let modified = false
    const updated: Suggestion[] = suggestions.map((s, idx) => {
      if (s.matched_transaction_id !== transactionId) return s
      if (keepSet.has(`${stmt.id}:${idx}`)) return s
      if (s.status === 'approved' || s.status === 'rejected') return s

      modified = true
      clearedCount++
      const { matched_transaction_id: _drop, ...rest } = s
      void _drop
      return {
        ...rest,
        confidence: 0,
        is_new: true,
      }
    })

    if (!modified) continue

    const { error: updateError } = await client
      .from('statement_uploads')
      .update({
        extraction_log: { ...ext, suggestions: updated } as unknown as Json,
      })
      .eq('id', stmt.id)

    if (updateError) {
      console.error(
        'clearDuplicateStatementMatches: failed to update statement',
        { statementId: stmt.id, error: updateError },
      )
    }
  }

  return { statementsScanned: statements.length, clearedCount }
}
