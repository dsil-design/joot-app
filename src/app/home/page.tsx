import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { formatExchangeRateTimestamp, formatTransactionDateLabel } from '@/lib/utils/date-formatter'
import { formatCurrency } from '@/lib/utils'
import {
  calculateEnhancedMonthlySummary,
  calculateYTDSummary,
  calculate12MonthTrend,
  calculateTopVendors
} from '@/lib/utils/monthly-summary'
import { format } from 'date-fns'
import { HomePageClient } from '@/components/shared/HomePageClient'

interface HomePageProps {
  searchParams?: Promise<{ error?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not authenticated, redirect to login
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile data with role information
  const { data: userProfile } = await supabase
    .from('users')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  // Create full name from first and last name
  const fullName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.first_name || userProfile?.last_name || user.email || "User"

  // Check if user has admin role (fallback to email check)
  const isAdminByRole = userProfile?.role === 'admin'
  const isAdminByEmail = user.email === 'admin@dsil.design'
  const isAdmin = isAdminByRole || isAdminByEmail

  // Generate initials from first and last name
  const getInitials = (firstName?: string | null, lastName?: string | null): string => {
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    if (lastName) {
      return lastName.charAt(0).toUpperCase()
    }
    return "U" // Default fallback
  }

  const userInitials = getInitials(userProfile?.first_name, userProfile?.last_name)

  // Fetch ALL transactions for summary calculations (needed for 12-month averages)
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (
        id,
        name
      ),
      payment_methods (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })

  // Get recent 5 for display only
  const transactions = allTransactions?.slice(0, 5) || []

  // Fetch latest USD to THB exchange rate
  const { data: latestExchangeRate } = await supabase
    .from('exchange_rates')
    .select('rate, date, created_at')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'THB')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  // Format exchange rate and timestamp
  const exchangeRate = latestExchangeRate?.rate ? formatCurrency(latestExchangeRate.rate, 'THB') : '฿35.00'
  const exchangeRateTimestamp = latestExchangeRate?.created_at 
    ? formatExchangeRateTimestamp(latestExchangeRate.created_at)
    : latestExchangeRate?.date 
    ? formatExchangeRateTimestamp(latestExchangeRate.date)
    : 'no data available'

  // Group transactions by day
  const groupTransactionsByDay = (transactions: TransactionWithVendorAndPayment[]) => {
    const groups: { [key: string]: TransactionWithVendorAndPayment[] } = {}

    transactions.forEach(transaction => {
      const dayLabel = formatTransactionDateLabel(transaction.transaction_date)

      if (!groups[dayLabel]) {
        groups[dayLabel] = []
      }
      groups[dayLabel].push(transaction)
    })

    return groups
  }

  const transactionGroups = groupTransactionsByDay(transactions)

  // Calculate enhanced monthly summary using ALL transactions for accurate comparisons
  const enhancedMonthlySummary = allTransactions && allTransactions.length > 0
    ? calculateEnhancedMonthlySummary(allTransactions, new Date(), latestExchangeRate?.rate || 35)
    : null

  // Calculate YTD summary
  const ytdSummary = allTransactions && allTransactions.length > 0
    ? calculateYTDSummary(allTransactions, latestExchangeRate?.rate || 35)
    : null

  // Calculate 12-month trend
  const monthlyTrend = allTransactions && allTransactions.length > 0
    ? calculate12MonthTrend(allTransactions, latestExchangeRate?.rate || 35)
    : []

  // Calculate top vendors (YTD by default)
  const topVendors = allTransactions && allTransactions.length > 0
    ? calculateTopVendors(allTransactions, latestExchangeRate?.rate || 35, 5, 'ytd')
    : []

  // Get current month name for display
  const currentMonthName = format(new Date(), 'MMMM yyyy')

  return (
    <HomePageClient
      fullName={fullName}
      userInitials={userInitials}
      userEmail={user.email || ''}
      isAdmin={isAdmin}
      currentMonthName={currentMonthName}
      enhancedMonthlySummary={enhancedMonthlySummary}
      ytdSummary={ytdSummary}
      monthlyTrend={monthlyTrend}
      topVendors={topVendors}
      exchangeRate={exchangeRate}
      exchangeRateTimestamp={exchangeRateTimestamp}
      transactionGroups={transactionGroups}
      errorMessage={resolvedSearchParams?.error}
    />
  )
}
