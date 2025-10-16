/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000108-2289
 * Node: 40000108:2289 - MASTER - View transaction
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Edit } from "lucide-react"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { format, parseISO } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getExchangeRateWithMetadata } from "@/lib/utils/exchange-rate-utils"


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

export default function ViewTransactionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const source = searchParams?.get('from') as 'home' | 'transactions' | null
  const { navigateBack, navigateToHome, navigateToTransactions, isPending } = useTransactionFlow()
  const { getTransactionById } = useTransactions()
  
  const [transaction, setTransaction] = React.useState<TransactionWithVendorAndPayment | null>(null)
  const [exchangeRate, setExchangeRate] = React.useState<number | null>(null)
  const [exchangeRateTimestamp, setExchangeRateTimestamp] = React.useState<string | null>(null)
  const [isUsingLatestRate, setIsUsingLatestRate] = React.useState(false)
  const [fallbackRateDate, setFallbackRateDate] = React.useState<string | null>(null)
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
    const symbol = transaction.original_currency === "USD" ? "$" : "฿"
    const amount = transaction.original_currency === "USD"
      ? transaction.amount_usd
      : transaction.amount_thb
    return `${symbol}${amount.toFixed(2)} ${transaction.original_currency}`
  }

  const formatExchangeRate = (transaction: TransactionWithVendorAndPayment, rate: number | null) => {
    if (rate === null) {
      return "No rate available"
    }

    // Always format as: 1 USD = [x] THB
    if (transaction.original_currency === "USD") {
      // Transaction is in USD, exchange_rate is already USD to THB
      return `1 USD = ${rate.toFixed(2)} THB`
    } else {
      // Transaction is in THB, exchange_rate is THB to USD, so invert it
      const usdToThb = 1 / rate
      return `1 USD = ${usdToThb.toFixed(2)} THB`
    }
  }

  const formatExchangeRateTimestamp = (
    timestamp: string | null,
    usingLatest: boolean,
    fallbackDate: string | null
  ): string | undefined => {
    if (!timestamp) return undefined

    try {
      if (usingLatest) {
        // For today/future dates when using latest rate
        return "*rate not available, using latest instead"
      }

      if (fallbackDate) {
        // For past dates when using a fallback rate (e.g., weekend or missing data)
        // Format: "*using rate for Oct 3 instead"
        const date = parseISO(fallbackDate)
        const formattedDate = format(date, "MMM d")
        return `*using rate for ${formattedDate} instead`
      }

      // Get the user's timezone from the browser
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      // Format: "as of 2:12pm, March 14, 2024"
      const time = formatInTimeZone(parseISO(timestamp), userTimezone, "h:mmaaa")
      const date = formatInTimeZone(parseISO(timestamp), userTimezone, "MMMM d, yyyy")

      return `as of ${time}, ${date}`
    } catch {
      return undefined
    }
  }

  const handleBackClick = () => {
    if (source === 'home') {
      navigateToHome()
    } else if (source === 'transactions') {
      navigateToTransactions()
    } else {
      navigateBack() // Fallback to browser back
    }
  }

  const handleEditClick = () => {
    if (transaction) {
      const url = `/transactions/${transaction.id}/edit${source ? `?from=${source}` : ''}`
      window.location.href = url // Use direct navigation to preserve source
    }
  }

  if (loading) {
    return (
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
    )
  }

  if (error || !transaction) {
    return (
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
    )
  }

  return (
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
            value={transaction.vendors?.name || "Unknown"} 
          />
          <FieldValuePair
            label="Payment method"
            value={transaction.payment_methods?.name || "Unknown"}
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
                secondaryText={formatExchangeRateTimestamp(exchangeRateTimestamp, isUsingLatestRate, fallbackRateDate)}
                showAsterisk={isUsingLatestRate || !!fallbackRateDate}
              />
            </div>
          </div>
          <FieldTags
            label="Tags"
            tags={transaction.tags}
          />
        </div>
        <div className="h-10 shrink-0 w-full" />
      </div>
    </div>
  )
}