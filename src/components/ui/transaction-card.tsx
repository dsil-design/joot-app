
import React from 'react'
import { Card, CardContent } from './card'
import { cn } from '@/lib/utils'

interface TransactionCardProps {
  amount: string
  vendor: string
  description: string
  calculatedAmount?: string
  className?: string
  interactive?: boolean
  onClick?: () => void
}

export const TransactionCard = React.memo(function TransactionCard({ 
  amount, 
  vendor, 
  description,
  calculatedAmount,
  className,
  interactive = false,
  onClick
}: TransactionCardProps) {
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
    <Card 
      className={cn(
        'transition-shadow duration-200',
        interactive && [
          'cursor-pointer hover:shadow-md',
          'focus-within:ring-2 focus-within:ring-primary/50',
          'focus-within:outline-none'
        ],
        className
      )}
      onClick={interactive ? onClick : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      aria-label={ariaLabel}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between w-full gap-4">
          <div className="flex flex-col gap-1 min-w-0 flex-1" role="group" aria-labelledby="transaction-details">
            <p 
              id="transaction-details"
              className="font-medium text-card-foreground text-sm leading-5 truncate"
              title={description}
            >
              {description}
            </p>
            <p 
              className="font-normal text-muted-foreground text-sm leading-5 truncate"
              title={vendor}
              aria-label={`Vendor: ${vendor}`}
            >
              {vendor}
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end text-right shrink-0" role="group" aria-label="Transaction amounts">
            <p 
              className="font-medium text-foreground text-xl leading-7"
              title={amount}
              aria-label={`Primary amount: ${amount}`}
            >
              {amount}
            </p>
            {calculatedAmount && (
              <p 
                className="font-normal text-muted-foreground text-sm leading-5"
                title={calculatedAmount}
                aria-label={`Converted amount: ${calculatedAmount}`}
              >
                {calculatedAmount}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
