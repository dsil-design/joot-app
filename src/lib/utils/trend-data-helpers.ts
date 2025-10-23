import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import type { MonthlyTrendData } from './monthly-summary'
import { calculateMonthlySummary } from './monthly-summary'
import { format as formatDate, subYears, startOfYear, eachMonthOfInterval } from 'date-fns'
import type { TimePeriod } from '@/components/ui/time-period-toggle'

/**
 * Calculate trend data for a specific time period
 * @param transactions - Array of all transactions
 * @param period - Time period to calculate ('all' | '5y' | '3y' | '2y' | '1y' | 'ytd')
 * @param exchangeRate - THB to USD exchange rate (defaults to 35)
 */
export function calculateTrendDataForPeriod(
  transactions: TransactionWithVendorAndPayment[],
  period: TimePeriod = 'ytd',
  exchangeRate: number = 35
): MonthlyTrendData[] {
  const today = new Date()
  let startDate: Date
  const endDate: Date = today

  switch (period) {
    case 'all':
      // Find the earliest transaction date
      if (transactions.length === 0) return []
      const dates = transactions.map(t => new Date(t.transaction_date))
      startDate = new Date(Math.min(...dates.map(d => d.getTime())))
      // Start from the beginning of that month
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      break
    case '5y':
      startDate = subYears(today, 5)
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      break
    case '3y':
      startDate = subYears(today, 3)
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      break
    case '2y':
      startDate = subYears(today, 2)
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      break
    case '1y':
      startDate = subYears(today, 1)
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      break
    case 'ytd':
      startDate = startOfYear(today)
      break
    default:
      startDate = startOfYear(today)
  }

  // Generate monthly intervals
  const months = eachMonthOfInterval({ start: startDate, end: endDate })
  const trendData: MonthlyTrendData[] = []

  for (const month of months) {
    const summary = calculateMonthlySummary(transactions, month, exchangeRate)

    // Format month as "Jan '25" for shorter labels
    const monthLabel = formatDate(month, "MMM ''yy")

    trendData.push({
      month: monthLabel,
      income: Math.round(summary.income * 100) / 100, // Round to 2 decimals
      expenses: Math.round(summary.expenses * 100) / 100,
      net: Math.round(summary.net * 100) / 100,
    })
  }

  return trendData
}

/**
 * Get all available trend data (useful for initial data fetch)
 * @param transactions - Array of all transactions
 * @param exchangeRate - THB to USD exchange rate (defaults to 35)
 */
export function calculateAllTrendData(
  transactions: TransactionWithVendorAndPayment[],
  exchangeRate: number = 35
): MonthlyTrendData[] {
  return calculateTrendDataForPeriod(transactions, 'all', exchangeRate)
}
