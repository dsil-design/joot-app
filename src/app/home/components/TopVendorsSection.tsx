import { createClient } from '@/lib/supabase/server'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { calculateTopVendors } from '@/lib/utils/monthly-summary'
import { Card } from '@/components/ui/card'
import { TopVendorsWidget } from '@/components/ui/top-vendors-widget'

interface TopVendorsSectionProps {
  userId: string
  exchangeRate: number
}

export async function TopVendorsSection({ userId, exchangeRate }: TopVendorsSectionProps) {
  const supabase = await createClient()

  // Fetch only YTD transactions for top vendors
  const currentYear = new Date().getFullYear()
  const yearStart = `${currentYear}-01-01`

  const { data: vendorTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (id, name),
      payment_methods (id, name)
    `)
    .eq('user_id', userId)
    .eq('transaction_type', 'expense')  // Only expenses for vendors
    .gte('transaction_date', yearStart)

  // Transform to match expected type (vendors -> vendor, payment_methods -> payment_method)
  const transactions = (vendorTransactions || []).map((tx: any) => ({
    ...tx,
    vendor: tx.vendors,
    payment_method: tx.payment_methods
  })) as TransactionWithVendorAndPayment[]

  if (transactions.length === 0) {
    return null
  }

  const topVendors = calculateTopVendors(transactions, exchangeRate, 5, 'ytd')

  if (topVendors.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 items-start justify-start">
      <div className="text-[12px] font-medium text-muted-foreground leading-4">
        Top Spending
      </div>
      <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0 w-full">
        <div className="p-6">
          <TopVendorsWidget vendors={topVendors} timeframeLabel="Year to Date" />
        </div>
      </Card>
    </div>
  )
}