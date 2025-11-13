"use client"

import * as React from "react"
import { ExpectedTransactionCard } from "./ExpectedTransactionCard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols"
import { ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import type { ExpectedTransaction } from "@/lib/types/recurring-transactions"
import type { CurrencyType } from "@/lib/supabase/types"

export interface WeekGroupProps {
  weekLabel: string
  startDate: Date
  endDate: Date
  expectedTransactions: ExpectedTransaction[]
  onMatch?: (id: string) => void
  onSkip?: (id: string) => void
  onMarkPaid?: (id: string) => void
  onEdit?: (id: string) => void
  defaultExpanded?: boolean
  className?: string
}

/**
 * Collapsible week section component
 * Shows week range, total spent, and expected transaction cards
 */
export function WeekGroup({
  weekLabel,
  startDate,
  endDate,
  expectedTransactions,
  onMatch,
  onSkip,
  onMarkPaid,
  onEdit,
  defaultExpanded = true,
  className,
}: WeekGroupProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  // Calculate week statistics
  const stats = React.useMemo(() => {
    const matched = expectedTransactions.filter((et) => et.status === "matched").length
    const pending = expectedTransactions.filter((et) => et.status === "pending").length
    const overdue = expectedTransactions.filter(
      (et) =>
        et.status === "pending" &&
        new Date(et.expected_date) < new Date() &&
        !isToday(new Date(et.expected_date))
    ).length
    const skipped = expectedTransactions.filter((et) => et.status === "skipped").length

    // Calculate total expected by currency
    const totalExpectedByCurrency: Partial<Record<CurrencyType, number>> = {}
    const totalActualByCurrency: Partial<Record<CurrencyType, number>> = {}

    expectedTransactions.forEach((et) => {
      const currency = et.original_currency
      totalExpectedByCurrency[currency] =
        (totalExpectedByCurrency[currency] || 0) + et.expected_amount

      if (et.actual_amount !== null) {
        totalActualByCurrency[currency] =
          (totalActualByCurrency[currency] || 0) + et.actual_amount
      }
    })

    return {
      total: expectedTransactions.length,
      matched,
      pending,
      overdue,
      skipped,
      totalExpectedByCurrency,
      totalActualByCurrency,
    }
  }, [expectedTransactions])

  const primaryCurrency = Object.keys(stats.totalExpectedByCurrency)[0] as CurrencyType | undefined

  return (
    <div className={cn("border-b border-zinc-200 last:border-b-0", className)}>
      {/* Week Header */}
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-4 h-auto hover:bg-zinc-50"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="size-4 text-zinc-400 shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-zinc-400 shrink-0" />
          )}

          <div className="flex-1 text-left">
            <h3 className="font-medium text-sm text-zinc-900">{weekLabel}</h3>
            <p className="text-xs text-zinc-500">
              {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {/* Status counts */}
            <div className="flex items-center gap-2">
              {stats.matched > 0 && (
                <span className="text-green-600 font-medium">
                  {stats.matched} matched
                </span>
              )}
              {stats.pending > 0 && (
                <span className="text-zinc-500">{stats.pending} pending</span>
              )}
              {stats.overdue > 0 && (
                <span className="text-red-600 font-medium">
                  {stats.overdue} overdue
                </span>
              )}
              {stats.skipped > 0 && (
                <span className="text-zinc-400">{stats.skipped} skipped</span>
              )}
            </div>

            {/* Total spent */}
            {primaryCurrency && (
              <div className="text-right">
                <div className="font-semibold text-zinc-900">
                  {getCurrencySymbolSync(primaryCurrency)}
                  {(stats.totalExpectedByCurrency[primaryCurrency] || 0).toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }
                  )}
                </div>
                <div className="text-zinc-500">expected</div>
              </div>
            )}
          </div>
        </div>
      </Button>

      {/* Expected Transactions */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {expectedTransactions.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-500">
              No expected transactions this week
            </div>
          ) : (
            expectedTransactions.map((expectedTransaction) => (
              <ExpectedTransactionCard
                key={expectedTransaction.id}
                expectedTransaction={expectedTransaction}
                onMatch={onMatch}
                onSkip={onSkip}
                onMarkPaid={onMarkPaid}
                onEdit={onEdit}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}
