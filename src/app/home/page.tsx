import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserMenu } from '@/components/page-specific/user-menu'
import { TransactionCard } from '@/components/ui/transaction-card'
import { Plus } from 'lucide-react'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not authenticated, redirect to login
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile data
  const { data: userProfile } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  // Create full name from first and last name
  const fullName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.first_name || userProfile?.last_name || user.email || "User"

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

  // Format amount helper function
  const formatAmount = (transaction: TransactionWithVendorAndPayment) => {
    const amount = transaction.original_currency === 'USD' 
      ? transaction.amount_usd 
      : transaction.amount_thb
    const symbol = transaction.original_currency === 'USD' ? '$' : '฿'
    return `${symbol}${amount.toFixed(2)}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main scrollable content */}
      <div className="flex flex-col gap-6 pb-32 pt-16 px-10">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h1 className="text-4xl font-medium text-foreground leading-10">
            Home
          </h1>
          <UserMenu userName={fullName}>
            <Avatar className="size-10 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </UserMenu>
        </div>

        {/* Main Content - Figma Design Implementation */}
        <div className="flex flex-col gap-4 w-full">
          {/* Row 1: KPI Cards */}
          <div className="flex flex-row gap-7 items-center justify-start w-full">
            {/* USD Exchange Rate Card */}
            <div className="flex-1">
              <Card className="bg-card border-border rounded-lg shadow-xs p-0">
                <div className="p-6">
                  <div className="flex flex-col gap-1 items-start justify-start">
                    <div className="font-medium text-xl text-foreground leading-7">
                      ฿32.24
                    </div>
                    <div className="font-normal text-sm text-muted-foreground leading-5">
                      1 USD
                    </div>
                    <div className="font-medium text-sm text-foreground leading-5">
                      as of 2:12pm
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* This Month Card */}
            <div className="flex-1">
              <Card className="bg-card border-border rounded-lg shadow-xs p-0">
                <div className="p-6">
                  <div className="flex flex-col gap-1 items-start justify-start">
                    <div className="font-medium text-xl text-foreground leading-7">
                      $2,760
                    </div>
                    <div className="font-normal text-sm text-muted-foreground leading-5">
                      1 USD
                    </div>
                    <div className="font-medium text-sm text-foreground leading-5">
                      Aug '25
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex flex-row gap-4 items-center justify-start w-full">
            <div className="flex-1 font-medium text-xs text-muted-foreground leading-4">
              Recent Transactions
            </div>
            <Button variant="link" size="default" className="text-primary" asChild>
              <Link href="/transactions">
                View all
              </Link>
            </Button>
          </div>

          {/* Transaction Cards */}
          <div className="flex flex-col gap-3 w-full">
            {transactions && transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  amount={formatAmount(transaction as TransactionWithVendorAndPayment)}
                  vendor={transaction.vendors?.name || 'Unknown Vendor'}
                  description={transaction.description || 'No description'}
                />
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex flex-col gap-2.5 pb-12 pt-6 px-10">
        <Link href="/add-transaction" className="w-full">
          <Button className="w-full gap-1.5 px-4 py-2 transition-all duration-200 hover:scale-[0.98] hover:bg-primary/90 active:scale-[0.96]">
            <Plus className="size-5 transition-transform duration-200 group-hover:rotate-90" />
            <span className="text-sm font-medium text-primary-foreground leading-5">
              Add transaction
            </span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
