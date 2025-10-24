import { createClient } from '@/lib/supabase/server'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { formatTransactionDateLabel } from '@/lib/utils/date-formatter'
import { HomeTransactionList } from '@/components/page-specific/home-transaction-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export async function RecentTransactionsSection() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch only recent 5 transactions
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (id, name),
      payment_methods (id, name)
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .limit(5)

  // Transform to match expected type (vendors -> vendor, payment_methods -> payment_method)
  const transactions = (recentTransactions || []).map((tx: any) => ({
    ...tx,
    vendor: tx.vendors,
    payment_method: tx.payment_methods
  })) as TransactionWithVendorAndPayment[]

  // Group transactions by day
  const transactionGroups: { [key: string]: TransactionWithVendorAndPayment[] } = {}
  transactions.forEach(transaction => {
    const dayLabel = formatTransactionDateLabel(transaction.transaction_date)
    if (!transactionGroups[dayLabel]) {
      transactionGroups[dayLabel] = []
    }
    transactionGroups[dayLabel].push(transaction)
  })

  return (
    <div className="flex flex-col gap-2 items-start justify-start h-full min-h-0">
      <div className="flex gap-4 items-center justify-between w-full">
        <div className="flex-1 text-[12px] font-medium text-muted-foreground leading-4">
          Recent Transactions
        </div>
      </div>
      {/* Scrollable transaction area with sticky footer */}
      <div className="flex flex-col w-full bg-transparent relative flex-1 min-h-0">
        {/* Scrollable content area */}
        <div className="overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent">
          <HomeTransactionList transactionGroups={transactionGroups} />
        </div>

        {/* Sticky Footer with View All CTA */}
        <div className="sticky bottom-0 bg-background pt-4 mt-4 border-t border-zinc-200">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/transactions" className="flex items-center justify-center gap-2">
              View All Transactions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}