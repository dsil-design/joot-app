import { createClient } from '@/lib/supabase/server'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import type { CurrencyType } from '@/lib/supabase/types'
import { calculateTrendDataForPeriod } from '@/lib/utils/trend-data-helpers'
import { TrendChartCard } from '@/components/ui/trend-chart-card'

interface ExchangeRateCache {
  [key: string]: number
}

/**
 * Fetch exchange rates for all non-USD currencies in the transactions
 * Server-side version that uses createClient from server
 */
async function fetchExchangeRatesForTransactions(
  transactions: Array<{ transaction_date: string; original_currency: string }>,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExchangeRateCache> {
  const rateCache: ExchangeRateCache = {}

  // Find all unique currency-date combinations that need conversion
  const conversionsNeeded = new Map<string, Set<string>>()

  transactions.forEach(t => {
    if (t.original_currency !== 'USD') {
      if (!conversionsNeeded.has(t.original_currency)) {
        conversionsNeeded.set(t.original_currency, new Set())
      }
      conversionsNeeded.get(t.original_currency)!.add(t.transaction_date)
    }
  })

  // Fetch rates for each currency
  for (const [currency, dates] of conversionsNeeded.entries()) {
    const dateArray = Array.from(dates)

    // Fetch all rates for this currency in one query
    const { data: rates } = await supabase
      .from('exchange_rates')
      .select('date, rate')
      .eq('from_currency', currency as CurrencyType)
      .eq('to_currency', 'USD')
      .in('date', dateArray)

    // Store exact matches in cache
    rates?.forEach(rate => {
      const key = `${currency}_${rate.date}`
      rateCache[key] = rate.rate
    })

    // For dates without exact matches, fetch the most recent rate
    const missingDates = dateArray.filter(date => !rateCache[`${currency}_${date}`])

    if (missingDates.length > 0) {
      // Fetch the latest rate for this currency as fallback
      const { data: fallbackRate } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', currency as CurrencyType)
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

export async function TrendChartSection() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const userId = user.id

  // Fetch latest exchange rate
  const { data: latestExchangeRate } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'THB')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const exchangeRate = latestExchangeRate?.rate || 35

  // Helper function to fetch all transactions with automatic pagination
  async function fetchAllTransactions(startDate?: string) {
    let allTransactions: Array<{
      transaction_date: string
      transaction_type: 'income' | 'expense'
      amount: number
      original_currency: string
    }> = []

    const pageSize = 1000
    let page = 0
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('transactions')
        .select('transaction_date, transaction_type, amount, original_currency')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: true })

      // Only add date filter if startDate is provided
      if (startDate) {
        query = query.gte('transaction_date', startDate)
      }

      const { data: pageData, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error('Error fetching transactions page', page, error)
        break
      }

      if (pageData && pageData.length > 0) {
        allTransactions = allTransactions.concat(pageData)
        // If we got less than pageSize, we've reached the end
        hasMore = pageData.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    return allTransactions
  }

  // Fetch ALL transactions (no date filter) for maximum flexibility
  // This allows the chart to switch between all time periods
  const transactions = await fetchAllTransactions()

  if (transactions.length === 0) {
    return null
  }

  // Fetch exchange rates for all non-USD currencies
  const exchangeRateCache = await fetchExchangeRatesForTransactions(transactions, supabase)

  // Convert all transactions to USD for consistent calculations
  const transactionsInUSD = transactions.map(t => {
    if (t.original_currency === 'USD') {
      // Already in USD, no conversion needed
      return t
    }

    // Look up exchange rate in cache
    const rateKey = `${t.original_currency}_${t.transaction_date}`
    const rate = exchangeRateCache[rateKey]

    if (rate) {
      // Convert to USD
      return {
        ...t,
        amount: t.amount * rate,
        original_currency: 'USD' as const
      }
    }

    // No rate found - log warning and exclude by setting amount to 0
    console.warn(`No exchange rate found for ${t.original_currency} on ${t.transaction_date}`)
    return {
      ...t,
      amount: 0,
      original_currency: 'USD' as const
    }
  })

  // Convert to the format expected by calculateTrendDataForPeriod
  const transactionsForCalculation = transactionsInUSD as any[]

  // Calculate trend data for all time periods
  const ytdData = calculateTrendDataForPeriod(transactionsForCalculation, 'ytd', exchangeRate)
  const oneYearData = calculateTrendDataForPeriod(transactionsForCalculation, '1y', exchangeRate)
  const twoYearData = calculateTrendDataForPeriod(transactionsForCalculation, '2y', exchangeRate)
  const threeYearData = calculateTrendDataForPeriod(transactionsForCalculation, '3y', exchangeRate)
  const fiveYearData = calculateTrendDataForPeriod(transactionsForCalculation, '5y', exchangeRate)
  const allData = calculateTrendDataForPeriod(transactionsForCalculation, 'all', exchangeRate)

  // Map data to match TrendDataPoint interface (month -> date)
  const mapToTrendDataPoints = (data: typeof ytdData) =>
    data.map(point => ({
      date: point.month,
      income: point.income,
      expenses: point.expenses,
      net: point.net,
    }))

  // Combine all data by period for the client component
  const dataByPeriod = {
    ytd: mapToTrendDataPoints(ytdData),
    '1y': mapToTrendDataPoints(oneYearData),
    '2y': mapToTrendDataPoints(twoYearData),
    '3y': mapToTrendDataPoints(threeYearData),
    '5y': mapToTrendDataPoints(fiveYearData),
    all: mapToTrendDataPoints(allData),
  }

  return (
    <div className="flex flex-col gap-2 items-start justify-start w-full">
      <div className="text-[12px] font-medium text-muted-foreground leading-4">
        Financial Performance
      </div>
      <TrendChartCard
        dataByPeriod={dataByPeriod}
        title="Net Worth Trend"
        defaultPeriod="ytd"
        height={300}
        className="w-full"
      />
    </div>
  )
}