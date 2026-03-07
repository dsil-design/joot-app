import type { SupabaseClient } from '@supabase/supabase-js'

interface Suggestion {
  status?: string
  matched_transaction_id?: string
  [key: string]: unknown
}

interface ExtractionLog {
  suggestions?: Suggestion[]
  [key: string]: unknown
}

/**
 * Compute the review status for a statement based on its suggestions.
 *
 * - 'done' means every suggestion is linked to a transaction in the database
 *   (status === 'approved' AND matched_transaction_id is set).
 * - 'in_review' means the user has started acting on suggestions but not all
 *   are linked yet.
 * - 'ready_for_review' means no suggestions have been acted on.
 */
export function computeReviewStatus(
  suggestions: Suggestion[]
): 'ready_for_review' | 'in_review' | 'done' {
  if (suggestions.length === 0) return 'done'

  const resolved = suggestions.filter(
    s => (s.status === 'approved' && s.matched_transaction_id) || s.status === 'ignored'
  ).length

  if (resolved >= suggestions.length) return 'done'

  // Check if user has started acting (any approved, rejected, or ignored)
  const acted = suggestions.filter(
    s => s.status === 'approved' || s.status === 'rejected' || s.status === 'ignored'
  ).length

  if (acted === 0) return 'ready_for_review'
  return 'in_review'
}

/**
 * After a suggestion change, recompute and update the statement's status.
 * Only transitions between ready_for_review / in_review / done.
 */
export async function updateStatementReviewStatus(
  client: SupabaseClient,
  statementId: string
): Promise<void> {
  const { data: statement } = await client
    .from('statement_uploads')
    .select('status, extraction_log')
    .eq('id', statementId)
    .single()

  if (!statement) return

  // Only update if the statement is in a review-phase status
  const reviewStatuses = ['ready_for_review', 'in_review', 'done']
  if (!reviewStatuses.includes(statement.status)) return

  const extractionLog = statement.extraction_log as ExtractionLog | null
  const suggestions = extractionLog?.suggestions || []
  const newStatus = computeReviewStatus(suggestions)

  if (newStatus !== statement.status) {
    await client
      .from('statement_uploads')
      .update({ status: newStatus })
      .eq('id', statementId)
  }
}
