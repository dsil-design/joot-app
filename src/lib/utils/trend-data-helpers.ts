import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import type { MonthlyTrendData } from './monthly-summary'
import { calculateMonthlySummary } from './monthly-summary'
import { format as formatDate, subYears, startOfYear, eachMonthOfInterval } from 'date-fns'
import type { TimePeriod } from '@/components/ui/time-period-toggle'

/**
 * Calculate trend data for a specific time period.
 * Transactions must already be in USD.
 */
export function calculateTrendDataForPeriod(
  transactions: TransactionWithVendorAndPayment[],
  period: TimePeriod = 'ytd'
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
    const summary = calculateMonthlySummary(transactions, month)

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
 * Get all available trend data (useful for initial data fetch).
 * Transactions must already be in USD.
 */
export function calculateAllTrendData(
  transactions: TransactionWithVendorAndPayment[]
): MonthlyTrendData[] {
  return calculateTrendDataForPeriod(transactions, 'all')
}
