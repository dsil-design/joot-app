"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithVendor } from "@/lib/supabase/types"
import { format, isToday, isYesterday, parseISO } from "date-fns"

interface TransactionCardProps {
  transaction: TransactionWithVendor
}

function TransactionCard({ transaction }: TransactionCardProps) {
  // Format amount based on original currency
  const formatAmount = (transaction: TransactionWithVendor) => {
    const amount = transaction.original_currency === 'USD' 
      ? transaction.amount_usd 
      : transaction.amount_thb
    const symbol = transaction.original_currency === 'USD' ? '$' : '฿'
    return `${symbol}${amount.toFixed(2)}`
  }

  const vendorName = transaction.vendors?.name || 'Unknown Vendor'
  const paymentMethod = transaction.payment_method || 'Unknown Payment'
  
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] inline-block">
      <div className="p-6 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          {/* Amount - text-xl/medium, black */}
          <div className="text-xl font-medium text-black leading-7">
            {formatAmount(transaction)}
          </div>
          {/* Payment Method - text-sm/normal, muted-foreground */}
          <div className="text-sm font-normal text-muted-foreground leading-5">
            {paymentMethod}
          </div>
          {/* Vendor - text-sm/medium, foreground */}
          <div className="text-sm font-medium text-foreground leading-5">
            {vendorName}
          </div>
        </div>
      </div>
    </div>
  )
}

interface TransactionGroupProps {
  date: string
  transactions: TransactionWithVendor[]
}

function TransactionGroup({ date, transactions }: TransactionGroupProps) {
  const formatDateHeader = (dateString: string) => {
    const date = parseISO(dateString)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <h2 className="text-xl font-medium text-black">
        {formatDateHeader(date)}
      </h2>
      <div className="flex flex-col gap-4 items-start w-full">
        {transactions.map((transaction) => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  )
}

export default function AllTransactionsPage() {
  const { navigateToHome, isPending } = useTransactionFlow()
  const { transactions, loading, error } = useTransactions()

  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    const groups: Record<string, TransactionWithVendor[]> = {}
    
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

  if (loading) {
    return (
      <div className="bg-white min-h-screen w-full flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10">
        {/* Go home button */}
        <Button
          variant="outline"
          onClick={navigateToHome}
          disabled={isPending || loading}
          className="bg-white border border-zinc-200 rounded-lg shadow-sm h-9 gap-1.5 px-4 py-2 flex items-center justify-center disabled:opacity-50"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium text-zinc-900">
            {isPending ? "Loading..." : "Go home"}
          </span>
        </Button>

        {/* Page title */}
        <h1 className="text-3xl font-medium text-zinc-950">
          All transactions
        </h1>

        {/* Loading state */}
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white min-h-screen w-full flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10">
        {/* Go home button */}
        <Button
          variant="outline"
          onClick={navigateToHome}
          disabled={isPending}
          className="bg-white border border-zinc-200 rounded-lg shadow-sm h-9 gap-1.5 px-4 py-2 flex items-center justify-center disabled:opacity-50"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium text-zinc-900">
            {isPending ? "Loading..." : "Go home"}
          </span>
        </Button>

        {/* Page title */}
        <h1 className="text-3xl font-medium text-zinc-950">
          All transactions
        </h1>

        {/* Error state */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-zinc-500 mb-4">
            Failed to load transactions: {error}
          </p>
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white min-h-screen w-full flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10">
        {/* Go home button */}
        <Button
          variant="outline"
          onClick={navigateToHome}
          disabled={isPending}
          className="bg-white border border-zinc-200 rounded-lg shadow-sm h-9 gap-1.5 px-4 py-2 flex items-center justify-center disabled:opacity-50"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium text-zinc-900">
            {isPending ? "Loading..." : "Go home"}
          </span>
        </Button>

        {/* Page title */}
        <h1 className="text-3xl font-medium text-zinc-950">
          All transactions
        </h1>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-zinc-500 mb-4">
            No transactions found. Start by adding your first transaction!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen w-full flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10">
      {/* Go home button */}
      <Button
        variant="outline"
        onClick={navigateToHome}
        disabled={isPending}
        className="bg-white border border-zinc-200 rounded-lg shadow-sm h-9 gap-1.5 px-4 py-2 flex items-center justify-center disabled:opacity-50"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium text-zinc-900">
          {isPending ? "Loading..." : "Go home"}
        </span>
      </Button>

      {/* Page title */}
      <h1 className="text-3xl font-medium text-zinc-950">
        All transactions
      </h1>

      {/* Transaction groups */}
      {groupedTransactions.map(({ date, transactions: dayTransactions }) => (
        <TransactionGroup 
          key={date} 
          date={date} 
          transactions={dayTransactions} 
        />
      ))}
    </div>
  )
}