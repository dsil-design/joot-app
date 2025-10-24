import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  subMonths,
  eachDayOfInterval,
  format as formatDate,
  getDaysInMonth,
  getDate
} from 'date-fns'

export interface MonthlySummary {
  income: number
  expenses: number
  net: number
  currency: 'USD'
  transactionCount: number
  incomeCount: number
  expenseCount: number
}

export interface DailySpend {
  date: string
  amount: number
}

export interface MonthComparison {
  current: number
  previous: number
  changePercent: number
  changeDirection: 'up' | 'down' | 'neutral'
}

export interface EnhancedMonthlySummary extends MonthlySummary {
  // Previous month comparison
  previousMonth: {
    income: MonthComparison
    expenses: MonthComparison
    net: MonthComparison
  }
  // 12-month average comparison
  twelveMonthAverage: {
    income: MonthComparison
    expenses: MonthComparison
    net: MonthComparison
  }
  // Daily spend trend for current month
  dailySpendTrend: DailySpend[]
  // Days elapsed in current month
  daysElapsed: number
  daysInMonth: number
  percentElapsed: number
}

export interface YTDSummary {
  income: number
  expenses: number
  net: number
  currency: 'USD'
  transactionCount: number
  incomeCount: number
  expenseCount: number
  averageMonthlyIncome: number
  averageMonthlyExpenses: number
  monthsElapsed: number
  savingsRate: number // Percentage of income saved
}

export interface MonthlyTrendData {
  month: string // "Jan 2025"
  income: number
  expenses: number
  net: number
}

export interface TopVendor {
  vendorId: string | null
  vendorName: string
  totalAmount: number
  transactionCount: number
  percentOfTotal: number
}

/**
 * Helper: Calculate comparison between two values
 */
function calculateComparison(current: number, previous: number): MonthComparison {
  const changePercent = previous === 0
    ? (current > 0 ? 100 : 0)
    : ((current - previous) / Math.abs(previous)) * 100

  let changeDirection: 'up' | 'down' | 'neutral' = 'neutral'
  if (Math.abs(changePercent) >= 0.5) {
    changeDirection = changePercent > 0 ? 'up' : 'down'
  }

  return {
    current,
    previous,
    changePercent: Math.round(changePercent * 10) / 10, // Round to 1 decimal
    changeDirection
  }
}

/**
 * Helper: Calculate daily spend trend for a month
 */
function calculateDailySpendTrend(
  transactions: TransactionWithVendorAndPayment[],
  month: Date,
  exchangeRate: number
): DailySpend[] {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const today = new Date()
  const endDate = today < monthEnd ? today : monthEnd

  // Create array of all days in the month (up to today)
  const days = eachDayOfInterval({ start: monthStart, end: endDate })

  // Initialize daily totals
  const dailyTotals: { [key: string]: number } = {}
  days.forEach(day => {
    dailyTotals[formatDate(day, 'yyyy-MM-dd')] = 0
  })

  // Sum expenses by day
  transactions.forEach(transaction => {
    const transactionDate = parseISO(transaction.transaction_date)
    const dateKey = formatDate(transactionDate, 'yyyy-MM-dd')

    if (dailyTotals[dateKey] !== undefined && transaction.transaction_type === 'expense') {
      const amountUSD = convertToUSD(transaction, exchangeRate)
      dailyTotals[dateKey] += amountUSD
    }
  })

  // Convert to array format for sparkline
  return days.map(day => ({
    date: formatDate(day, 'yyyy-MM-dd'),
    amount: dailyTotals[formatDate(day, 'yyyy-MM-dd')]
  }))
}

/**
 * Helper: Convert transaction amount to USD using exchange rate
 * Falls back to assuming USD if no exchange rate is available
 * @param transaction - The transaction to convert
 * @param exchangeRate - THB to USD exchange rate (for backwards compatibility)
 * @returns Amount in USD
 */
function convertToUSD(transaction: TransactionWithVendorAndPayment, exchangeRate: number): number {
  const currency = transaction.original_currency
  const amount = transaction.amount

  // If already USD, return as-is
  if (currency === 'USD') {
    return amount
  }

  // For THB, use the provided exchange rate
  if (currency === 'THB') {
    return amount / exchangeRate
  }

  // For any other currency, we need to convert via the exchange rate database
  // Since we don't have access to the database here, we'll need the caller to provide
  // exchange rates. For now, log a warning and return 0 to make the issue visible.
  console.warn(`Unable to convert ${currency} to USD - no exchange rate available for transaction ${transaction.id}. This transaction will be excluded from calculations.`)
  return 0
}

/**
 * Calculate monthly summary from transactions
 * Converts all amounts to USD for consistent comparison
 * @param transactions - Array of transactions with vendor and payment info
 * @param month - Optional date to calculate for specific month (defaults to current month)
 * @param exchangeRate - THB to USD exchange rate (defaults to 35)
 */
export function calculateMonthlySummary(
  transactions: TransactionWithVendorAndPayment[],
  month?: Date,
  exchangeRate: number = 35
): MonthlySummary {
  const targetDate = month || new Date()
  const monthStart = startOfMonth(targetDate)
  const monthEnd = endOfMonth(targetDate)

  // Filter transactions for the target month
  const monthTransactions = transactions.filter(transaction => {
    const transactionDate = parseISO(transaction.transaction_date)
    return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd })
  })

  let totalIncome = 0
  let totalExpenses = 0
  let incomeCount = 0
  let expenseCount = 0

  monthTransactions.forEach(transaction => {
    // Convert to USD using the helper function
    const amountUSD = convertToUSD(transaction, exchangeRate)

    if (transaction.transaction_type === 'income') {
      totalIncome += amountUSD
      incomeCount++
    } else if (transaction.transaction_type === 'expense') {
      totalExpenses += amountUSD
      expenseCount++
    }
  })

  return {
    income: totalIncome,
    expenses: totalExpenses,
    net: totalIncome - totalExpenses,
    currency: 'USD',
    transactionCount: monthTransactions.length,
    incomeCount,
    expenseCount,
  }
}

/**
 * Calculate enhanced monthly summary with comparisons and trends
 * @param transactions - Array of all transactions
 * @param month - Optional date to calculate for specific month (defaults to current month)
 * @param exchangeRate - THB to USD exchange rate (defaults to 35)
 */
export function calculateEnhancedMonthlySummary(
  transactions: TransactionWithVendorAndPayment[],
  month?: Date,
  exchangeRate: number = 35
): EnhancedMonthlySummary {
  const targetDate = month || new Date()
  const currentMonth = calculateMonthlySummary(transactions, targetDate, exchangeRate)

  // Calculate previous month
  const previousMonthDate = subMonths(targetDate, 1)
  const previousMonth = calculateMonthlySummary(transactions, previousMonthDate, exchangeRate)

  // Calculate 12-month average
  const monthlyAverages = { income: 0, expenses: 0, net: 0 }
  let validMonthCount = 0

  for (let i = 1; i <= 12; i++) {
    const pastMonth = subMonths(targetDate, i)
    const summary = calculateMonthlySummary(transactions, pastMonth, exchangeRate)
    monthlyAverages.income += summary.income
    monthlyAverages.expenses += summary.expenses
    monthlyAverages.net += summary.net
    validMonthCount++
  }

  if (validMonthCount > 0) {
    monthlyAverages.income /= validMonthCount
    monthlyAverages.expenses /= validMonthCount
    monthlyAverages.net /= validMonthCount
  }

  // Calculate daily spend trend for current month only
  const dailySpendTrend = calculateDailySpendTrend(transactions, targetDate, exchangeRate)

  // Calculate days elapsed
  const today = new Date()
  const daysInMonth = getDaysInMonth(targetDate)
  const daysElapsed = getDate(today)
  const percentElapsed = Math.round((daysElapsed / daysInMonth) * 100)

  return {
    ...currentMonth,
    previousMonth: {
      income: calculateComparison(currentMonth.income, previousMonth.income),
      expenses: calculateComparison(currentMonth.expenses, previousMonth.expenses),
      net: calculateComparison(currentMonth.net, previousMonth.net)
    },
    twelveMonthAverage: {
      income: calculateComparison(currentMonth.income, monthlyAverages.income),
      expenses: calculateComparison(currentMonth.expenses, monthlyAverages.expenses),
      net: calculateComparison(currentMonth.net, monthlyAverages.net)
    },
    dailySpendTrend,
    daysElapsed,
    daysInMonth,
    percentElapsed
  }
}

/**
 * Calculate year-to-date summary
 * @param transactions - Array of all transactions
 * @param exchangeRate - THB to USD exchange rate (defaults to 35)
 */
export function calculateYTDSummary(
  transactions: TransactionWithVendorAndPayment[],
  exchangeRate: number = 35
): YTDSummary {
  const today = new Date()
  const yearStart = new Date(today.getFullYear(), 0, 1) // January 1st of current year
  const yearEnd = today

  // Filter transactions for current year
  const ytdTransactions = transactions.filter(transaction => {
    const transactionDate = parseISO(transaction.transaction_date)
    return isWithinInterval(transactionDate, { start: yearStart, end: yearEnd })
  })

  let totalIncome = 0
  let totalExpenses = 0
  let incomeCount = 0
  let expenseCount = 0

  ytdTransactions.forEach(transaction => {
    const amountUSD = convertToUSD(transaction, exchangeRate)

    if (transaction.transaction_type === 'income') {
      totalIncome += amountUSD
      incomeCount++
    } else if (transaction.transaction_type === 'expense') {
      totalExpenses += amountUSD
      expenseCount++
    }
  })

  // Calculate months elapsed in current year
  const currentMonth = today.getMonth() + 1 // 0-indexed, so add 1
  const monthsElapsed = currentMonth

  // Calculate averages
  const averageMonthlyIncome = monthsElapsed > 0 ? totalIncome / monthsElapsed : 0
  const averageMonthlyExpenses = monthsElapsed > 0 ? totalExpenses / monthsElapsed : 0

  // Calculate savings rate (what percentage of income is saved)
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  return {
    income: totalIncome,
    expenses: totalExpenses,
    net: totalIncome - totalExpenses,
    currency: 'USD',
    transactionCount: ytdTransactions.length,
    incomeCount,
    expenseCount,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    monthsElapsed,
    savingsRate
  }
}

/**
 * Calculate 12-month trend data for charts
 * @param transactions - Array of all transactions
 * @param exchangeRate - THB to USD exchange rate (defaults to 35)
 */
export function calculate12MonthTrend(
  transactions: TransactionWithVendorAndPayment[],
  exchangeRate: number = 35
): MonthlyTrendData[] {
  const today = new Date()
  const trendData: MonthlyTrendData[] = []

  // Generate data for the past 12 months (including current month)
  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const summary = calculateMonthlySummary(transactions, targetDate, exchangeRate)

    // Format month as "Jan 2025"
    const monthLabel = formatDate(targetDate, 'MMM yyyy')

    trendData.push({
      month: monthLabel,
      income: summary.income,
      expenses: summary.expenses,
      net: summary.net
    })
  }

  return trendData
}

/**
 * Calculate top vendors by total spending
 * @param transactions - Array of all transactions
 * @param exchangeRate - THB to USD exchange rate (defaults to 35)
 * @param limit - Number of top vendors to return (defaults to 5)
 * @param timeframe - Optional timeframe ('ytd' | 'month' | 'all', defaults to 'ytd')
 */
export function calculateTopVendors(
  transactions: TransactionWithVendorAndPayment[],
  exchangeRate: number = 35,
  limit: number = 5,
  timeframe: 'ytd' | 'month' | 'all' = 'ytd'
): TopVendor[] {
  const today = new Date()

  // Filter by timeframe
  let filteredTransactions = transactions
  if (timeframe === 'ytd') {
    const yearStart = new Date(today.getFullYear(), 0, 1)
    filteredTransactions = transactions.filter(t => {
      const date = parseISO(t.transaction_date)
      return isWithinInterval(date, { start: yearStart, end: today })
    })
  } else if (timeframe === 'month') {
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    filteredTransactions = transactions.filter(t => {
      const date = parseISO(t.transaction_date)
      return isWithinInterval(date, { start: monthStart, end: monthEnd })
    })
  }

  // Only include expense transactions
  const expenseTransactions = filteredTransactions.filter(
    t => t.transaction_type === 'expense'
  )

  // Aggregate by vendor
  const vendorMap = new Map<string, { name: string; total: number; count: number; id: string | null }>()

  expenseTransactions.forEach(transaction => {
    const vendorId = transaction.vendor_id || 'no-vendor'
    const vendorName = transaction.vendor?.name || 'Uncategorized'

    const amountUSD = convertToUSD(transaction, exchangeRate)

    if (vendorMap.has(vendorId)) {
      const existing = vendorMap.get(vendorId)!
      existing.total += amountUSD
      existing.count += 1
    } else {
      vendorMap.set(vendorId, {
        id: transaction.vendor_id,
        name: vendorName,
        total: amountUSD,
        count: 1
      })
    }
  })

  // Calculate total expenses for percentage
  const totalExpenses = Array.from(vendorMap.values()).reduce((sum, v) => sum + v.total, 0)

  // Convert to array and sort by total
  const topVendors: TopVendor[] = Array.from(vendorMap.values())
    .map(vendor => ({
      vendorId: vendor.id,
      vendorName: vendor.name,
      totalAmount: vendor.total,
      transactionCount: vendor.count,
      percentOfTotal: totalExpenses > 0 ? (vendor.total / totalExpenses) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit)

  return topVendors
}
