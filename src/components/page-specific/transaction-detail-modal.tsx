'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useTransactions } from '@/hooks/use-transactions'
import type { StatementTransaction } from '@/components/page-specific/statement-transaction-list'
import { format, parseISO } from 'date-fns'
import { formatCurrency, cn } from '@/lib/utils'
import { cleanStatementDescription } from '@/lib/utils/statement-description'
import { getExchangeRateWithMetadata } from '@/lib/utils/exchange-rate-utils'
import { ExternalLink, FileText, ArrowRightLeft, CheckCircle2, Link2, X, Loader2, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface QueueState {
  current: number
  total: number
  reviewed: number
}

interface TransactionDetailModalProps {
  statementItem: StatementTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApproveLink?: (item: StatementTransaction) => Promise<void>
  onRejectMatch?: (item: StatementTransaction) => Promise<void>
  /** Queue mode props */
  queue?: QueueState
  onSkip?: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
}

export function TransactionDetailModal({
  statementItem,
  open,
  onOpenChange,
  onApproveLink,
  onRejectMatch,
  queue,
  onSkip,
  onNavigate,
}: TransactionDetailModalProps) {
  const { getTransactionById } = useTransactions()
  type Transaction = NonNullable<Awaited<ReturnType<typeof getTransactionById>>>
  const [transaction, setTransaction] = React.useState<Transaction | null>(null)
  const [exchangeRate, setExchangeRate] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<'approve' | 'reject' | null>(null)

  React.useEffect(() => {
    if (!open || !statementItem?.matchedTransactionId) {
      setTransaction(null)
      setExchangeRate(null)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const data = await getTransactionById(statementItem.matchedTransactionId!)
        if (data) {
          setTransaction(data)

          const fromCurrency = data.original_currency === 'USD' ? 'USD' : 'THB'
          const toCurrency = data.original_currency === 'USD' ? 'THB' : 'USD'
          const rateMetadata = await getExchangeRateWithMetadata(
            data.transaction_date,
            fromCurrency,
            toCurrency
          )
          if (rateMetadata.rate !== null) {
            if (data.original_currency === 'USD') {
              setExchangeRate(`1 USD = ${formatCurrency(rateMetadata.rate, 'THB').replace('฿', '')} THB`)
            } else {
              const usdToThb = 1 / rateMetadata.rate
              setExchangeRate(`1 USD = ${formatCurrency(usdToThb, 'THB').replace('฿', '')} THB`)
            }
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, statementItem?.matchedTransactionId, statementItem?.index, getTransactionById])

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy')
    } catch {
      return dateString
    }
  }

  if (!statementItem) return null

  const confidenceColor = statementItem.confidence >= 90
    ? 'text-green-700 bg-green-50 border-green-200'
    : statementItem.confidence >= 55
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-red-700 bg-red-50 border-red-200'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            {queue ? 'Review Matches' : statementItem.matchStatus === 'linked' ? 'Linked Transaction' : 'Match Comparison'}
          </DialogTitle>
          {queue && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{queue.current + 1} of {queue.total}</span>
                <span>{queue.reviewed} reviewed</span>
              </div>
              <Progress value={queue.total > 0 ? (queue.reviewed / queue.total) * 100 : 0} className="h-1.5" />
            </div>
          )}
        </DialogHeader>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Left: Statement transaction */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Statement</h3>
            </div>
            <ComparisonField label="Date" value={formatDate(statementItem.date)} />
            <ComparisonField
              label="Description"
              value={cleanStatementDescription(statementItem.description)}
            />
            <ComparisonField
              label="Amount"
              value={formatCurrency(statementItem.amount, statementItem.currency)}
              secondaryValue={statementItem.currency}
            />
          </div>

          {/* Right: Joot transaction */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Joot Transaction</h3>
            </div>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : transaction ? (
              <>
                <ComparisonField label="Date" value={formatDate(transaction.transaction_date)} />
                <ComparisonField
                  label="Description"
                  value={transaction.description || 'No description'}
                />
                <ComparisonField
                  label="Amount"
                  value={formatCurrency(transaction.amount, transaction.original_currency)}
                  secondaryValue={transaction.original_currency}
                />
                <ComparisonField label="Vendor" value={transaction.vendor?.name || 'Unknown'} />
                <ComparisonField label="Payment Method" value={transaction.payment_method?.name || 'Unknown'} />
                {exchangeRate && (
                  <ComparisonField label="Exchange Rate" value={exchangeRate} />
                )}
                {transaction.tags && transaction.tags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {transaction.tags.map((tag: { id: string; name: string; color: string }) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-[11px]"
                          style={{ backgroundColor: tag.color, color: '#18181b' }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Transaction not found.
              </p>
            )}
          </div>
        </div>

        {/* Match reasoning */}
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Match Details</h3>
            <Badge variant="outline" className={cn('text-xs', confidenceColor)}>
              {statementItem.confidence}% confidence
            </Badge>
          </div>

          {statementItem.reasons.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-zinc-600">Why this was matched:</p>
              <ul className="space-y-1">
                {statementItem.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                    <span className="text-green-500 mt-0.5 shrink-0">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        {transaction && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Primary actions row */}
            <div className="flex items-center justify-between">
              {/* Left: approve/reject for pending matches */}
              <div className="flex gap-2">
                {statementItem.matchStatus === 'matched' && onApproveLink && (
                  <Button
                    size="sm"
                    disabled={actionLoading !== null}
                    onClick={async () => {
                      setActionLoading('approve')
                      try {
                        await onApproveLink(statementItem)
                        if (!queue) onOpenChange(false)
                      } finally {
                        setActionLoading(null)
                      }
                    }}
                  >
                    {actionLoading === 'approve' ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Approve Link
                  </Button>
                )}
                {statementItem.matchStatus === 'matched' && onRejectMatch && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading !== null}
                    onClick={async () => {
                      setActionLoading('reject')
                      try {
                        await onRejectMatch(statementItem)
                        if (!queue) onOpenChange(false)
                      } finally {
                        setActionLoading(null)
                      }
                    }}
                  >
                    {actionLoading === 'reject' ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Reject
                  </Button>
                )}
                {queue && onSkip && statementItem.matchStatus === 'matched' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={actionLoading !== null}
                    onClick={onSkip}
                  >
                    <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                    Skip
                  </Button>
                )}
              </div>

              {/* Right: view full transaction / navigation */}
              <div className="flex items-center gap-2">
                {queue && onNavigate && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={queue.current === 0 || actionLoading !== null}
                      onClick={() => onNavigate('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={queue.current >= queue.total - 1 || actionLoading !== null}
                      onClick={() => onNavigate('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {!queue && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/transactions/${transaction.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      View full transaction
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Queue done state */}
            {queue && queue.reviewed >= queue.total && (
              <div className="text-center py-2">
                <p className="text-sm font-medium text-green-700">All matches reviewed!</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ComparisonField({
  label,
  value,
  secondaryValue,
}: {
  label: string
  value: string
  secondaryValue?: string
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-zinc-900">{value}</p>
      {secondaryValue && (
        <p className="text-xs text-zinc-500">{secondaryValue}</p>
      )}
    </div>
  )
}
