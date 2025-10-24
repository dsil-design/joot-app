import { createClient } from '@/lib/supabase/server'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { calculateEnhancedMonthlySummary } from '@/lib/utils/monthly-summary'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { ComparisonMetric } from '@/components/ui/comparison-metric'
import { formatCurrency } from '@/lib/utils'
import { unstable_cache } from 'next/cache'

export async function MonthlyKPISection() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch latest exchange rate first
  const { data: latestExchangeRate } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'THB')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const exchangeRate = latestExchangeRate?.rate || 35

  // Fetch only current and previous month transactions for monthly KPIs
  const today = new Date()
  const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1)

  const { data: monthlyTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors (id, name),
      payment_methods (id, name)
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', twoMonthsAgo.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false })

  // Transform to match expected type (vendors -> vendor, payment_methods -> payment_method)
  const transactions = (monthlyTransactions || []).map((tx: any) => ({
    ...tx,
    vendor: tx.vendors,
    payment_method: tx.payment_methods
  })) as TransactionWithVendorAndPayment[]

  const monthlySummary = transactions.length > 0
    ? calculateEnhancedMonthlySummary(transactions, today, exchangeRate)
    : null

  const currentMonthName = format(today, 'MMMM yyyy')

  if (!monthlySummary) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="text-[12px] font-medium text-muted-foreground leading-4">
            {currentMonthName}
          </div>
          <div className="text-[12px] font-normal text-zinc-400 leading-4">
            No data available
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white border-zinc-200 rounded-lg shadow-sm p-6 xl:p-5">
              <div className="text-center text-muted-foreground">No transactions yet</div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Current Month Header */}
      <div className="flex items-center gap-3">
        <div className="text-[12px] font-medium text-muted-foreground leading-4">
          {currentMonthName}
        </div>
        <div className="text-[12px] font-normal text-zinc-400 leading-4">
          {monthlySummary.daysElapsed} of {monthlySummary.daysInMonth} days ({monthlySummary.percentElapsed}%)
        </div>
      </div>

      {/* KPI Cards - Current Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Total Income */}
        <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0">
          <div className="p-6 xl:p-5">
            <div className="flex flex-col gap-2 xl:gap-1.5">
              <div className="text-[12px] font-medium text-zinc-500 leading-4">
                Total Income
              </div>
              <div className="text-[24px] xl:text-[20px] font-semibold text-green-600 leading-[32px] xl:leading-[28px]">
                {formatCurrency(monthlySummary.income, 'USD')}
              </div>
              <div className="text-[12px] font-normal text-zinc-400 leading-4">
                {monthlySummary.incomeCount} {monthlySummary.incomeCount === 1 ? 'transaction' : 'transactions'}
              </div>
              {monthlySummary.previousMonth && (
                <ComparisonMetric
                  value={monthlySummary.previousMonth.income.current}
                  changeDirection={monthlySummary.previousMonth.income.changeDirection}
                  changePercent={monthlySummary.previousMonth.income.changePercent}
                  label="vs last month"
                  variant="default"
                />
              )}
            </div>
          </div>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0">
          <div className="p-6 xl:p-5">
            <div className="flex flex-col gap-2 xl:gap-1.5">
              <div className="text-[12px] font-medium text-zinc-500 leading-4">
                Total Expenses
              </div>
              <div className="text-[24px] xl:text-[20px] font-semibold text-red-600 leading-[32px] xl:leading-[28px]">
                {formatCurrency(monthlySummary.expenses, 'USD')}
              </div>
              <div className="text-[12px] font-normal text-zinc-400 leading-4">
                {monthlySummary.expenseCount} {monthlySummary.expenseCount === 1 ? 'transaction' : 'transactions'}
              </div>
              {monthlySummary.previousMonth && (
                <ComparisonMetric
                  value={monthlySummary.previousMonth.expenses.current}
                  changeDirection={monthlySummary.previousMonth.expenses.changeDirection}
                  changePercent={monthlySummary.previousMonth.expenses.changePercent}
                  label="vs last month"
                  variant="inverse"
                />
              )}
            </div>
          </div>
        </Card>

        {/* Net Surplus/Deficit */}
        <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0">
          <div className="p-6 xl:p-5">
            <div className="flex flex-col gap-2 xl:gap-1.5">
              <div className="text-[12px] font-medium text-zinc-500 leading-4">
                Net {monthlySummary.net >= 0 ? 'Surplus' : 'Deficit'}
              </div>
              <div className={`text-[24px] xl:text-[20px] font-semibold leading-[32px] xl:leading-[28px] ${
                monthlySummary.net >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(monthlySummary.net), 'USD')}
              </div>
              <div className="text-[12px] font-normal text-zinc-400 leading-4">
                {monthlySummary.transactionCount} total {monthlySummary.transactionCount === 1 ? 'transaction' : 'transactions'}
              </div>
              {monthlySummary.previousMonth && (
                <ComparisonMetric
                  value={monthlySummary.previousMonth.net.current}
                  changeDirection={monthlySummary.previousMonth.net.changeDirection}
                  changePercent={monthlySummary.previousMonth.net.changePercent}
                  label="vs last month"
                  variant="default"
                />
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}