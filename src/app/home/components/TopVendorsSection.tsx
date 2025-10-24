import { createClient } from '@/lib/supabase/server'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { calculateTopVendors } from '@/lib/utils/monthly-summary'
import { Card } from '@/components/ui/card'
import { TopVendorsWidget } from '@/components/ui/top-vendors-widget'

export async function TopVendorsSection() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
    .eq('user_id', user.id)
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