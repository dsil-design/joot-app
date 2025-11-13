"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "./StatusBadge"
import { cn } from "@/lib/utils"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols"
import { format, isPast, isToday } from "date-fns"
import { MoreVertical, Link as LinkIcon, SkipForward, CheckCircle, Edit } from "lucide-react"
import type { ExpectedTransaction } from "@/lib/types/recurring-transactions"

export interface ExpectedTransactionCardProps {
  expectedTransaction: ExpectedTransaction
  onMatch?: (id: string) => void
  onSkip?: (id: string) => void
  onMarkPaid?: (id: string) => void
  onEdit?: (id: string) => void
  className?: string
}

/**
 * Card component for expected transactions
 * 6 visual states:
 * 1. Matched: Green border, checkmark, shows actual vs expected
 * 2. Variance: Yellow/orange, shows amount difference
 * 3. Pending: Gray, waiting to be matched
 * 4. Overdue: Red, pulsing animation, past expected date
 * 5. Skipped: Muted, crossed out, user marked as skip
 * 6. Fulfilled: Green, manual "mark as paid"
 */
export function ExpectedTransactionCard({
  expectedTransaction,
  onMatch,
  onSkip,
  onMarkPaid,
  onEdit,
  className,
}: ExpectedTransactionCardProps) {
  const {
    id,
    description,
    expected_amount,
    original_currency,
    expected_date,
    status,
    vendor,
    payment_method,
    actual_amount,
    variance_amount,
    variance_percentage,
    matched_transaction,
  } = expectedTransaction

  // Determine card state
  const isMatched = status === "matched"
  const isSkipped = status === "skipped"
  const hasVariance = isMatched && variance_amount !== null && variance_amount !== 0
  const isOverdue = status === "pending" && isPast(new Date(expected_date)) && !isToday(new Date(expected_date))
  const isFulfilled = isMatched && !matched_transaction // Manually marked as paid

  // Calculate display status
  let displayStatus: "matched" | "variance" | "pending" | "overdue" | "skipped" | "fulfilled" = status
  if (isOverdue) displayStatus = "overdue"
  if (hasVariance) displayStatus = "variance"
  if (isFulfilled) displayStatus = "fulfilled"

  // Border and background colors based on state
  const cardStyles = cn(
    "relative transition-all duration-200",
    // Matched - green border
    isMatched && !hasVariance && "border-green-200 bg-green-50/30 hover:bg-green-50/50",
    // Variance - amber border
    hasVariance && "border-amber-200 bg-amber-50/30 hover:bg-amber-50/50",
    // Pending - default
    status === "pending" && !isOverdue && "border-zinc-200 hover:shadow-md",
    // Overdue - red border with pulse
    isOverdue && "border-red-200 bg-red-50/30 animate-pulse hover:bg-red-50/50",
    // Skipped - muted
    isSkipped && "border-zinc-100 bg-zinc-50/50 opacity-60",
    // Fulfilled - green border
    isFulfilled && "border-green-200 bg-green-50/30 hover:bg-green-50/50",
    className
  )

  const currencySymbol = getCurrencySymbolSync(original_currency)

  return (
    <Card className={cardStyles}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header: Vendor/Description + Status */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    "font-medium text-sm text-zinc-900 truncate",
                    isSkipped && "line-through text-zinc-500"
                  )}
                >
                  {vendor?.name || description}
                </h3>
                {vendor && description !== vendor.name && (
                  <p className="text-xs text-zinc-500 truncate">{description}</p>
                )}
              </div>
              <StatusBadge status={displayStatus} size="sm" />
            </div>

            {/* Amount Information */}
            <div className="space-y-1 mb-2">
              {/* Expected Amount */}
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-zinc-500">Expected:</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {currencySymbol}
                  {expected_amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Actual Amount (if matched) */}
              {isMatched && actual_amount !== null && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-zinc-500">Actual:</span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      hasVariance ? "text-amber-700" : "text-green-700"
                    )}
                  >
                    {currencySymbol}
                    {actual_amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  {hasVariance && variance_amount && (
                    <span className="text-xs text-amber-600">
                      ({variance_amount > 0 ? "+" : ""}
                      {currencySymbol}
                      {Math.abs(variance_amount).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {variance_percentage !== null &&
                        ` / ${variance_percentage > 0 ? "+" : ""}${variance_percentage.toFixed(0)}%`}
                      )
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Footer: Date + Payment Method */}
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className={cn(isOverdue && "text-red-600 font-medium")}>
                {format(new Date(expected_date), "MMM d, yyyy")}
                {isToday(new Date(expected_date)) && " (Today)"}
              </span>
              {payment_method && (
                <>
                  <span>•</span>
                  <span>{payment_method.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="More actions"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isMatched && !isSkipped && onMatch && (
                <DropdownMenuItem onClick={() => onMatch(id)}>
                  <LinkIcon className="size-4 mr-2" />
                  Match Transaction
                </DropdownMenuItem>
              )}
              {!isMatched && !isSkipped && onMarkPaid && (
                <DropdownMenuItem onClick={() => onMarkPaid(id)}>
                  <CheckCircle className="size-4 mr-2" />
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {!isMatched && !isSkipped && onSkip && (
                <DropdownMenuItem onClick={() => onSkip(id)}>
                  <SkipForward className="size-4 mr-2" />
                  Skip This Month
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(id)}>
                  <Edit className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Matched Transaction Info */}
        {isMatched && matched_transaction && (
          <div className="mt-3 pt-3 border-t border-zinc-200">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <LinkIcon className="size-3" />
              <span>
                Matched to transaction on{" "}
                {format(new Date(matched_transaction.transaction_date), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
