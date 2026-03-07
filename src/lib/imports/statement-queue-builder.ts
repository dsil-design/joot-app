import { SupabaseClient } from '@supabase/supabase-js'
import { makeStatementId } from '@/lib/utils/import-id'
import type { QueueItem, Suggestion } from './queue-types'

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
  const { data: statements, error: fetchError } = await supabase
    .from('statement_uploads')
    .select(`
      id,
      filename,
      payment_method_id,
      extraction_log,
      payment_methods (
        id,
        name,
        type
      )
    `)
    .eq('user_id', userId)
    .in('status', ['ready_for_review', 'in_review', 'done'])
    .order('extraction_completed_at', { ascending: false })

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

  // Fetch matched transactions
  type MatchedTx = {
    id: string
    description: string | null
    transaction_date: string
    amount: number
    original_currency: string
    vendors: { name: string } | null
    payment_methods: { name: string } | null
  }

  const matchedMap = new Map<string, MatchedTx>()
  if (matchedTransactionIds.length > 0) {
    const { data: matchedTransactions } = await supabase
      .from('transactions')
      .select(`
        id, description, transaction_date, amount, original_currency,
        vendors ( name ),
        payment_methods ( name )
      `)
      .in('id', matchedTransactionIds)

    if (matchedTransactions) {
      for (const tx of matchedTransactions as MatchedTx[]) {
        matchedMap.set(tx.id, tx)
      }
    }
  }

  // Build queue items
  const items: QueueItem[] = []

  for (const statement of statements || []) {
    if (filters.statementUploadId && statement.id !== filters.statementUploadId) continue

    const extractionLog = statement.extraction_log as { suggestions?: Suggestion[] } | null
    const suggestions = extractionLog?.suggestions || []
    const pm = statement.payment_methods as { id: string; name: string; type?: string } | null

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
          date: suggestion.transaction_date,
          description: suggestion.description,
          amount: suggestion.amount,
          currency: suggestion.currency,
          sourceFilename: statement.filename,
        },
        matchedTransaction: matchedTransactionData,
        confidence: suggestion.confidence,
        confidenceLevel,
        reasons: suggestion.reasons,
        isNew: suggestion.is_new,
        status: suggestion.status || 'pending',
        source: 'statement',
      })
    }
  }

  return items
}
