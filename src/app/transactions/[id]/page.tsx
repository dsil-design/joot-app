/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000108-2289
 * Node: 40000108:2289 - MASTER - View transaction
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Edit, FileText, Copy, Check, Unlink } from "lucide-react"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithVendorAndPayment, EmailSourceData, StatementSourceData } from "@/lib/supabase/types"
import { format, parseISO } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getExchangeRateWithMetadata } from "@/lib/utils/exchange-rate-utils"
import { formatCurrency } from "@/lib/utils"
import { EmailSourceCard } from "@/components/page-specific/email-source-card"
import { toast } from "sonner"


function EditIcon() {
  return (
    <div className="relative size-full flex items-center justify-center">
      <Edit className="w-full h-full text-zinc-800" strokeWidth={1.5} />
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
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
          <p className="leading-[20px] whitespace-pre">{label}{showAsterisk ? '*' : ''}</p>
        </div>
      </div>
      <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
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
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
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
        <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-500">
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
      <Badge className="bg-green-100 text-green-700 border-0 text-[12px] font-normal">
        Auto-matched
      </Badge>
    )
  }
  if (method === "manual") {
    return (
      <Badge className="bg-gray-100 text-gray-500 border-0 text-[12px] font-normal">
        Manually linked
      </Badge>
    )
  }
  return null
}

function StatementSourceCard({ source, onUnlink }: { source: StatementSourceData; onUnlink?: () => void }) {
  const periodLabel = formatStatementPeriod(
    source.statement_period_start,
    source.statement_period_end
  )

  return (
    <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 w-full">
      <div className="flex items-start gap-3">
        <FileText className="size-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[14px] font-normal text-zinc-950 truncate">
            {source.filename}
          </p>
          {periodLabel && (
            <p className="text-[14px] font-normal text-zinc-500">{periodLabel}</p>
          )}
          {source.payment_method_name && (
            <p className="text-[14px] font-normal text-zinc-500">
              {source.payment_method_name}
            </p>
          )}
          {source.match_confidence !== null && (
            <p className="text-[14px] font-normal text-zinc-500">
              {source.match_confidence}% match confidence
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <StatementMatchBadge method={source.match_method} />
            {onUnlink && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-zinc-500 hover:text-destructive"
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
      <span className="text-[12px] text-zinc-400 font-mono">{id}</span>
      <button
        onClick={handleCopy}
        className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5"
        aria-label="Copy transaction ID"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

function TransactionSources({ emailSource, statementSource, onUnlinkEmail, onUnlinkStatement }: { emailSource: EmailSourceData | null; statementSource: StatementSourceData | null; onUnlinkEmail?: () => void; onUnlinkStatement?: () => void }) {
  const hasNoSources = !emailSource && !statementSource

  return (
    <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0 w-full">
      <div className="w-full border-t border-zinc-200 mb-2" />
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
        <p className="leading-[20px] whitespace-pre">Sources</p>
      </div>
      {hasNoSources ? (
        <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-500">
          <p className="leading-[20px] whitespace-pre">Manually entered</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {emailSource && <EmailSourceCard source={emailSource} onUnlink={onUnlinkEmail} />}
          {statementSource && <StatementSourceCard source={statementSource} onUnlink={onUnlinkStatement} />}
        </div>
      )}
    </div>
  )
}

export default function ViewTransactionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const source = searchParams?.get('from') as 'home' | 'transactions' | null
  const { navigateBack, isPending } = useTransactionFlow()
  const { getTransactionById } = useTransactions()
  
  const [transaction, setTransaction] = React.useState<TransactionWithVendorAndPayment | null>(null)
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
      const url = `/transactions/${transaction.id}/edit${source ? `?from=${source}` : ''}`
      window.location.href = url // Use direct navigation to preserve source
    }
  }

  const handleUnlink = async (sourceType: 'email' | 'statement') => {
    if (!transaction) return
    try {
      const res = await fetch('/api/imports/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: transaction.id, sourceType }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to unlink')
      }
      toast.success(`${sourceType === 'email' ? 'Email' : 'Statement'} source unlinked`)
      // Re-fetch transaction to update UI
      const updated = await getTransactionById(transaction.id)
      if (updated) setTransaction(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unlink source')
    }
  }

  if (loading) {
    return (
      <MainLayout showSidebar={true} showMobileNav={false}>
        <div className="bg-white box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <Button
              onClick={handleBackClick}
              disabled={isPending}
              variant="outline"
              size="icon"
              className="bg-white size-10 rounded-lg border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50"
            >
              <ArrowLeft className="size-5 text-zinc-800" strokeWidth={1.5} />
            </Button>
          </div>
          <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
            <p className="leading-[36px] whitespace-pre">View transaction</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error || !transaction) {
    return (
      <MainLayout showSidebar={true} showMobileNav={false}>
        <div className="bg-white box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <Button
              onClick={handleBackClick}
              disabled={isPending}
              variant="outline"
              size="icon"
              className="bg-white size-10 rounded-lg border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50"
            >
              <ArrowLeft className="size-5 text-zinc-800" strokeWidth={1.5} />
            </Button>
          </div>
          <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
            <p className="leading-[36px] whitespace-pre">View transaction</p>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-zinc-500">{error || "Transaction not found"}</p>
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
            className="bg-white size-10 rounded-lg border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50"
          >
            <ArrowLeft className="size-5 text-zinc-800" strokeWidth={1.5} />
          </Button>
          <Button
            onClick={handleEditClick}
            disabled={isPending}
            variant="secondary"
            size="sm"
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 gap-1.5 items-center"
          >
            <div className="relative shrink-0 size-4 flex items-center justify-center">
              <EditIcon />
            </div>
            Edit
          </Button>
        </div>
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
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
              emailSource={transaction.emailSource ?? null}
              statementSource={transaction.statementSource ?? null}
              onUnlinkEmail={() => handleUnlink('email')}
              onUnlinkStatement={() => handleUnlink('statement')}
            />
          </div>
          <TransactionId id={transaction.id} />
          <div className="h-10 shrink-0 w-full" />
        </div>
    </div>
  )
}