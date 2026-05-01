'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInfiniteScroll, LoadMoreTrigger } from '@/hooks/use-infinite-scroll'
import { cleanStatementDescription } from '@/lib/utils/statement-description'
import { formatMatchAmount, formatMatchDate } from '@/lib/utils/match-formatting'
import { cn } from '@/lib/utils'
import { Link2, Plus, ArrowDownLeft, ArrowUpRight, ArrowRight, Check, EyeOff, Undo2, RefreshCw } from 'lucide-react'

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
  onReopenClick?: (item: StatementTransaction) => void
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
      isTransfer ? "text-muted-foreground" : isCredit ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
    )}>
      <Icon className="h-3 w-3" />
    </span>
  )
}

function LinkedJootCell({ joot, autoLinked }: { joot: JootTransactionSummary; autoLinked: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Check className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
      <span className="truncate text-xs text-muted-foreground">
        {joot.vendor_name || joot.description || 'Transaction'}
      </span>
      <span className="text-xs font-medium text-muted-foreground shrink-0">
        {formatMatchAmount(joot.amount, joot.original_currency)}
      </span>
      {autoLinked && (
        <Badge variant="outline" className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-[9px] px-1 py-0 shrink-0">
          Auto
        </Badge>
      )}
    </div>
  )
}

function MatchedJootCell({ joot, confidence }: { joot: JootTransactionSummary; confidence: number }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <ArrowRight className="h-3 w-3 text-amber-500 dark:text-amber-400 shrink-0" />
      <span className="truncate text-xs text-muted-foreground">
        {joot.vendor_name || joot.description || 'Transaction'}
      </span>
      <span className="text-xs font-medium text-muted-foreground shrink-0">
        {formatMatchAmount(joot.amount, joot.original_currency)}
      </span>
      <Badge variant="outline" className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] px-1 py-0 shrink-0">
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
  onReopenClick,
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
        // Rejected suggestions collapse to matchStatus='unmatched' in the API,
        // but we distinguish them here via the raw suggestionStatus so the user
        // can see which items were previously rejected and reopen them for rematch.
        const isRejected = item.suggestionStatus === 'rejected'
        const isActionable = !isRejected && (item.matchStatus === 'unmatched' || item.matchStatus === 'new')

        return (
          <div
            key={item.index}
            ref={isHighlighted ? highlightRef : undefined}
            className={cn(
              'rounded-lg px-3 py-2.5 text-sm transition-colors',
              isHighlighted && 'ring-1 ring-blue-200',
              isLinked && 'bg-green-50/50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40',
              isMatched && 'bg-amber-50/40 dark:bg-amber-950/30 hover:bg-amber-50/70 dark:hover:bg-amber-900/40 cursor-pointer',
              isIgnored && 'opacity-50 bg-muted',
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

              {/* Amount — bank accounts use type field for sign/color, credit cards use amount sign */}
              {(() => {
                const isCredit = isBankAccount
                  ? (item.type === 'credit' || item.type === 'transfer_in')
                  : item.amount < 0
                const prefix = isBankAccount
                  ? (isCredit ? '+' : '−')
                  : (item.amount < 0 ? '−' : '')
                return (
                  <span className={cn(
                    "text-sm font-medium flex-shrink-0",
                    isIgnored && "line-through text-muted-foreground",
                    !isIgnored && isCredit && "text-green-600 dark:text-green-400"
                  )}>
                    {prefix}{formatMatchAmount(item.amount, item.currency)}
                  </span>
                )
              })()}

              {/* Rejected badge + reopen */}
              {isRejected && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className="border-border text-muted-foreground text-[9px] px-1 py-0">
                    Rejected
                  </Badge>
                  {onReopenClick && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-6 sm:w-6 text-muted-foreground hover:text-muted-foreground"
                      title="Reopen for review"
                      onClick={e => {
                        e.stopPropagation()
                        onReopenClick(item)
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Ignored badge + undo */}
              {isIgnored && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className="border-border text-muted-foreground text-[9px] px-1 py-0">
                    Ignored
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-6 sm:w-6 text-muted-foreground hover:text-muted-foreground"
                    title="Restore"
                    onClick={e => {
                      e.stopPropagation()
                      onUnignoreClick?.(item)
                    }}
                  >
                    <Undo2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              )}

              {/* Actions for unmatched/new */}
              {isActionable && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-6 sm:w-6"
                    onClick={e => {
                      e.stopPropagation()
                      onLinkClick?.(item)
                    }}
                  >
                    <Link2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-6 sm:w-6"
                    onClick={e => {
                      e.stopPropagation()
                      onCreateClick?.(item)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-6 sm:w-6 text-muted-foreground hover:text-muted-foreground"
                    title="Ignore"
                    onClick={e => {
                      e.stopPropagation()
                      onIgnoreClick?.(item)
                    }}
                  >
                    <EyeOff className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Bottom row: linked/matched Joot transaction */}
            {isLinked && item.jootTransaction && (
              <div className="mt-1 ml-[calc(5rem+0.75rem)] border-l-2 border-green-300 dark:border-green-700 pl-3">
                <LinkedJootCell
                  joot={item.jootTransaction}
                  autoLinked={item.confidence > 0 && item.matchedTransactionId === item.originalMatchedTransactionId}
                />
              </div>
            )}
            {isMatched && item.jootTransaction && (
              <div className="mt-1 ml-[calc(5rem+0.75rem)] border-l-2 border-amber-300 dark:border-amber-700 border-dashed pl-3">
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
