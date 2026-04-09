type SupabaseLike = {
  from: (table: string) => any
}

interface RateCache {
  [key: string]: number
}

interface MinimalTransaction {
  transaction_date: string
  original_currency: string
  amount: number
}

/**
 * Fetch exchange rates from the exchange_rates table for every
 * non-USD (currency, date) pair present in `transactions`. Missing
 * dates fall back to the most recent available rate for that currency.
 *
 * Works with both the server and client Supabase clients.
 */
export async function fetchExchangeRatesForTransactions(
  transactions: Array<Pick<MinimalTransaction, 'transaction_date' | 'original_currency'>>,
  supabase: SupabaseLike
): Promise<RateCache> {
  const rateCache: RateCache = {}

  const conversionsNeeded = new Map<string, Set<string>>()
  transactions.forEach(t => {
    if (t.original_currency !== 'USD') {
      if (!conversionsNeeded.has(t.original_currency)) {
        conversionsNeeded.set(t.original_currency, new Set())
      }
      conversionsNeeded.get(t.original_currency)!.add(t.transaction_date)
    }
  })

  for (const [currency, dates] of conversionsNeeded.entries()) {
    const dateArray = Array.from(dates)

    const { data: rates } = await supabase
      .from('exchange_rates')
      .select('date, rate')
      .eq('from_currency', currency as any)
      .eq('to_currency', 'USD')
      .in('date', dateArray)

    rates?.forEach((rate: { date: string; rate: number }) => {
      rateCache[`${currency}_${rate.date}`] = rate.rate
    })

    const missingDates = dateArray.filter(date => !rateCache[`${currency}_${date}`])

    if (missingDates.length > 0) {
      const { data: fallbackRate } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', currency as any)
        .eq('to_currency', 'USD')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fallbackRate) {
        missingDates.forEach(date => {
          rateCache[`${currency}_${date}`] = fallbackRate.rate
        })
      }
    }
  }

  return rateCache
}

/**
 * Returns a shallow copy of each transaction with `amount` converted
 * to USD and `original_currency` set to 'USD'. Transactions whose
 * rate is not found are logged once and excluded (amount = 0).
 */
export function applyUsdConversion<T extends MinimalTransaction>(
  transactions: T[],
  rateCache: RateCache
): T[] {
  return transactions.map(t => {
    if (t.original_currency === 'USD') return t

    const rate = rateCache[`${t.original_currency}_${t.transaction_date}`]
    if (rate) {
      return { ...t, amount: t.amount * rate, original_currency: 'USD' }
    }

    console.warn(
      `No exchange rate found for ${t.original_currency} on ${t.transaction_date} (transaction ${(t as any).id ?? 'unknown'}) — excluding from calculations`
    )
    return { ...t, amount: 0, original_currency: 'USD' }
  })
}

/**
 * Convenience: fetch rates and apply them in one call.
 */
export async function convertTransactionsToUSD<T extends MinimalTransaction>(
  transactions: T[],
  supabase: SupabaseLike
): Promise<T[]> {
  if (transactions.length === 0) return transactions
  const rateCache = await fetchExchangeRatesForTransactions(transactions, supabase)
  return applyUsdConversion(transactions, rateCache)
}
