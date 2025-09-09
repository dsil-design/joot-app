import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserMenu } from '@/components/page-specific/user-menu'
import { TransactionCard } from '@/components/ui/transaction-card'
import { AddTransactionFooter } from '@/components/page-specific/add-transaction-footer'
import { X } from 'lucide-react'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { formatExchangeRateTimestamp } from '@/lib/utils/date-formatter'
import { formatCurrency } from '@/lib/utils'

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

  // Fetch recent transactions (limit to 5 for home page)
  const { data: transactions } = await supabase
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
    .limit(5)

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
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.transaction_date)
      const dateStr = transactionDate.toDateString()
      const todayStr = today.toDateString()
      const yesterdayStr = yesterday.toDateString()
      
      let dayLabel: string
      if (dateStr === todayStr) {
        dayLabel = 'Today'
      } else if (dateStr === yesterdayStr) {
        dayLabel = 'Yesterday'
      } else {
        dayLabel = transactionDate.toLocaleDateString('en-US', { weekday: 'long' })
      }
      
      if (!groups[dayLabel]) {
        groups[dayLabel] = []
      }
      groups[dayLabel].push(transaction)
    })
    
    return groups
  }

  const transactionGroups = transactions ? groupTransactionsByDay(transactions) : {}

  return (
    <div className="min-h-screen bg-background">
      {/* Error message for unauthorized access */}
      {(resolvedSearchParams?.error === 'unauthorized' || resolvedSearchParams?.error === 'auth_error') && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="bg-destructive/10 border-destructive text-destructive p-4 shadow-lg max-w-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Access denied. Admin privileges required.
              </span>
              <Button variant="ghost" size="sm" className="h-auto p-1 text-destructive hover:text-destructive/80">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main scrollable content */}
      <div className="flex flex-col gap-6 pb-12 pt-16 px-10">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
            Home
          </h1>
          <UserMenu userName={fullName} isAdmin={isAdmin}>
            <Avatar className="size-10 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback className="bg-zinc-100 text-zinc-950 text-sm font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </UserMenu>
        </div>

        {/* Main Content - Figma Design Implementation */}
        <div className="flex flex-col gap-4 w-full">
          {/* Opening Section - Latest Exchange Rate */}
          <div className="flex flex-col gap-2 items-start justify-start w-full">
            <div className="text-[12px] font-medium text-muted-foreground leading-4">
              Latest exchange rate
            </div>
            <Card className="bg-white border-zinc-200 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-0 w-full">
              <div className="p-6">
                <div className="flex flex-col gap-1 items-start justify-start">
                  <div className="text-[20px] font-medium text-zinc-950 leading-[28px]">
                    {exchangeRate}
                  </div>
                  <div className="text-[14px] font-normal text-zinc-500 leading-[20px]">
                    1 USD
                  </div>
                  <div className="text-[14px] font-medium text-zinc-950 leading-[20px]">
                    as of {exchangeRateTimestamp}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Section Header */}
          <div className="flex gap-4 items-center justify-start w-full">
            <div className="flex-1 text-[12px] font-medium text-muted-foreground leading-4">
              Recent Transactions
            </div>
            <Button variant="link" size="default" className="text-[#155dfc] h-9 px-4 py-2" asChild>
              <Link href="/transactions">
                View all
              </Link>
            </Button>
          </div>

          {/* Transaction Groups by Day */}
          <div className="flex flex-col gap-4 w-full">
            {Object.keys(transactionGroups).length > 0 ? (
              Object.entries(transactionGroups).map(([dayLabel, dayTransactions]) => (
                <div key={dayLabel} className="flex flex-col gap-2 items-start justify-start w-full">
                  <div className="text-[12px] font-light text-muted-foreground leading-4">
                    {dayLabel}
                  </div>
                  <div className="flex flex-col gap-0 w-full">
                    {dayTransactions.map((transaction, index) => (
                      <div key={transaction.id} className={index > 0 ? "mt-2" : ""}>
                        <TransactionCard 
                          transaction={transaction as TransactionWithVendorAndPayment}
                          viewMode="recorded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet. Add your first transaction!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Sticky Footer - Always visible at bottom */}
      <AddTransactionFooter />
    </div>
  )
}
