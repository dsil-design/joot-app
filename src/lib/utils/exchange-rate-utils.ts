import { createClient } from "@/lib/supabase/client"
import type { CurrencyType } from "@/lib/supabase/types"

export interface ExchangeRateResult {
  rate: number
  date: string
  isInterpolated: boolean
  source: string
}

/**
 * Fetches the exchange rate for a specific date using the database function.
 * Falls back to the most recent rate if exact date not found.
 *
 * @param transactionDate - The date of the transaction (YYYY-MM-DD format)
 * @param fromCurrency - The currency to convert from
 * @param toCurrency - The currency to convert to
 * @param maxDaysBack - Maximum days to look back for a rate (default: 30)
 * @returns Exchange rate information or null if not found
 */
export async function getExchangeRateForDate(
  transactionDate: string,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType,
  maxDaysBack: number = 30
): Promise<ExchangeRateResult | null> {
  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      date: transactionDate,
      isInterpolated: false,
      source: 'same_currency'
    }
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('get_exchange_rate_with_fallback', {
      p_date: transactionDate,
      p_from_currency: fromCurrency,
      p_to_currency: toCurrency,
      p_max_days_back: maxDaysBack
    })

    if (error) {
      console.error('Error fetching exchange rate:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    const rateData = data[0]
    return {
      rate: rateData.rate,
      date: rateData.actual_date,
      isInterpolated: rateData.is_interpolated,
      source: rateData.source
    }
  } catch (err) {
    console.error('Error fetching exchange rate:', err)
    return null
  }
}

/**
 * Fetches the exchange rate and metadata for displaying in the UI.
 * Returns information about whether we're using the exact date, a fallback, or latest rate.
 *
 * @param transactionDate - The date of the transaction (YYYY-MM-DD format)
 * @param fromCurrency - The currency to convert from
 * @param toCurrency - The currency to convert to
 * @returns Rate info with metadata for UI display
 */
export async function getExchangeRateWithMetadata(
  transactionDate: string,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): Promise<{
  rate: number | null
  timestamp: string | null
  isUsingLatestRate: boolean
  fallbackDate: string | null
}> {
  const today = new Date().toISOString().split('T')[0]
  const isTodayOrFuture = transactionDate >= today

  const supabase = createClient()

  if (isTodayOrFuture) {
    // For today/future dates, fetch the latest available rate
    const { data: latestRateData } = await supabase
      .from("exchange_rates")
      .select("rate, created_at, date")
      .eq("from_currency", fromCurrency)
      .eq("to_currency", toCurrency)
      .order("date", { ascending: false })
      .limit(1)
      .single()

    if (latestRateData) {
      return {
        rate: latestRateData.rate,
        timestamp: latestRateData.created_at,
        isUsingLatestRate: true,
        fallbackDate: null
      }
    }

    return {
      rate: null,
      timestamp: null,
      isUsingLatestRate: true,
      fallbackDate: null
    }
  }

  // For past dates, try to get the exact date's rate
  const { data: rateData } = await supabase
    .from("exchange_rates")
    .select("rate, created_at, date")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .eq("date", transactionDate)
    .single()

  if (rateData) {
    // Exact rate found for this date
    return {
      rate: rateData.rate,
      timestamp: rateData.created_at,
      isUsingLatestRate: false,
      fallbackDate: null
    }
  }

  // No exact rate found - fetch the most recent rate before this date
  const { data: fallbackRateData } = await supabase
    .from("exchange_rates")
    .select("rate, created_at, date")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .lt("date", transactionDate)
    .order("date", { ascending: false })
    .limit(1)
    .single()

  if (fallbackRateData) {
    return {
      rate: fallbackRateData.rate,
      timestamp: fallbackRateData.created_at,
      isUsingLatestRate: false,
      fallbackDate: fallbackRateData.date
    }
  }

  return {
    rate: null,
    timestamp: null,
    isUsingLatestRate: false,
    fallbackDate: null
  }
}
