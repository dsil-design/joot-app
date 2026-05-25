import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/supabase/types'
import type { QueueItem, Suggestion } from './queue-types'
import { parseImportId } from '@/lib/utils/import-id'
import { updateStatementReviewStatus } from '@/lib/utils/statement-status'

/**
 * Auto-approve pending statement suggestions whose matched Joot transaction
 * is already linked to another source (payment slip or email receipt).
 *
 * Why: The matcher proposes statement→transaction links during statement
 * processing. When a transaction was previously created from a slip or email,
 * the user has already made the "this is a real transaction" decision —
 * the statement entry is just a back-pointer waiting to be materialized.
 * The queue's matched-transaction dedup already collapses such items into
 * a single merged card and inherits 'approved' status from the slip/email,
 * but the underlying state stays inconsistent: `suggestion.status` is unset
 * and `transactions.source_statement_upload_id` is null, so the statement
 * never advances to 'done' and the lineage is incomplete.
 *
 * This pass closes that gap by writing the back-link to the transaction row
 * and marking the suggestion 'approved'. Idempotent: a `.is('source_statement_upload_id', null)`
 * guard prevents stomping on transactions already linked to a different
 * statement, and suggestions already in a terminal state are skipped.
 */
export async function backfillStatementBacklinks(
  supabase: SupabaseClient,
  userId: string,
  statementItems: QueueItem[],
): Promise<void> {
  const candidates = statementItems.filter(
    (item) =>
      item.source === 'statement' &&
      item.status === 'pending' &&
      !!item.matchedTransaction?.id,
  )
  if (candidates.length === 0) return

  const matchedIds = Array.from(
    new Set(candidates.map((c) => c.matchedTransaction!.id)),
  )

  const { data: txns, error: txnFetchError } = await supabase
    .from('transactions')
    .select(
      'id, source_email_transaction_id, source_payment_slip_id, source_statement_upload_id',
    )
    .eq('user_id', userId)
    .in('id', matchedIds)

  if (txnFetchError || !txns) return

  type TxnRow = {
    id: string
    source_email_transaction_id: string | null
    source_payment_slip_id: string | null
    source_statement_upload_id: string | null
  }
  const txnById = new Map<string, TxnRow>()
  for (const t of txns as TxnRow[]) txnById.set(t.id, t)

  interface Backlink {
    statementId: string
    index: number
    transactionId: string
    confidence: number
    queueItem: QueueItem
  }
  const backlinks: Backlink[] = []
  for (const item of candidates) {
    const txn = txnById.get(item.matchedTransaction!.id)
    if (!txn) continue
    if (txn.source_statement_upload_id) continue
    if (!txn.source_email_transaction_id && !txn.source_payment_slip_id) continue

    const parsed = parseImportId(item.id)
    if (!parsed || parsed.type !== 'statement') continue

    backlinks.push({
      statementId: parsed.statementId,
      index: parsed.index,
      transactionId: txn.id,
      confidence: item.confidence ?? 0,
      queueItem: item,
    })
  }
  if (backlinks.length === 0) return

  const byStatement = new Map<string, Backlink[]>()
  for (const b of backlinks) {
    const list = byStatement.get(b.statementId) ?? []
    list.push(b)
    byStatement.set(b.statementId, list)
  }

  for (const [statementId, links] of byStatement) {
    const { data: stmt } = await supabase
      .from('statement_uploads')
      .select('extraction_log')
      .eq('id', statementId)
      .eq('user_id', userId)
      .single()
    if (!stmt) continue

    const extractionLog = stmt.extraction_log as
      | ({ suggestions?: Suggestion[] } & Record<string, unknown>)
      | null
    const suggestions = (extractionLog?.suggestions ?? []).slice()

    const applied: Backlink[] = []
    for (const link of links) {
      const s = suggestions[link.index]
      if (!s) continue
      if (s.status === 'approved' || s.status === 'rejected') continue

      const { data: txnUpdated, error: txnUpdErr } = await supabase
        .from('transactions')
        .update({
          source_statement_upload_id: statementId,
          source_statement_suggestion_index: link.index,
          source_statement_match_confidence: link.confidence,
        })
        .eq('id', link.transactionId)
        .eq('user_id', userId)
        .is('source_statement_upload_id', null)
        .select('id')
        .maybeSingle()

      if (txnUpdErr) {
        console.error(
          'backfillStatementBacklinks: failed to set source FKs',
          { transactionId: link.transactionId, statementId, error: txnUpdErr },
        )
        continue
      }
      // If the guard skipped the update (transaction already linked to another
      // statement in a race), don't claim the suggestion either.
      if (!txnUpdated) continue

      suggestions[link.index] = { ...s, status: 'approved' }
      applied.push(link)
    }

    if (applied.length === 0) continue

    const { error: stmtUpdErr } = await supabase
      .from('statement_uploads')
      .update({
        extraction_log: { ...extractionLog, suggestions } as unknown as Json,
      })
      .eq('id', statementId)
      .eq('user_id', userId)

    if (stmtUpdErr) {
      console.error(
        'backfillStatementBacklinks: failed to save extraction_log',
        { statementId, error: stmtUpdErr },
      )
      continue
    }

    await updateStatementReviewStatus(supabase, statementId)

    for (const link of applied) {
      link.queueItem.status = 'approved'
    }
  }
}
