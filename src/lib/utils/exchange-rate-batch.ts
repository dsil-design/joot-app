import { createClient } from "@/lib/supabase/client"
import type { CurrencyType } from "@/lib/supabase/types"

interface BatchRateRequest {
  transactionDate: string
  fromCurrency: CurrencyType
  toCurrency: CurrencyType
}

interface RateCache {
  [key: string]: number | null
}

/**
 * Batches exchange rate requests to minimize database queries.
 * Fetches all unique date/currency combinations in one go.
 */
export async function getBatchExchangeRates(
  requests: BatchRateRequest[]
): Promise<RateCache> {
  if (requests.length === 0) return {}

  const supabase = createClient()
  const cache: RateCache = {}

  // Group requests by currency pair
  const pairGroups = new Map<string, Set<string>>()

  requests.forEach(req => {
    // Handle same currency (rate = 1)
    if (req.fromCurrency === req.toCurrency) {
      const key = `${req.transactionDate}_${req.fromCurrency}_${req.toCurrency}`
      cache[key] = 1
      return
    }

    const pairKey = `${req.fromCurrency}_${req.toCurrency}`
    if (!pairGroups.has(pairKey)) {
      pairGroups.set(pairKey, new Set())
    }
    pairGroups.get(pairKey)!.add(req.transactionDate)
  })

  // Fetch rates for each currency pair
  const fetchPromises = Array.from(pairGroups.entries()).map(async ([pairKey, dates]) => {
    const [fromCurrency, toCurrency] = pairKey.split('_') as [CurrencyType, CurrencyType]
    const dateArray = Array.from(dates)

    // Fetch all rates for this currency pair in one query
    const { data: rates } = await supabase
      .from('exchange_rates')
      .select('date, rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .in('date', dateArray)

    // Store exact matches in cache
    rates?.forEach(rate => {
      const key = `${rate.date}_${fromCurrency}_${toCurrency}`
      cache[key] = rate.rate
    })

    // For dates without exact matches, fetch the most recent rate before each date
    const missingDates = dateArray.filter(date => {
      const key = `${date}_${fromCurrency}_${toCurrency}`
      return cache[key] === undefined
    })

    if (missingDates.length > 0) {
      // Fetch the latest rate (fallback for all missing dates)
      const { data: fallbackRate } = await supabase
        .from('exchange_rates')
        .select('rate, date')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Apply fallback rate to all missing dates
      if (fallbackRate) {
        missingDates.forEach(date => {
          const key = `${date}_${fromCurrency}_${toCurrency}`
          cache[key] = fallbackRate.rate
        })
      } else {
        // No rates available at all
        missingDates.forEach(date => {
          const key = `${date}_${fromCurrency}_${toCurrency}`
          cache[key] = null
        })
      }
    }
  })

  await Promise.all(fetchPromises)
  return cache
}

/**
 * Helper to create cache key
 */
export function getCacheKey(date: string, fromCurrency: CurrencyType, toCurrency: CurrencyType): string {
  return `${date}_${fromCurrency}_${toCurrency}`
}
