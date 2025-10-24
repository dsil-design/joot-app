"use client"

import { useState, useEffect, useTransition } from 'react'
import { TrendChartCard } from '@/components/ui/trend-chart-card'
import type { TimePeriod } from '@/components/ui/time-period-toggle'
import type { MonthlyTrendData } from '@/lib/utils/monthly-summary'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calculateTrendDataForPeriod } from '@/lib/utils/trend-data-helpers'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'

interface DynamicTrendChartProps {
  initialData: MonthlyTrendData[]
  defaultPeriod?: TimePeriod
}

export function DynamicTrendChart({ initialData, defaultPeriod = 'ytd' }: DynamicTrendChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(defaultPeriod)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  // Fetch all transactions when needed for different periods
  const { data: allTransactions, isLoading } = useQuery({
    queryKey: ['all-transactions-for-trend'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get earliest transaction date to determine if we need to fetch all
      if (selectedPeriod === 'all' || selectedPeriod === '5y' || selectedPeriod === '3y') {
        // For longer periods, fetch more data
        const yearsToFetch = selectedPeriod === 'all' ? 100 : parseInt(selectedPeriod)
        const dateLimit = new Date()
        dateLimit.setFullYear(dateLimit.getFullYear() - yearsToFetch)

        const { data } = await supabase
          .from('transactions')
          .select(`
            *,
            vendors (id, name),
            payment_methods (id, name)
          `)
          .eq('user_id', user.id)
          .gte('transaction_date', dateLimit.toISOString().split('T')[0])
          .order('transaction_date', { ascending: false })

        // Transform to match expected type (vendors -> vendor, payment_methods -> payment_method)
        return (data || []).map((tx: any) => ({
          ...tx,
          vendor: tx.vendors,
          payment_method: tx.payment_methods
        })) as TransactionWithVendorAndPayment[]
      }
      return []
    },
    enabled: selectedPeriod !== 'ytd' && selectedPeriod !== '1y' && selectedPeriod !== '2y',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Calculate trend data based on selected period
  const trendData = (() => {
    if (selectedPeriod === 'ytd' || selectedPeriod === '1y' || selectedPeriod === '2y') {
      // Use initial data for short periods
      return initialData
    }

    if (allTransactions && allTransactions.length > 0) {
      // Fetch exchange rate from initial data or use default
      const exchangeRate = 35 // You might want to pass this as a prop
      return calculateTrendDataForPeriod(allTransactions, selectedPeriod, exchangeRate)
    }

    return initialData
  })()

  return (
    <TrendChartCard
      data={trendData.map(point => ({
        date: point.month,
        income: point.income,
        expenses: point.expenses,
        net: point.net,
      }))}
      title="Net Worth Trend"
      defaultPeriod={defaultPeriod}
      height={300}
      className="w-full"
    />
  )
}