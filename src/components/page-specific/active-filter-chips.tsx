"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateRangeChip } from "@/lib/utils/date-filters"
import type { DateRange } from "react-day-picker"

interface ActiveFilterChipsProps {
  dateRange?: DateRange
  transactionType: "all" | "expense" | "income"
  searchKeyword?: string
  vendorIds?: string[]
  paymentMethodIds?: string[]
  vendors?: Array<{ id: string; name: string }>
  paymentMethods?: Array<{ id: string; name: string }>
  onDateRangeClick?: () => void
  onRemoveDateRange: () => void
  onRemoveTransactionType: () => void
  onRemoveSearchKeyword?: () => void
  onRemoveVendor?: (vendorId: string) => void
  onRemovePaymentMethod?: (paymentMethodId: string) => void
  onRemoveAllVendors?: () => void
  onRemoveAllPaymentMethods?: () => void
  onClearAll: () => void
  resultCount: number
}

export function ActiveFilterChips({
  dateRange,
  transactionType,
  searchKeyword,
  vendorIds = [],
  paymentMethodIds = [],
  vendors = [],
  paymentMethods = [],
  onDateRangeClick,
  onRemoveDateRange,
  onRemoveTransactionType,
  onRemoveSearchKeyword,
  onRemoveVendor,
  onRemovePaymentMethod,
  onRemoveAllVendors,
  onRemoveAllPaymentMethods,
  onClearAll,
  resultCount,
}: ActiveFilterChipsProps) {
  const hasFilters =
    dateRange ||
    transactionType !== 'all' ||
    searchKeyword ||
    vendorIds.length > 0 ||
    paymentMethodIds.length > 0

  if (!hasFilters) return null

  return (
    <div className="w-full bg-blue-50/50 border border-blue-100 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-zinc-600 mr-1">Active:</span>

          {/* Date Range Chip */}
          {dateRange && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 pr-1 flex items-center gap-0"
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
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
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
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              {transactionType === 'expense' ? 'Expenses only' : 'Income only'}
              <button
                onClick={onRemoveTransactionType}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
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
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              Search: {searchKeyword}
              <button
                onClick={onRemoveSearchKeyword}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
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
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              Vendor: {vendors.find(v => v.id === vendorIds[0])?.name || 'Unknown'}
              <button
                onClick={() => onRemoveVendor?.(vendorIds[0])}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove vendor filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {vendorIds.length > 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              {vendorIds.length} vendors
              <button
                onClick={onRemoveAllVendors}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
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
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              Payment: {paymentMethods.find(pm => pm.id === paymentMethodIds[0])?.name || 'Unknown'}
              <button
                onClick={() => onRemovePaymentMethod?.(paymentMethodIds[0])}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove payment method filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {paymentMethodIds.length > 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              {paymentMethodIds.length} payment methods
              <button
                onClick={onRemoveAllPaymentMethods}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove all payment method filters"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">
            {resultCount} {resultCount === 1 ? 'transaction' : 'transactions'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-zinc-600 hover:text-zinc-900 h-7 text-xs"
          >
            Clear all
          </Button>
        </div>
      </div>
    </div>
  )
}
