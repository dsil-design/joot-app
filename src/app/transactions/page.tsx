/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000014-844 | Node: 40000014:844
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TransactionCard } from "@/components/ui/transaction-card"
import { AddTransactionFooter } from "@/components/page-specific/add-transaction-footer"
import { calculateTransactionDisplayAmounts, triggerExchangeRateSync } from "@/lib/utils/currency-converter"

type ViewMode = "recorded" | "all-usd" | "all-thb"

interface TransactionCardProps {
  transaction: TransactionWithVendorAndPayment
  viewMode: ViewMode
}

function TransactionCardComponent({ transaction, viewMode }: TransactionCardProps) {
  const [amounts, setAmounts] = React.useState<{
    primary: string
    secondary: string | null
  }>({
    primary: '',
    secondary: null
  })
  const [isLoadingRates, setIsLoadingRates] = React.useState(false)

  // Calculate display amounts based on view mode
  React.useEffect(() => {
    const calculateAmounts = async () => {
      if (viewMode === "all-usd") {
        // Show only USD amounts
        setAmounts({
          primary: `$${transaction.amount_usd.toFixed(2)}`,
          secondary: null
        })
      } else if (viewMode === "all-thb") {
        // Show only THB amounts
        setAmounts({
          primary: `฿${transaction.amount_thb.toFixed(2)}`,
          secondary: null
        })
      } else {
        // "recorded" - show recorded amount as primary, calculate secondary
        setIsLoadingRates(true)
        try {
          const calculatedAmounts = await calculateTransactionDisplayAmounts(transaction)
          
          setAmounts({
            primary: calculatedAmounts.primary,
            secondary: calculatedAmounts.secondary
          })
          
          // If sync is needed and secondary is null, trigger sync
          if (calculatedAmounts.secondaryNeedsSync && !calculatedAmounts.secondary) {
            const syncSuccess = await triggerExchangeRateSync()
            if (syncSuccess) {
              // Retry calculation after sync
              setTimeout(async () => {
                const retryAmounts = await calculateTransactionDisplayAmounts(transaction)
                setAmounts({
                  primary: retryAmounts.primary,
                  secondary: retryAmounts.secondary
                })
              }, 2000) // Wait 2 seconds for sync to potentially complete
            }
          }
        } catch (error) {
          console.error('Error calculating display amounts:', error)
          // Fallback to stored amounts
          if (transaction.original_currency === "USD") {
            setAmounts({
              primary: `$${transaction.amount_usd.toFixed(2)}`,
              secondary: `฿${transaction.amount_thb.toFixed(2)}`
            })
          } else {
            setAmounts({
              primary: `฿${transaction.amount_thb.toFixed(2)}`,
              secondary: `$${transaction.amount_usd.toFixed(2)}`
            })
          }
        } finally {
          setIsLoadingRates(false)
        }
      }
    }

    calculateAmounts()
  }, [transaction, viewMode])
  
  return (
    <TransactionCard
      description={transaction.description || 'No description'}
      vendor={transaction.vendors?.name || 'Unknown Vendor'}
      amount={amounts.primary}
      calculatedAmount={amounts.secondary || undefined}
    />
  )
}

interface TransactionGroupProps {
  date: string
  transactions: TransactionWithVendorAndPayment[]
  viewMode: ViewMode
}

function TransactionGroup({ date, transactions, viewMode }: TransactionGroupProps) {
  const formatDateHeader = (dateString: string) => {
    const date = parseISO(dateString)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  return (
    <>
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-black text-[20px] text-nowrap">
        <p className="leading-[28px] whitespace-pre">{formatDateHeader(date)}</p>
      </div>
      <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0 w-full">
        {transactions.map((transaction) => (
          <TransactionCardComponent key={transaction.id} transaction={transaction} viewMode={viewMode} />
        ))}
      </div>
    </>
  )
}

function ArrowLeftIcon() {
  return (
    <div className="relative size-full">
      <ArrowLeft className="absolute inset-0 w-full h-full text-zinc-950" strokeWidth={1.5} />
    </div>
  )
}

interface ViewControllerProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

function ViewController({ viewMode, onViewModeChange }: ViewControllerProps) {
  const getDisplayText = (mode: ViewMode) => {
    switch (mode) {
      case "recorded":
        return "Recorded cost"
      case "all-usd":
        return "All USD"
      case "all-thb":
        return "All THB"
      default:
        return "Recorded cost"
    }
  }

  return (
    <div className="content-stretch flex flex-col items-start justify-start relative shrink-0 w-[161px]">
      <Select value={viewMode} onValueChange={(value: ViewMode) => onViewModeChange(value)}>
        <SelectTrigger className="bg-white box-border content-stretch flex h-10 items-center justify-between px-3 py-2 relative rounded-[6px] shrink-0 w-full border border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <SelectValue>
            <div className="font-normal text-[14px] text-zinc-950">
              <p className="leading-[20px]">{getDisplayText(viewMode)}</p>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white border border-zinc-200 rounded-[6px] shadow-[0px_4px_8px_0px_rgba(0,0,0,0.1)]">
          <SelectItem value="recorded" className="font-normal text-[14px] text-zinc-950">
            Recorded cost
          </SelectItem>
          <SelectItem value="all-usd" className="font-normal text-[14px] text-zinc-950">
            All USD
          </SelectItem>
          <SelectItem value="all-thb" className="font-normal text-[14px] text-zinc-950">
            All THB
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export default function AllTransactionsPage() {
  const { navigateToHome, isPending } = useTransactionFlow()
  const { transactions, loading, error } = useTransactions()
  const [viewMode, setViewMode] = React.useState<ViewMode>("recorded")

  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    const groups: Record<string, TransactionWithVendorAndPayment[]> = {}
    
    transactions.forEach((transaction) => {
      const date = transaction.transaction_date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(transaction)
    })

    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    
    return sortedDates.map(date => ({
      date,
      transactions: groups[date]
    }))
  }, [transactions])

  // Loading, error, and empty states remain simple without affecting design fidelity
  if (loading || error || transactions.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full max-w-md sm:max-w-lg mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-12 sm:pt-20 px-6 sm:px-8 lg:px-10">
          <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
            <div className="bg-white content-stretch flex gap-1.5 items-center justify-center relative rounded-lg shrink-0 size-10 border border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <div className="relative shrink-0 size-5">
                <ArrowLeftIcon />
              </div>
            </div>
            <ViewController viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
            <p className="leading-[36px] whitespace-pre">All transactions</p>
          </div>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500">Failed to load transactions: {error}</p>
            </div>
          )}
          {transactions.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500">No transactions found.</p>
            </div>
          )}
        </div>
        <AddTransactionFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-md sm:max-w-lg mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-12 sm:pt-20 px-6 sm:px-8 lg:px-10">
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <button
            onClick={navigateToHome}
            disabled={isPending}
            className="bg-white content-stretch flex gap-1.5 items-center justify-center relative rounded-lg shrink-0 size-10 border border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <div className="relative shrink-0 size-5">
              <ArrowLeftIcon />
            </div>
          </button>
          <ViewController viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
          <p className="leading-[36px] whitespace-pre">All transactions</p>
        </div>
        <div className="flex flex-col gap-6 w-full">
          {groupedTransactions.map(({ date, transactions: dayTransactions }) => (
            <React.Fragment key={date}>
              <TransactionGroup date={date} transactions={dayTransactions} viewMode={viewMode} />
            </React.Fragment>
          ))}
        </div>
      </div>
      <AddTransactionFooter />
    </div>
  )
}