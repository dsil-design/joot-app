import { createClient } from '@/lib/supabase/server'
import { calculateTrendDataForPeriod } from '@/lib/utils/trend-data-helpers'
import {
  fetchExchangeRatesForTransactions,
  applyUsdConversion,
} from '@/lib/utils/convert-transactions-to-usd'
import { TrendChartCard } from '@/components/ui/trend-chart-card'

interface TrendChartSectionProps {
  userId: string
}

export async function TrendChartSection({ userId }: TrendChartSectionProps) {
  const supabase = await createClient()

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

  // Fetch exchange rates and convert all transactions to USD upfront
  const rateCache = await fetchExchangeRatesForTransactions(transactions, supabase)
  const transactionsForCalculation = applyUsdConversion(transactions, rateCache) as any[]

  // Calculate trend data for all time periods
  const ytdData = calculateTrendDataForPeriod(transactionsForCalculation, 'ytd')
  const oneYearData = calculateTrendDataForPeriod(transactionsForCalculation, '1y')
  const twoYearData = calculateTrendDataForPeriod(transactionsForCalculation, '2y')
  const threeYearData = calculateTrendDataForPeriod(transactionsForCalculation, '3y')
  const fiveYearData = calculateTrendDataForPeriod(transactionsForCalculation, '5y')
  const allData = calculateTrendDataForPeriod(transactionsForCalculation, 'all')

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