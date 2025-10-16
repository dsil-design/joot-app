"use client"

import * as React from 'react'
import { TransactionCard } from './transaction-card'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { calculateTransactionDisplayAmounts, triggerExchangeRateSync } from '@/lib/utils/currency-converter'

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
        
        // If sync is needed and secondary is null, trigger sync
        if (calculatedAmounts.secondaryNeedsSync && !calculatedAmounts.secondary) {
          const syncSuccess = await triggerExchangeRateSync()
          if (syncSuccess) {
            // Retry calculation after sync
            setTimeout(async () => {
              const retryAmounts = await calculateTransactionDisplayAmounts(transaction)
              setAmounts({
                primary: retryAmounts.primary,
                secondary: retryAmounts.secondary
              })
            }, 2000) // Wait 2 seconds for sync to potentially complete
          }
        }
      } catch (error) {
        console.error('Error calculating display amounts:', error)
        // Fallback to showing only the recorded amount
        const symbol = transaction.original_currency === 'USD' ? '$' : '฿'
        setAmounts({
          primary: `${symbol}${transaction.amount.toFixed(2)}`,
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
      vendor={transaction.vendors?.name || 'Unknown Vendor'}
      description={transaction.description || 'No description'}
    />
  )
}