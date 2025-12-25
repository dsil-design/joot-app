"use client"

import * as React from 'react'
import { TransactionCard } from './transaction-card'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { calculateTransactionDisplayAmounts } from '@/lib/utils/currency-converter'
import { formatCurrency } from '@/lib/utils'

interface HomeTransactionCardProps {
  transaction: TransactionWithVendorAndPayment
}

export function HomeTransactionCard({ transaction }: HomeTransactionCardProps) {
  const [amounts, setAmounts] = React.useState<{
    primary: string
    secondary: string | null
  }>({
    primary: '',
    secondary: null
  })

  React.useEffect(() => {
    const calculateAmounts = async () => {
      try {
        const calculatedAmounts = await calculateTransactionDisplayAmounts(transaction)
        
        setAmounts({
          primary: calculatedAmounts.primary,
          secondary: calculatedAmounts.secondary
        })
      } catch (error) {
        console.error('Error calculating display amounts:', error)
        // Fallback to showing only the recorded amount
        setAmounts({
          primary: formatCurrency(transaction.amount, transaction.original_currency),
          secondary: null
        })
      }
    }

    calculateAmounts()
  }, [transaction])

  return (
    <TransactionCard
      amount={amounts.primary}
      calculatedAmount={amounts.secondary || undefined}
      vendor={transaction.vendor?.name || 'Unknown Vendor'}
      description={transaction.description || 'No description'}
    />
  )
}