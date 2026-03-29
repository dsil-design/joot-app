import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Matched transaction enrichment data (joined from vendors + payment_methods).
 */
export type MatchedTx = {
  id: string
  description: string | null
  transaction_date: string
  amount: number
  original_currency: string
  vendors: { name: string } | null
  payment_methods: { name: string } | null
}

/**
 * Max IDs per Supabase `.in()` call.
 *
 * Each UUID is 36 chars; PostgREST encodes them in the URL query string.
 * Keeping batches ≤ 100 ensures the URL stays well under typical limits
 * (~8 KB) even with the rest of the select/filter params.
 */
const BATCH_SIZE = 100

/**
 * Fetch matched transactions by ID, batching to avoid URL-length errors
 * when the ID list is large.
 */
export async function fetchMatchedTransactions(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, MatchedTx>> {
  const map = new Map<string, MatchedTx>()
  if (ids.length === 0) return map

  // Deduplicate
  const uniqueIds = [...new Set(ids)]

  // Batch into chunks
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, description, transaction_date, amount, original_currency,
        vendors ( name ),
        payment_methods ( name )
      `)
      .in('id', batch)

    if (error) {
      console.error('[fetchMatchedTransactions] batch error:', error)
      continue
    }

    if (data) {
      for (const tx of data as unknown as MatchedTx[]) {
        map.set(tx.id, tx)
      }
    }
  }

  return map
}
