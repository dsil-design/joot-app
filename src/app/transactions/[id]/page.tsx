/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000108-2289
 * Node: 40000108:2289 - MASTER - View transaction
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Edit, Eye, FileText, Copy, Check, Unlink, Trash2, Plus } from "lucide-react"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithVendorAndPayment, EmailSourceData, StatementSourceData } from "@/lib/supabase/types"
import { format, parseISO } from "date-fns"
import { MainLayout } from "@/components/layouts/MainLayout"
import { formatInTimeZone } from "date-fns-tz"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getExchangeRateWithMetadata } from "@/lib/utils/exchange-rate-utils"
import { formatCurrency } from "@/lib/utils"
import { EmailSourceCard } from "@/components/page-specific/email-source-card"
import { PaymentSlipSourceCard } from "@/components/page-specific/payment-slip-source-card"
import { StatementViewerModal } from "@/components/page-specific/statement-viewer-modal"
import { DeleteConfirmationDialog } from "@/components/page-specific/delete-confirmation-dialog"
import { AttachSourceDialog, type SourceSearchResult, type AttachSourceType } from "@/components/page-specific/attach-source-dialog"
import { toast } from "sonner"


function EditIcon() {
  return (
    <div className="relative size-full flex items-center justify-center">
      <Edit className="w-full h-full text-foreground" strokeWidth={1.5} />
    </div>
  )
}

interface FieldValuePairProps {
  label: string
  value: string
  secondaryText?: string
  showAsterisk?: boolean
}

function FieldValuePair({ label, value, secondaryText, showAsterisk }: FieldValuePairProps) {
  return (
    <div className="content-stretch flex flex-col gap-1 items-start justify-start relative shrink-0">
      <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0">
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-foreground">
          <p className="leading-[20px] whitespace-pre">{label}{showAsterisk ? '*' : ''}</p>
        </div>
      </div>
      <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-foreground">
        <p className="leading-[20px] whitespace-pre">{value}</p>
      </div>
      {secondaryText && (
        <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#71717b] text-[14px] text-nowrap">
          <p className="leading-[20px] whitespace-pre">{secondaryText}</p>
        </div>
      )}
    </div>
  )
}

interface FieldTagsProps {
  label: string
  tags: Array<{ id: string; name: string; color: string }> | undefined
}

function FieldTags({ label, tags }: FieldTagsProps) {
  return (
    <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0">
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-foreground">
        <p className="leading-[20px] whitespace-pre">{label}</p>
      </div>
      {tags && tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              style={{
                backgroundColor: tag.color,
                color: '#18181b', // zinc-950 for readable text
              }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-muted-foreground">
          <p className="leading-[20px] whitespace-pre">No tags</p>
        </div>
      )}
    </div>
  )
}

function formatStatementPeriod(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) {
    const s = format(parseISO(start), "MMM d")
    const e = format(parseISO(end), "MMM d, yyyy")
    return `${s} – ${e}`
  }
  if (start) return `From ${format(parseISO(start), "MMM d, yyyy")}`
  if (end) return `Through ${format(parseISO(end), "MMM d, yyyy")}`
  return null
}


function StatementMatchBadge({ method }: { method: string | null }) {
  if (method === "auto") {
    return (
      <Badge className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-0 text-[12px] font-normal">
        Auto-matched
      </Badge>
    )
  }
  if (method === "manual") {
    return (
      <Badge className="bg-muted text-muted-foreground border-0 text-[12px] font-normal">
        Manually linked
      </Badge>
    )
  }
  return null
}

function StatementSourceCard({ source, onUnlink }: { source: StatementSourceData; onUnlink?: () => void }) {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const periodLabel = formatStatementPeriod(
    source.statement_period_start,
    source.statement_period_end
  )
  const sourceAmount = (source as any).source_amount as number | null
  const sourceCurrency = (source as any).source_currency as string | null

  return (
    <>
    <div className="bg-muted rounded-lg border border-border p-4 w-full">
      <div className="flex items-start gap-3">
        <FileText className="size-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[14px] font-normal text-foreground truncate">
            {source.filename}
          </p>
          {periodLabel && (
            <p className="text-[14px] font-normal text-muted-foreground">{periodLabel}</p>
          )}
          {source.payment_method_name && (
            <p className="text-[14px] font-normal text-muted-foreground">
              {source.payment_method_name}
            </p>
          )}
          {sourceAmount != null && sourceCurrency && (
            <p className="text-[14px] font-normal text-foreground">
              {formatCurrency(sourceAmount, sourceCurrency)} {sourceCurrency}
            </p>
          )}
          {source.match_confidence !== null && (
            <p className="text-[14px] font-normal text-muted-foreground">
              {source.match_confidence}% match confidence
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <StatementMatchBadge method={source.match_method} />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setViewerOpen(true)}
            >
              <Eye className="size-3.5 mr-1" />
              View statement
            </Button>
            {onUnlink && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={onUnlink}
              >
                <Unlink className="size-3.5 mr-1" />
                Unlink
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
    <StatementViewerModal
      open={viewerOpen}
      onOpenChange={setViewerOpen}
      statementId={(source as any).id}
      filename={source.filename}
    />
    </>
  )
}

function TransactionId({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5 pt-2">
      <span className="text-[12px] text-muted-foreground font-mono">{id}</span>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-muted-foreground transition-colors p-0.5"
        aria-label="Copy transaction ID"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

function TransactionSources({
  emailSources,
  paymentSlipSources,
  statementSource,
  onUnlinkEmail,
  onUnlinkPaymentSlip,
  onUnlinkStatement,
  onEmailReprocessed,
  onAttachClick,
}: {
  emailSources: any[]
  paymentSlipSources: any[]
  statementSource: StatementSourceData | null
  onUnlinkEmail?: (emailTransactionId: string) => void
  onUnlinkPaymentSlip?: (paymentSlipId: string) => void
  onUnlinkStatement?: () => void
  onEmailReprocessed?: () => void
  onAttachClick?: () => void
}) {
  const hasNoSources =
    emailSources.length === 0 && paymentSlipSources.length === 0 && !statementSource

  return (
    <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0 w-full">
      <div className="w-full border-t border-border mb-2" />
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-foreground">
        <p className="leading-[20px] whitespace-pre">Sources</p>
      </div>
      {hasNoSources ? (
        <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-muted-foreground">
          <p className="leading-[20px] whitespace-pre">Manually entered</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {emailSources.map((source) => (
            <EmailSourceCard
              key={`email-${source.email_transaction_id ?? source.id}`}
              source={source}
              onUnlink={
                onUnlinkEmail
                  ? () => onUnlinkEmail(source.email_transaction_id ?? source.id)
                  : undefined
              }
              onReprocessed={onEmailReprocessed}
            />
          ))}
          {paymentSlipSources.map((source) => (
            <PaymentSlipSourceCard
              key={`slip-${source.id}`}
              source={source}
              onUnlink={
                onUnlinkPaymentSlip ? () => onUnlinkPaymentSlip(source.id) : undefined
              }
            />
          ))}
          {statementSource && (
            <StatementSourceCard source={statementSource} onUnlink={onUnlinkStatement} />
          )}
        </div>
      )}
      {onAttachClick && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAttachClick}
          className="mt-1 h-8 gap-1.5 text-xs text-muted-foreground"
        >
          <Plus className="size-3.5" />
          Attach a source
        </Button>
      )}
    </div>
  )
}

export default function ViewTransactionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const source = searchParams?.get('from') as 'home' | 'transactions' | null
  const { navigateBack, navigateToEditTransaction, isPending } = useTransactionFlow()
  const { getTransactionById, deleteTransaction } = useTransactions()

  const [transaction, setTransaction] = React.useState<TransactionWithVendorAndPayment | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [attachOpen, setAttachOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [exchangeRate, setExchangeRate] = React.useState<number | null>(null)
  const [exchangeRateTimestamp, setExchangeRateTimestamp] = React.useState<string | null>(null)
  const [isUsingLatestRate, setIsUsingLatestRate] = React.useState(false)
  const [fallbackRateDate, setFallbackRateDate] = React.useState<string | null>(null)
  const [rateIsInterpolated, setRateIsInterpolated] = React.useState(false)
  const [rateInterpolatedFromDate, setRateInterpolatedFromDate] = React.useState<string | null>(null)
  const [rateSource, setRateSource] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return

      setLoading(true)
      setError(null)

      try {
        const data = await getTransactionById(id)
        if (data) {
          setTransaction(data)

          // Fetch the exchange rate from the exchange_rates table
          const fromCurrency = data.original_currency === "USD" ? "USD" : "THB"
          const toCurrency = data.original_currency === "USD" ? "THB" : "USD"
          const transactionDate = data.transaction_date

          const rateMetadata = await getExchangeRateWithMetadata(
            transactionDate,
            fromCurrency,
            toCurrency
          )

          if (rateMetadata.rate !== null) {
            setExchangeRate(rateMetadata.rate)
            setExchangeRateTimestamp(rateMetadata.timestamp)
            setIsUsingLatestRate(rateMetadata.isUsingLatestRate)
            setFallbackRateDate(rateMetadata.fallbackDate)
            setRateIsInterpolated(rateMetadata.isInterpolated)
            setRateInterpolatedFromDate(rateMetadata.interpolatedFromDate)
            setRateSource(rateMetadata.source)
          }
        } else {
          setError("Transaction not found")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transaction")
      } finally {
        setLoading(false)
      }
    }

    fetchTransaction()
  }, [id, getTransactionById])

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, "MMMM d, yyyy")
    } catch {
      return dateString
    }
  }

  const formatAmount = (transaction: TransactionWithVendorAndPayment) => {
    return `${formatCurrency(transaction.amount, transaction.original_currency)} ${transaction.original_currency}`
  }

  const formatExchangeRate = (transaction: TransactionWithVendorAndPayment, rate: number | null) => {
    if (rate === null) {
      return "No rate available"
    }

    // Always format as: 1 USD = [x] THB
    if (transaction.original_currency === "USD") {
      // Transaction is in USD, exchange_rate is already USD to THB
      const formattedRate = formatCurrency(rate, 'THB').replace('฿', '')
      return `1 USD = ${formattedRate} THB`
    } else {
      // Transaction is in THB, exchange_rate is THB to USD, so invert it
      const usdToThb = 1 / rate
      const formattedRate = formatCurrency(usdToThb, 'THB').replace('฿', '')
      return `1 USD = ${formattedRate} THB`
    }
  }

  const formatExchangeRateTimestamp = (
    timestamp: string | null,
    usingLatest: boolean,
    fallbackDate: string | null,
    isInterpolated: boolean = false,
    interpolatedFromDate: string | null = null,
    source: string | null = null,
  ): string | undefined => {
    if (!timestamp) return undefined

    try {
      if (usingLatest) {
        // For today/future dates when using latest rate
        return "*rate not available, using latest instead"
      }

      if (fallbackDate) {
        // For past dates when using a fallback rate (e.g., weekend or missing data)
        const date = parseISO(fallbackDate)
        const formattedDate = format(date, "MMM d")
        return `*using rate for ${formattedDate} instead`
      }

      // Rate matched the exact transaction date
      if (isInterpolated && interpolatedFromDate) {
        // Weekend/holiday rate interpolated from a business day
        const fromDate = parseISO(interpolatedFromDate)
        const formattedDate = format(fromDate, "MMM d, yyyy")
        return `ECB rate from ${formattedDate}`
      }

      // Direct ECB rate for this date
      const sourceLabel = source === "ECB" ? "ECB rate" : "Rate"
      return `${sourceLabel} for this date`
    } catch {
      return undefined
    }
  }

  const handleBackClick = () => {
    navigateBack() // Use browser back to preserve scroll position, filters, etc.
  }

  const handleEditClick = () => {
    if (transaction) {
      navigateToEditTransaction(transaction.id, source || undefined)
    }
  }

  const handleUnlink = async (
    sourceType: 'email' | 'statement' | 'payment_slip',
    sourceId?: string,
  ) => {
    if (!transaction) return
    try {
      const body: Record<string, unknown> = {
        transactionId: transaction.id,
        sourceType,
      }
      if (sourceType === 'email' && sourceId) body.emailTransactionId = sourceId
      if (sourceType === 'payment_slip' && sourceId) body.paymentSlipId = sourceId

      const res = await fetch('/api/imports/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to unlink')
      }
      const label =
        sourceType === 'email'
          ? 'Email'
          : sourceType === 'payment_slip'
            ? 'Payment slip'
            : 'Statement'
      toast.success(`${label} source unlinked`)
      // Re-fetch transaction to update UI
      const updated = await getTransactionById(transaction.id)
      if (updated) setTransaction(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unlink source')
    }
  }

  const handleAttachSource = async (result: SourceSearchResult) => {
    if (!transaction) return
    const res = await fetch(`/api/transactions/${transaction.id}/attach-source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceType: result.type,
        sourceId: result.sourceId,
        suggestionIndex: result.suggestionIndex,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Failed to attach source')
    }
    toast.success('Source attached')
    const updated = await getTransactionById(transaction.id)
    if (updated) setTransaction(updated)
  }

  const disabledAttachTypes = React.useMemo<AttachSourceType[]>(() => {
    if (!transaction) return []
    const t = transaction as any
    const disabled: AttachSourceType[] = []
    // Email and payment slip sources are many-to-one — multiple can attach to
    // the same transaction (e.g. multi-item Lazada orders). Only statement
    // sources remain 1:1 because the viewer needs a specific row tuple.
    if (t.statementSource) disabled.push('statement')
    return disabled
  }, [transaction])

  const handleDelete = async () => {
    if (!transaction) return
    setIsDeleting(true)
    try {
      const success = await deleteTransaction(transaction.id)
      if (success) {
        toast.success('Transaction deleted')
        navigateBack()
      } else {
        toast.error('Failed to delete transaction')
      }
    } catch {
      toast.error('Failed to delete transaction')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <MainLayout showSidebar={true} showMobileNav={false}>
        <div className="bg-background box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <Button
              onClick={handleBackClick}
              disabled={isPending}
              variant="outline"
              size="icon"
              className="bg-card size-10 rounded-lg border-border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-muted"
            >
              <ArrowLeft className="size-5 text-foreground" strokeWidth={1.5} />
            </Button>
          </div>
          <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-foreground">
            <p className="leading-[36px] whitespace-pre">View transaction</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-border border-t-zinc-950 rounded-full animate-spin"></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error || !transaction) {
    return (
      <MainLayout showSidebar={true} showMobileNav={false}>
        <div className="bg-background box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <Button
              onClick={handleBackClick}
              disabled={isPending}
              variant="outline"
              size="icon"
              className="bg-card size-10 rounded-lg border-border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-muted"
            >
              <ArrowLeft className="size-5 text-foreground" strokeWidth={1.5} />
            </Button>
          </div>
          <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-foreground">
            <p className="leading-[36px] whitespace-pre">View transaction</p>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">{error || "Transaction not found"}</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <Button
            onClick={handleBackClick}
            disabled={isPending}
            variant="outline"
            size="icon"
            className="bg-card size-10 rounded-lg border-border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-muted"
          >
            <ArrowLeft className="size-5 text-foreground" strokeWidth={1.5} />
          </Button>
          <Button
            onClick={handleEditClick}
            disabled={isPending}
            variant="secondary"
            size="sm"
            className="bg-muted hover:bg-accent text-foreground gap-1.5 items-center"
          >
            <div className="relative shrink-0 size-4 flex items-center justify-center">
              <EditIcon />
            </div>
            Edit
          </Button>
        </div>
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-foreground">
          <p className="leading-[36px] whitespace-pre">View transaction</p>
        </div>
        <div className="content-stretch flex flex-col gap-8 items-start justify-start relative shrink-0 w-full">
          <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full">
            <FieldValuePair
              label="Type"
              value={transaction.transaction_type === "expense" ? "Expense" : "Income"}
            />
            <FieldValuePair
              label="Date"
              value={formatDate(transaction.transaction_date)}
            />
            <FieldValuePair
              label="Description"
              value={transaction.description || "No description"}
            />
            <FieldValuePair
              label="Vendor"
              value={transaction.vendor?.name || "Unknown"}
            />
            <FieldValuePair
              label="Payment method"
              value={transaction.payment_method?.name || "Unknown"}
            />
            <div className="content-stretch flex gap-6 items-start justify-start relative shrink-0 w-full">
              <div className="flex-1">
                <FieldValuePair
                  label="Amount"
                  value={formatAmount(transaction)}
                />
              </div>
              <div className="flex-1">
                <FieldValuePair
                  label="Exchange rate"
                  value={formatExchangeRate(transaction, exchangeRate)}
                  secondaryText={formatExchangeRateTimestamp(exchangeRateTimestamp, isUsingLatestRate, fallbackRateDate, rateIsInterpolated, rateInterpolatedFromDate, rateSource)}
                  showAsterisk={isUsingLatestRate || !!fallbackRateDate}
                />
              </div>
            </div>
            <FieldTags
              label="Tags"
              tags={transaction.tags}
            />
            <TransactionSources
              emailSources={(transaction as any).emailSources ?? []}
              paymentSlipSources={(transaction as any).paymentSlipSources ?? []}
              statementSource={transaction.statementSource ?? null}
              onUnlinkEmail={(id) => handleUnlink('email', id)}
              onUnlinkPaymentSlip={(id) => handleUnlink('payment_slip', id)}
              onUnlinkStatement={() => handleUnlink('statement')}
              onEmailReprocessed={async () => {
                if (!transaction) return
                const updated = await getTransactionById(transaction.id)
                if (updated) setTransaction(updated)
              }}
              onAttachClick={() => setAttachOpen(true)}
            />
            <AttachSourceDialog
              open={attachOpen}
              onOpenChange={setAttachOpen}
              onAttach={handleAttachSource}
              disabledTypes={disabledAttachTypes}
            />
          </div>
          <div className="flex items-center justify-between w-full">
            <TransactionId id={transaction.id} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
          <DeleteConfirmationDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            onConfirm={handleDelete}
            isDeleting={isDeleting}
          />
          <div className="h-10 shrink-0 w-full" />
        </div>
    </div>
  )
}