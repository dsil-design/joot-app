'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInfiniteScroll, LoadMoreTrigger } from '@/hooks/use-infinite-scroll'
import { cleanStatementDescription } from '@/lib/utils/statement-description'
import { formatMatchAmount, formatMatchDate } from '@/lib/utils/match-formatting'
import { cn } from '@/lib/utils'
import { Link2, Plus, ArrowDownLeft, ArrowUpRight, ArrowRight, Check, EyeOff, Undo2 } from 'lucide-react'

interface JootTransactionSummary {
  id: string
  description: string | null
  amount: number
  original_currency: string
  transaction_date: string
  vendor_name: string | null
}

export interface StatementTransaction {
  index: number
  date: string
  description: string
  amount: number
  currency: string
  type: string
  matchStatus: 'linked' | 'matched' | 'unmatched' | 'new' | 'ignored'
  matchedTransactionId: string | null
  originalMatchedTransactionId: string | null
  confidence: number
  reasons: string[]
  suggestionStatus: string | null
  jootTransaction: JootTransactionSummary | null
}

export interface StatementTransactionListHandle {
  refresh: () => Promise<void>
}

interface StatementTransactionListProps {
  statementId: string
  paymentMethodType?: string
  onLinkClick?: (item: StatementTransaction) => void
  onCreateClick?: (item: StatementTransaction) => void
  onIgnoreClick?: (item: StatementTransaction) => void
  onUnignoreClick?: (item: StatementTransaction) => void
  highlightedMatchId?: string | null
  onRowClick?: (item: StatementTransaction) => void
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

function LinkedJootCell({ joot, autoLinked }: { joot: JootTransactionSummary; autoLinked: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Check className="h-3 w-3 text-green-600 shrink-0" />
      <span className="truncate text-xs text-zinc-700">
        {joot.vendor_name || joot.description || 'Transaction'}
      </span>
      <span className="text-xs font-medium text-zinc-500 shrink-0">
        {formatMatchAmount(joot.amount, joot.original_currency)}
      </span>
      {autoLinked && (
        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-600 text-[9px] px-1 py-0 shrink-0">
          Auto
        </Badge>
      )}
    </div>
  )
}

function MatchedJootCell({ joot, confidence }: { joot: JootTransactionSummary; confidence: number }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
      <span className="truncate text-xs text-zinc-500">
        {joot.vendor_name || joot.description || 'Transaction'}
      </span>
      <span className="text-xs font-medium text-zinc-400 shrink-0">
        {formatMatchAmount(joot.amount, joot.original_currency)}
      </span>
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-600 text-[9px] px-1 py-0 shrink-0">
        {confidence}%
      </Badge>
    </div>
  )
}

export const StatementTransactionList = React.forwardRef<
  StatementTransactionListHandle,
  StatementTransactionListProps
>(function StatementTransactionList({
  statementId,
  paymentMethodType,
  onLinkClick,
  onCreateClick,
  onIgnoreClick,
  onUnignoreClick,
  highlightedMatchId,
  onRowClick,
}, ref) {
  const isBankAccount = paymentMethodType === 'bank_account'
  const highlightRef = React.useRef<HTMLDivElement>(null)

  const {
    items,
    isLoading,
    isInitialLoading,
    hasMore,
    loadMoreRef,
    refresh,
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

  React.useImperativeHandle(ref, () => ({ refresh }), [refresh])

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
          <Skeleton key={i} className="h-16 w-full" />
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
    <div className="space-y-0.5">
      {items.map(item => {
        const isHighlighted = highlightedMatchId && item.matchedTransactionId === highlightedMatchId
        const isLinked = item.matchStatus === 'linked'
        const isMatched = item.matchStatus === 'matched'
        const isIgnored = item.matchStatus === 'ignored'
        const isActionable = item.matchStatus === 'unmatched' || item.matchStatus === 'new'

        return (
          <div
            key={item.index}
            ref={isHighlighted ? highlightRef : undefined}
            className={cn(
              'rounded-lg px-3 py-2.5 text-sm transition-colors',
              isHighlighted && 'ring-1 ring-blue-200',
              isLinked && 'bg-green-50/50 hover:bg-green-50',
              isMatched && 'bg-amber-50/40 hover:bg-amber-50/70 cursor-pointer',
              isIgnored && 'opacity-50 bg-zinc-50',
              isActionable && 'hover:bg-muted/50',
              !isLinked && !isMatched && !isActionable && !isIgnored && 'hover:bg-muted/30',
              (isLinked || isMatched) && 'cursor-pointer',
            )}
            onClick={() => {
              if (item.matchedTransactionId) {
                onRowClick?.(item)
              }
            }}
          >
            {/* Top row: statement transaction */}
            <div className="flex items-center gap-3">
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
                isIgnored && "line-through text-muted-foreground",
                !isIgnored && isBankAccount && (item.type === 'transfer_in' || item.type === 'transfer_out') && "text-muted-foreground"
              )}>
                {cleanStatementDescription(item.description)}
              </span>

              {/* Amount */}
              <span className={cn(
                "text-sm font-medium flex-shrink-0",
                isIgnored && "line-through text-muted-foreground",
                !isIgnored && item.amount < 0 && "text-green-600"
              )}>
                {item.amount < 0 ? '−' : ''}{formatMatchAmount(item.amount, item.currency)}
              </span>

              {/* Ignored badge + undo */}
              {isIgnored && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className="border-zinc-300 text-zinc-500 text-[9px] px-1 py-0">
                    Ignored
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-zinc-600"
                    title="Restore"
                    onClick={e => {
                      e.stopPropagation()
                      onUnignoreClick?.(item)
                    }}
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Actions for unmatched/new */}
              {isActionable && (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-zinc-600"
                    title="Ignore"
                    onClick={e => {
                      e.stopPropagation()
                      onIgnoreClick?.(item)
                    }}
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Bottom row: linked/matched Joot transaction */}
            {isLinked && item.jootTransaction && (
              <div className="mt-1 ml-[calc(5rem+0.75rem)] border-l-2 border-green-300 pl-3">
                <LinkedJootCell
                  joot={item.jootTransaction}
                  autoLinked={item.confidence > 0 && item.matchedTransactionId === item.originalMatchedTransactionId}
                />
              </div>
            )}
            {isMatched && item.jootTransaction && (
              <div className="mt-1 ml-[calc(5rem+0.75rem)] border-l-2 border-amber-300 border-dashed pl-3">
                <MatchedJootCell joot={item.jootTransaction} confidence={item.confidence} />
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
})
