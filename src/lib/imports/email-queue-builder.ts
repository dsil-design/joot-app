import { SupabaseClient } from '@supabase/supabase-js'
import { makeEmailId } from '@/lib/utils/import-id'
import type { QueueItem } from './queue-types'

interface EmailFilters {
  currencyFilter?: string
  searchQuery?: string
  fromDate?: string
  toDate?: string
}

export async function fetchEmailQueueItems(
  supabase: SupabaseClient,
  userId: string,
  filters: EmailFilters
): Promise<QueueItem[]> {
  let emailQuery = supabase
    .from('email_transactions')
    .select(`
      id, subject, from_name, from_address, email_date,
      transaction_date, description, amount, currency,
      classification, order_id, extraction_confidence,
      match_confidence, matched_transaction_id, status
    `)
    .eq('user_id', userId)
    .in('status', ['pending_review', 'ready_to_import', 'waiting_for_statement', 'matched', 'imported', 'skipped'])
    .order('email_date', { ascending: false })

  if (filters.currencyFilter && filters.currencyFilter !== 'all') {
    emailQuery = emailQuery.eq('currency', filters.currencyFilter)
  }
  if (filters.fromDate) {
    emailQuery = emailQuery.gte('transaction_date', filters.fromDate)
  }
  if (filters.toDate) {
    emailQuery = emailQuery.lte('transaction_date', filters.toDate)
  }
  if (filters.searchQuery) {
    emailQuery = emailQuery.or(`description.ilike.%${filters.searchQuery}%,subject.ilike.%${filters.searchQuery}%`)
  }

  const { data: emailRows, error: emailError } = await emailQuery

  if (emailError) {
    console.error('Failed to fetch email transactions:', emailError)
    return []
  }

  if (!emailRows) return []

  // Fetch matched transactions
  const emailMatchedIds = emailRows
    .filter(r => r.matched_transaction_id)
    .map(r => r.matched_transaction_id as string)

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
  if (emailMatchedIds.length > 0) {
    const { data: matchedTxs } = await supabase
      .from('transactions')
      .select(`
        id, description, transaction_date, amount, original_currency,
        vendors ( name ),
        payment_methods ( name )
      `)
      .in('id', emailMatchedIds)

    if (matchedTxs) {
      for (const tx of matchedTxs as MatchedTx[]) {
        matchedMap.set(tx.id, tx)
      }
    }
  }

  const items: QueueItem[] = []

  for (const row of emailRows) {
    let queueStatus: 'pending' | 'approved' | 'rejected'
    switch (row.status) {
      case 'matched':
      case 'imported':
        queueStatus = 'approved'
        break
      case 'skipped':
        queueStatus = 'rejected'
        break
      default:
        queueStatus = 'pending'
    }

    const confidence = row.matched_transaction_id
      ? (row.match_confidence ?? 0)
      : (row.extraction_confidence ?? 0)

    let confidenceLevel: 'high' | 'medium' | 'low' | 'none' = 'none'
    if (confidence >= 90) confidenceLevel = 'high'
    else if (confidence >= 55) confidenceLevel = 'medium'
    else if (confidence > 0) confidenceLevel = 'low'

    const isNew = !row.matched_transaction_id

    let matchedTransactionData: QueueItem['matchedTransaction'] = undefined
    if (row.matched_transaction_id) {
      const enriched = matchedMap.get(row.matched_transaction_id)
      if (enriched) {
        matchedTransactionData = {
          id: enriched.id,
          date: enriched.transaction_date,
          amount: Number(enriched.amount),
          currency: enriched.original_currency,
          vendor_name: enriched.vendors?.name,
          description: enriched.description ?? undefined,
          payment_method_name: enriched.payment_methods?.name,
        }
      }
    }

    const sourceLabel = row.from_name || row.from_address || row.subject || 'Email'

    items.push({
      id: makeEmailId(row.id),
      statementFilename: sourceLabel,
      paymentMethod: null,
      statementTransaction: {
        date: row.transaction_date ?? row.email_date?.split('T')[0] ?? '',
        description: row.description ?? row.subject ?? '',
        amount: row.amount ?? 0,
        currency: row.currency ?? 'USD',
        sourceFilename: sourceLabel,
      },
      matchedTransaction: matchedTransactionData,
      confidence,
      confidenceLevel,
      reasons: [],
      isNew,
      status: queueStatus,
      source: 'email',
      emailMetadata: {
        subject: row.subject ?? undefined,
        fromName: row.from_name ?? undefined,
        fromAddress: row.from_address ?? undefined,
        classification: row.classification ?? undefined,
        orderId: row.order_id ?? undefined,
        emailDate: row.email_date ?? undefined,
      },
    })
  }

  return items
}
