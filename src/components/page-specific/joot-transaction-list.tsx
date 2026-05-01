'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useInfiniteScroll, LoadMoreTrigger } from '@/hooks/use-infinite-scroll'
import { formatMatchAmount, formatMatchDate } from '@/lib/utils/match-formatting'
import { cn } from '@/lib/utils'

interface JootTransaction {
  id: string
  date: string
  vendor: string | null
  paymentMethod: string | null
  amount: number
  currency: string
  description: string | null
  type: string
  onStatement?: boolean
}

interface JootTransactionListProps {
  statementId?: string
  paymentMethodId: string
  periodStart: string
  periodEnd: string
  highlightedTransactionId?: string | null
  onRowClick?: (transactionId: string) => void
}

export function JootTransactionList({
  statementId,
  paymentMethodId,
  periodStart,
  periodEnd,
  highlightedTransactionId,
  onRowClick,
}: JootTransactionListProps) {
  const highlightRef = React.useRef<HTMLDivElement>(null)

  const {
    items,
    isLoading,
    isInitialLoading,
    hasMore,
    loadMoreRef,
  } = useInfiniteScroll<JootTransaction>({
    fetchFn: async (page, limit) => {
      const params = new URLSearchParams({
        paymentMethodId,
        periodStart,
        periodEnd,
        page: page.toString(),
        limit: limit.toString(),
      })
      if (statementId) params.set('statementId', statementId)

      const response = await fetch(`/api/imports/joot-transactions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      const data = await response.json()
      return {
        items: data.items,
        hasMore: data.pagination.hasMore,
        total: data.pagination.total,
      }
    },
    limit: 50,
    keyExtractor: (item) => item.id,
  })

  // Scroll to highlighted item
  React.useEffect(() => {
    if (highlightedTransactionId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedTransactionId])

  if (isInitialLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No Joot transactions found for this period.
      </div>
    )
  }

  // Compute summary
  const onStatementCount = items.filter(i => i.onStatement === true).length
  const notOnStatementCount = items.filter(i => i.onStatement === false).length

  return (
    <div className="space-y-1">
      {items.map(item => {
        const isHighlighted = highlightedTransactionId === item.id

        return (
          <div
            key={item.id}
            ref={isHighlighted ? highlightRef : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors',
              isHighlighted ? 'bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-200' : 'hover:bg-muted/50'
            )}
            onClick={() => onRowClick?.(item.id)}
          >
            {/* Date */}
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
              {formatMatchDate(item.date)}
            </span>

            {/* Vendor / description */}
            <span className="flex-1 min-w-0 truncate">
              {item.vendor || item.description || 'Unknown'}
            </span>

            {/* Amount */}
            <span className="text-sm font-medium flex-shrink-0">
              {formatMatchAmount(item.amount, item.currency)}
            </span>

            {/* On statement badge */}
            {item.onStatement !== undefined && (
              <div className="flex-shrink-0">
                {item.onStatement ? (
                  <Badge variant="outline" className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-[10px]">
                    On statement
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px]">
                    Not on statement
                  </Badge>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Summary footer */}
      {statementId && (
        <div className="text-xs text-muted-foreground pt-2 px-3">
          {items.length} transactions · {onStatementCount} on statement · {notOnStatementCount} not on statement
        </div>
      )}

      <LoadMoreTrigger
        loadMoreRef={loadMoreRef}
        isLoading={isLoading && !isInitialLoading}
        hasMore={hasMore}
      />
    </div>
  )
}
