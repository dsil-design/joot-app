import { SupabaseClient } from '@supabase/supabase-js'
import { makeStatementId } from '@/lib/utils/import-id'
import type { QueueItem, Suggestion } from './queue-types'
import { fetchMatchedTransactions } from './fetch-matched-transactions'
import { embeddedOne } from '@/lib/supabase/embedded'
import { foreignBlockReconciles } from '@/lib/statements/foreign-amount'

/**
 * Normalize an ISO timestamp or date string to YYYY-MM-DD.
 *
 * Statement parsers create Date objects in local time (e.g. UTC+7 for
 * Bangkok) and the processor stores them via .toISOString(), which shifts
 * to UTC — e.g. "Nov 24 00:00 local" → "2025-11-23T17:00:00.000Z".
 *
 * To recover the *intended* calendar date regardless of the server's
 * timezone, we round to the nearest calendar date: if the UTC time is
 * >= 12:00 we advance to the next day, otherwise we keep the UTC date.
 * This correctly handles offsets from UTC-12 to UTC+12.
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return dateStr
  if (!dateStr.includes('T')) return dateStr.slice(0, 10)

  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr

  // Round to nearest calendar date based on UTC hours
  if (d.getUTCHours() >= 12) {
    d.setUTCDate(d.getUTCDate() + 1)
  }
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface StatementFilters {
  statementUploadId?: string
  currencyFilter?: string
  searchQuery?: string
  fromDate?: string
  toDate?: string
}

export async function fetchStatementQueueItems(
  supabase: SupabaseClient,
  userId: string,
  filters: StatementFilters
): Promise<QueueItem[]> {
  let statementQuery = supabase
    .from('statement_uploads')
    .select(`
      id,
      filename,
      payment_method_id,
      extraction_log,
      statement_period_start,
      statement_period_end,
      payment_methods (
        id,
        name,
        type
      )
    `)
    .eq('user_id', userId)
    .in('status', ['ready_for_review', 'in_review', 'done'])
    .order('extraction_completed_at', { ascending: false })

  // Coarse pre-filter: keep statements whose period overlaps [fromDate, toDate].
  // Per-suggestion dates still get filtered by the aggregator on
  // statementTransaction.date — this just trims the fetch. Statements without a
  // parsed period are kept (period columns NULL → no constraint), so the
  // aggregator remains the authoritative filter.
  if (filters.fromDate) {
    statementQuery = statementQuery.or(
      `statement_period_end.gte.${filters.fromDate},statement_period_end.is.null`
    )
  }
  if (filters.toDate) {
    statementQuery = statementQuery.or(
      `statement_period_start.lte.${filters.toDate},statement_period_start.is.null`
    )
  }

  const { data: statements, error: fetchError } = await statementQuery

  if (fetchError) {
    console.error('Failed to fetch statements:', fetchError)
    throw new Error('Failed to fetch review queue')
  }

  // Collect all matched transaction IDs
  const matchedTransactionIds: string[] = []
  for (const statement of statements || []) {
    const extractionLog = statement.extraction_log as { suggestions?: Suggestion[] } | null
    const suggestions = extractionLog?.suggestions || []
    for (const suggestion of suggestions) {
      if (suggestion.matched_transaction_id) {
        matchedTransactionIds.push(suggestion.matched_transaction_id)
      }
    }
  }

  // Fetch matched transactions (batched to avoid URL-length errors with large ID sets)
  const matchedMap = await fetchMatchedTransactions(supabase, matchedTransactionIds)

  // Build queue items
  const items: QueueItem[] = []

  for (const statement of statements || []) {
    if (filters.statementUploadId && statement.id !== filters.statementUploadId) continue

    const extractionLog = statement.extraction_log as { suggestions?: Suggestion[] } | null
    const suggestions = extractionLog?.suggestions || []
    const pm = embeddedOne<{ id: string; name: string; type?: string }>(statement.payment_methods)

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i]
      const id = makeStatementId(statement.id, i)

      let confidenceLevel: 'high' | 'medium' | 'low' | 'none' = 'none'
      if (suggestion.confidence >= 90) confidenceLevel = 'high'
      else if (suggestion.confidence >= 55) confidenceLevel = 'medium'
      else if (suggestion.confidence > 0) confidenceLevel = 'low'

      let matchedTransactionData: QueueItem['matchedTransaction'] = undefined
      if (suggestion.matched_transaction_id) {
        const enrichedTx = matchedMap.get(suggestion.matched_transaction_id)
        if (enrichedTx) {
          matchedTransactionData = {
            id: enrichedTx.id,
            date: enrichedTx.transaction_date,
            amount: Number(enrichedTx.amount),
            currency: enrichedTx.original_currency,
            vendor_name: enrichedTx.vendors?.name,
            description: enrichedTx.description ?? undefined,
            payment_method_name: enrichedTx.payment_methods?.name,
          }
        } else {
          matchedTransactionData = {
            id: suggestion.matched_transaction_id,
            date: suggestion.transaction_date,
            amount: suggestion.amount,
            currency: suggestion.currency,
          }
        }
      }

      items.push({
        id,
        statementUploadId: statement.id,
        statementFilename: statement.filename,
        paymentMethod: pm ? { id: pm.id, name: pm.name } : null,
        paymentMethodType: pm?.type ?? 'credit_card',
        statementTransaction: {
          date: normalizeDate(suggestion.transaction_date),
          description: suggestion.description,
          amount: suggestion.amount,
          currency: suggestion.currency,
          sourceFilename: statement.filename,
          // Surface the printed foreign block only if its arithmetic reproduces
          // this row's settled amount. The Chase parser scans following lines to
          // find the block and could attach the next row's copy to a US-domestic
          // charge; 22 stored rows carry one. Suppressing them here covers every
          // consumer at once — the cross-source pairer, which treats a printed
          // foreign amount as authoritative and ranks it above FX-converted
          // candidates, and the review card, which renders "Originally ฿X" as
          // fact. The parser-side fix stops new ones; this neutralises those
          // already extracted, without reprocessing.
          ...(foreignBlockReconciles({
            rowAmount: suggestion.amount,
            originalAmount: suggestion.foreign_transaction?.originalAmount,
            exchangeRate: suggestion.foreign_transaction?.exchangeRate,
          })
            ? {
                foreignAmount: suggestion.foreign_transaction?.originalAmount,
                foreignCurrency: suggestion.foreign_transaction?.originalCurrency,
                foreignExchangeRate: suggestion.foreign_transaction?.exchangeRate,
              }
            : {}),
        },
        matchedTransaction: matchedTransactionData,
        confidence: suggestion.confidence,
        // For a statement row the stored confidence IS the transaction-match
        // score — the statement matcher produced it by scoring this row
        // against existing transactions.
        transactionMatchConfidence: matchedTransactionData ? suggestion.confidence : undefined,
        confidenceLevel,
        reasons: suggestion.reasons,
        isNew: suggestion.is_new,
        rejectedTransactionIds: suggestion.rejected_transaction_ids,
        status: suggestion.status || 'pending',
        source: 'statement',
      })
    }
  }

  return items
}
