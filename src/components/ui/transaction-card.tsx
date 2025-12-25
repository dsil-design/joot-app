
'use client'

import * as React from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { calculateTransactionDisplayAmounts, getCurrentExchangeRate } from '@/lib/utils/currency-converter'

type ViewMode = 'recorded' | 'all-usd' | 'all-thb'

interface TransactionCardProps {
  // Option 1: Pass transaction object with viewMode for automatic calculation
  transaction?: TransactionWithVendorAndPayment
  viewMode?: ViewMode
  
  // Option 2: Pass pre-calculated values for pure presentation
  amount?: string
  vendor?: string
  description?: string
  calculatedAmount?: string
  
  // Common props
  className?: string
  interactive?: boolean
  onClick?: () => void
}

export const TransactionCard = React.memo(function TransactionCard({ 
  transaction,
  viewMode = 'recorded',
  amount: propAmount, 
  vendor: propVendor, 
  description: propDescription,
  calculatedAmount: propCalculatedAmount,
  className,
  interactive = false,
  onClick
}: TransactionCardProps) {
  // State for calculated amounts when using transaction prop
  const [amounts, setAmounts] = React.useState<{
    primary: string
    secondary: string | null
  }>({ primary: '', secondary: null })

  // Calculate amounts if transaction prop is provided
  React.useEffect(() => {
    if (!transaction) return

    const calculateAmounts = async () => {
      if (viewMode === 'all-usd') {
        // Show only USD amounts - need to calculate if transaction was recorded in THB
        if (transaction.original_currency === 'USD') {
          setAmounts({
            primary: formatCurrency(transaction.amount, 'USD'),
            secondary: null
          })
        } else {
          // Need to convert THB to USD
          try {
            const { rate } = await getCurrentExchangeRate('THB', 'USD')
            const usdAmount = transaction.amount * (rate || 0.028)
            setAmounts({
              primary: formatCurrency(usdAmount, 'USD'),
              secondary: null
            })
          } catch {
            setAmounts({
              primary: formatCurrency(transaction.amount * 0.028, 'USD'),
              secondary: null
            })
          }
        }
      } else if (viewMode === 'all-thb') {
        // Show only THB amounts - need to calculate if transaction was recorded in USD
        if (transaction.original_currency === 'THB') {
          setAmounts({
            primary: formatCurrency(transaction.amount, 'THB'),
            secondary: null
          })
        } else {
          // Need to convert USD to THB
          try {
            const { rate } = await getCurrentExchangeRate('USD', 'THB')
            const thbAmount = transaction.amount * (rate || 35)
            setAmounts({
              primary: formatCurrency(thbAmount, 'THB'),
              secondary: null
            })
          } catch {
            setAmounts({
              primary: formatCurrency(transaction.amount * 35, 'THB'),
              secondary: null
            })
          }
        }
      } else {
        // 'recorded' - show recorded amount as primary, calculate secondary
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
    }

    calculateAmounts()
  }, [transaction, viewMode])

  // Determine values to use (from transaction or props)
  const amount = transaction ? amounts.primary : (propAmount || '')
  const calculatedAmount = transaction ? amounts.secondary : propCalculatedAmount
  const vendor = transaction ? (transaction.vendor?.name || 'Unknown Vendor') : (propVendor || '')
  const description = transaction ? (transaction.description || 'No description') : (propDescription || '')

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }, [interactive, onClick])

  const ariaLabel = React.useMemo(() => {
    if (!interactive) return undefined
    const parts = [`Transaction: ${description}`, `Vendor: ${vendor}`, `Amount: ${amount}`]
    if (calculatedAmount) {
      parts.push(`Converted: ${calculatedAmount}`)
    }
    return parts.join(', ')
  }, [interactive, description, vendor, amount, calculatedAmount])

  return (
    <div 
      className={cn(
        // Direct div approach matching Figma exactly - no Card component padding conflicts
        'w-full bg-white border border-zinc-200 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-shadow duration-200',
        interactive && [
          'cursor-pointer hover:shadow-md',
          'focus:ring-2 focus:ring-primary/50',
          'focus:outline-none'
        ],
        className
      )}
      onClick={interactive ? onClick : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      aria-label={ariaLabel}
    >
      <div className="p-6">
        <div className="flex items-start justify-start w-full gap-1">
          {/* Left side: Description and vendor */}
          <div className="flex flex-col justify-between min-w-0 flex-1 self-stretch" role="group" aria-labelledby="transaction-details">
            <p 
              id="transaction-details"
              className="text-[14px] font-medium text-zinc-950 leading-[20px] truncate"
              title={description}
            >
              {description}
            </p>
            <p 
              className="text-[14px] font-normal text-zinc-500 leading-[20px] truncate"
              title={vendor}
              aria-label={`Vendor: ${vendor}`}
            >
              {vendor}
            </p>
          </div>
          
          {/* Right side: Amounts */}
          <div className="flex flex-col gap-1 items-end justify-start text-right shrink-0" role="group" aria-label="Transaction amounts">
            <p 
              className="text-[20px] font-medium text-black leading-[28px]"
              title={amount}
              aria-label={`Primary amount: ${amount}`}
            >
              {amount}
            </p>
            {calculatedAmount && (
              <p 
                className="text-[14px] font-normal text-zinc-500 leading-[20px]"
                title={calculatedAmount}
                aria-label={`Converted amount: ${calculatedAmount}`}
              >
                {calculatedAmount}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
