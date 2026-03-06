'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInfiniteScroll, LoadMoreTrigger } from '@/hooks/use-infinite-scroll'
import { cleanStatementDescription } from '@/lib/utils/statement-description'
import { formatMatchAmount, formatMatchDate } from '@/lib/utils/match-formatting'
import { cn } from '@/lib/utils'
import { Link2, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

interface StatementTransaction {
  index: number
  date: string
  description: string
  amount: number
  currency: string
  type: string
  matchStatus: 'matched' | 'unmatched' | 'new' | 'credit'
  matchedTransactionId: string | null
  confidence: number
  suggestionStatus: string | null
}

interface StatementTransactionListProps {
  statementId: string
  paymentMethodType?: string
  onLinkClick?: (item: StatementTransaction) => void
  onCreateClick?: (item: StatementTransaction) => void
  highlightedMatchId?: string | null
  onRowClick?: (matchedTransactionId: string) => void
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'matched':
      return <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-[10px]">Matched</Badge>
    case 'unmatched':
      return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 text-[10px]">Unmatched</Badge>
    case 'new':
      return <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700 text-[10px]">New</Badge>
    case 'credit':
      return <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-600 text-[10px]">Credit</Badge>
    default:
      return null
  }
}

function TransactionTypeIndicator({ type }: { type: string }) {
  const isCredit = type === 'credit' || type === 'transfer_in'
  const isTransfer = type === 'transfer_in' || type === 'transfer_out'
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight

  return (
    <span className={cn(
      "flex items-center gap-0.5 text-[10px] font-medium",
      isTransfer ? "text-zinc-400" : isCredit ? "text-green-600" : "text-zinc-500"
    )}>
      <Icon className="h-3 w-3" />
    </span>
  )
}

export function StatementTransactionList({
  statementId,
  paymentMethodType,
  onLinkClick,
  onCreateClick,
  highlightedMatchId,
  onRowClick,
}: StatementTransactionListProps) {
  const isBankAccount = paymentMethodType === 'bank_account'
  const highlightRef = React.useRef<HTMLDivElement>(null)

  const {
    items,
    isLoading,
    isInitialLoading,
    hasMore,
    loadMoreRef,
  } = useInfiniteScroll<StatementTransaction>({
    fetchFn: async (page, limit) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      const response = await fetch(`/api/statements/${statementId}/transactions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      const data = await response.json()
      return {
        items: data.items,
        hasMore: data.pagination.hasMore,
        total: data.pagination.total,
      }
    },
    limit: 50,
    keyExtractor: (item) => `${item.index}`,
  })

  // Scroll to highlighted item
  React.useEffect(() => {
    if (highlightedMatchId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedMatchId])

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
        No transactions found in this statement.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map(item => {
        const isHighlighted = highlightedMatchId && item.matchedTransactionId === highlightedMatchId

        return (
          <div
            key={item.index}
            ref={isHighlighted ? highlightRef : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isHighlighted ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-muted/50',
              item.matchedTransactionId && 'cursor-pointer'
            )}
            onClick={() => {
              if (item.matchedTransactionId) {
                onRowClick?.(item.matchedTransactionId)
              }
            }}
          >
            {/* Date */}
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
              {formatMatchDate(item.date)}
            </span>

            {/* Direction indicator for bank statements */}
            {isBankAccount && item.type && (
              <TransactionTypeIndicator type={item.type} />
            )}

            {/* Description */}
            <span className={cn(
              "flex-1 min-w-0 truncate",
              isBankAccount && (item.type === 'transfer_in' || item.type === 'transfer_out') && "text-muted-foreground"
            )}>
              {cleanStatementDescription(item.description)}
            </span>

            {/* Amount */}
            <span className="text-sm font-medium flex-shrink-0">
              {formatMatchAmount(item.amount, item.currency)}
            </span>

            {/* Status */}
            <div className="flex-shrink-0">
              {getStatusBadge(item.matchStatus)}
            </div>

            {/* Actions for unmatched/new */}
            {(item.matchStatus === 'unmatched' || item.matchStatus === 'new') && (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={e => {
                    e.stopPropagation()
                    onLinkClick?.(item)
                  }}
                >
                  <Link2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={e => {
                    e.stopPropagation()
                    onCreateClick?.(item)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )
      })}

      <LoadMoreTrigger
        loadMoreRef={loadMoreRef}
        isLoading={isLoading && !isInitialLoading}
        hasMore={hasMore}
      />
    </div>
  )
}
