"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateRangeChip } from "@/lib/utils/date-filters"
import type { DateRange } from "react-day-picker"

interface ActiveFilterChipsProps {
  dateRange?: DateRange
  transactionType: "all" | "expense" | "income" | "transfer"
  searchKeyword?: string
  vendorIds?: string[]
  paymentMethodIds?: string[]
  sourceType?: "any" | "email" | "statement" | "payment_slip" | "none"
  vendors?: Array<{ id: string; name: string }>
  paymentMethods?: Array<{ id: string; name: string }>
  amountMin?: number
  amountMax?: number
  amountCurrency?: string
  onDateRangeClick?: () => void
  onRemoveDateRange: () => void
  onRemoveTransactionType: () => void
  onRemoveSearchKeyword?: () => void
  onRemoveVendor?: (vendorId: string) => void
  onRemovePaymentMethod?: (paymentMethodId: string) => void
  onRemoveAllVendors?: () => void
  onRemoveAllPaymentMethods?: () => void
  onRemoveSourceType?: () => void
  onRemoveAmountRange?: () => void
  onClearAll: () => void
  resultCount: number
}

export function ActiveFilterChips({
  dateRange,
  transactionType,
  searchKeyword,
  vendorIds = [],
  paymentMethodIds = [],
  sourceType,
  vendors = [],
  paymentMethods = [],
  amountMin,
  amountMax,
  amountCurrency,
  onDateRangeClick,
  onRemoveDateRange,
  onRemoveTransactionType,
  onRemoveSearchKeyword,
  onRemoveVendor,
  onRemovePaymentMethod,
  onRemoveAllVendors,
  onRemoveAllPaymentMethods,
  onRemoveSourceType,
  onRemoveAmountRange,
  onClearAll,
  resultCount,
}: ActiveFilterChipsProps) {
  const hasAmountFilter = amountMin !== undefined || amountMax !== undefined || amountCurrency
  const hasFilters =
    dateRange ||
    transactionType !== 'all' ||
    searchKeyword ||
    vendorIds.length > 0 ||
    paymentMethodIds.length > 0 ||
    sourceType ||
    hasAmountFilter

  if (!hasFilters) return null

  return (
    <div className="w-full bg-blue-50/50 border border-blue-100 dark:border-blue-900 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">Active:</span>

          {/* Date Range Chip */}
          {dateRange && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 pr-1 flex items-center gap-0"
            >
              <button
                onClick={onDateRangeClick}
                className="hover:underline cursor-pointer"
                aria-label="Edit date range"
              >
                {formatDateRangeChip(dateRange)}
              </button>
              <button
                onClick={onRemoveDateRange}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove date filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Transaction Type Chip */}
          {transactionType !== 'all' && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 pr-1"
            >
              {transactionType === 'expense' ? 'Expenses only' : transactionType === 'income' ? 'Income only' : 'Transfers only'}
              <button
                onClick={onRemoveTransactionType}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Search Keyword Chip */}
          {searchKeyword && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 pr-1"
            >
              Search: {searchKeyword}
              <button
                onClick={onRemoveSearchKeyword}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Vendor Chips */}
          {vendorIds.length === 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 pr-1"
            >
              Vendor: {vendors.find(v => v.id === vendorIds[0])?.name || 'Unknown'}
              <button
                onClick={() => onRemoveVendor?.(vendorIds[0])}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove vendor filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {vendorIds.length > 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 pr-1"
            >
              {vendorIds.length} vendors
              <button
                onClick={onRemoveAllVendors}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove all vendor filters"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Payment Method Chips */}
          {paymentMethodIds.length === 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 pr-1"
            >
              Payment: {paymentMethods.find(pm => pm.id === paymentMethodIds[0])?.name || 'Unknown'}
              <button
                onClick={() => onRemovePaymentMethod?.(paymentMethodIds[0])}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove payment method filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {paymentMethodIds.length > 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 pr-1"
            >
              {paymentMethodIds.length} payment methods
              <button
                onClick={onRemoveAllPaymentMethods}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove all payment method filters"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Source Type Chip */}
          {sourceType && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 pr-1"
            >
              {sourceType === 'any' && 'Source: Any'}
              {sourceType === 'email' && 'Source: Email'}
              {sourceType === 'statement' && 'Source: Statement'}
              {sourceType === 'payment_slip' && 'Source: Slip'}
              {sourceType === 'none' && 'Unlinked'}
              <button
                onClick={onRemoveSourceType}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove source filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Amount Range Chip */}
          {hasAmountFilter && (
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 pr-1"
            >
              Amount: {amountMin !== undefined && amountMax !== undefined
                ? `${amountMin}–${amountMax}`
                : amountMin !== undefined
                  ? `≥ ${amountMin}`
                  : amountMax !== undefined
                    ? `≤ ${amountMax}`
                    : ''
              }{amountCurrency ? ` ${amountCurrency}` : ''}
              <button
                onClick={onRemoveAmountRange}
                className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                aria-label="Remove amount filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {resultCount} {resultCount === 1 ? 'transaction' : 'transactions'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground hover:text-foreground h-7 text-xs"
          >
            Clear all
          </Button>
        </div>
      </div>
    </div>
  )
}
