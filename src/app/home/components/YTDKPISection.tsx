import { createClient } from '@/lib/supabase/server'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { calculateYTDSummary } from '@/lib/utils/monthly-summary'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

export async function YTDKPISection() {
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

  // Fetch only current year transactions for YTD
  const currentYear = new Date().getFullYear()
  const yearStart = `${currentYear}-01-01`

  const { data: ytdTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (id, name),
      payment_methods (id, name)
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', yearStart)
    .order('transaction_date', { ascending: false })

  const transactions = (ytdTransactions || []) as TransactionWithVendorAndPayment[]

  const ytdSummary = transactions.length > 0
    ? calculateYTDSummary(transactions, exchangeRate)
    : null

  if (!ytdSummary) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="text-[12px] font-medium text-muted-foreground leading-4">
        Year to Date (2025)
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* YTD Income */}
        <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0">
          <div className="p-6 xl:p-5">
            <div className="flex flex-col gap-2 xl:gap-1.5">
              <div className="text-[12px] font-medium text-zinc-500 leading-4">
                Total Income
              </div>
              <div className="text-[24px] xl:text-[20px] font-semibold text-green-600 leading-[32px] xl:leading-[28px]">
                {formatCurrency(ytdSummary.income, 'USD')}
              </div>
              <div className="text-[12px] font-normal text-zinc-400 leading-4">
                {formatCurrency(ytdSummary.averageMonthlyIncome, 'USD')}/month avg
              </div>
            </div>
          </div>
        </Card>

        {/* YTD Expenses */}
        <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0">
          <div className="p-6 xl:p-5">
            <div className="flex flex-col gap-2 xl:gap-1.5">
              <div className="text-[12px] font-medium text-zinc-500 leading-4">
                Total Expenses
              </div>
              <div className="text-[24px] xl:text-[20px] font-semibold text-red-600 leading-[32px] xl:leading-[28px]">
                {formatCurrency(ytdSummary.expenses, 'USD')}
              </div>
              <div className="text-[12px] font-normal text-zinc-400 leading-4">
                {formatCurrency(ytdSummary.averageMonthlyExpenses, 'USD')}/month avg
              </div>
            </div>
          </div>
        </Card>

        {/* YTD Net */}
        <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0">
          <div className="p-6 xl:p-5">
            <div className="flex flex-col gap-2 xl:gap-1.5">
              <div className="text-[12px] font-medium text-zinc-500 leading-4">
                Net {ytdSummary.net >= 0 ? 'Surplus' : 'Deficit'}
              </div>
              <div className={`text-[24px] xl:text-[20px] font-semibold leading-[32px] xl:leading-[28px] ${
                ytdSummary.net >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(ytdSummary.net), 'USD')}
              </div>
              <div className="text-[12px] font-normal text-zinc-400 leading-4">
                {ytdSummary.savingsRate.toFixed(1)}% savings rate
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}