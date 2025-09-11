/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000014-844 | Node: 40000014:844
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TransactionGroup } from "@/components/page-specific/transactions-list"
import { AddTransactionFooter } from "@/components/page-specific/add-transaction-footer"

type ViewMode = "recorded" | "all-usd" | "all-thb"



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
            <Button
              variant="outline"
              size="icon"
              className="bg-white size-10 rounded-lg border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50"
            >
              <ArrowLeft className="size-5 text-zinc-950" strokeWidth={1.5} />
            </Button>
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
          <Button
            onClick={navigateToHome}
            disabled={isPending}
            variant="outline"
            size="icon"
            className="bg-white size-10 rounded-lg border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50"
          >
            <ArrowLeft className="size-5 text-zinc-950" strokeWidth={1.5} />
          </Button>
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