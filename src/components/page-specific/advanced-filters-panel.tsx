"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { DateRange } from "react-day-picker"

type TransactionType = "all" | "expense" | "income"

interface TransactionFilters {
  dateRange?: DateRange
  searchKeyword: string
  vendorIds: string[]
  paymentMethodIds: string[]
  transactionType: TransactionType
}

interface AdvancedFiltersPanelProps {
  isOpen: boolean
  onClose: () => void
  filters: TransactionFilters
  onApplyFilters: (filters: Partial<TransactionFilters>) => void
  vendors: Array<{ id: string; name: string }>
  paymentMethods: Array<{ id: string; name: string }>
}

export function AdvancedFiltersPanel({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  vendors,
  paymentMethods,
}: AdvancedFiltersPanelProps) {
  const [localFilters, setLocalFilters] = React.useState(filters)

  // Sync with external filters when they change
  React.useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleApply = () => {
    onApplyFilters(localFilters)
    onClose()
  }

  const handleReset = () => {
    setLocalFilters({
      ...localFilters,
      searchKeyword: "",
      vendorIds: [],
      paymentMethodIds: [],
      transactionType: "all",
    })
  }

  if (!isOpen) return null

  const vendorOptions = vendors.map(v => ({ value: v.id, label: v.name }))
  const paymentMethodOptions = paymentMethods.map(pm => ({ value: pm.id, label: pm.name }))

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - Desktop: Slide down, Mobile: Bottom sheet */}
      <div className="fixed inset-x-0 md:top-[120px] bottom-0 md:bottom-auto z-50 mx-auto max-w-6xl px-4 md:px-6 animate-in slide-in-from-bottom-4 md:slide-in-from-top-4 duration-200">
        <div className="bg-background rounded-t-2xl md:rounded-lg border border-border shadow-xl max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
          {/* Mobile Handle */}
          <div className="flex justify-center pt-3 pb-2 md:hidden">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border sticky top-0 bg-background z-10">
            <h3 className="text-base md:text-lg font-semibold text-foreground">
              Advanced Filters
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close advanced filters"
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

              {/* Transaction Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Transaction Type
                </label>
                <ToggleGroup
                  type="single"
                  value={localFilters.transactionType}
                  onValueChange={(value: TransactionType) => {
                    if (value) setLocalFilters({ ...localFilters, transactionType: value })
                  }}
                  variant="outline"
                  className="justify-start gap-0"
                >
                  <ToggleGroupItem value="all" aria-label="All transactions" className="h-10 px-4">
                    All
                  </ToggleGroupItem>
                  <ToggleGroupItem value="expense" aria-label="Expense transactions" className="h-10 px-4">
                    Expense
                  </ToggleGroupItem>
                  <ToggleGroupItem value="income" aria-label="Income transactions" className="h-10 px-4">
                    Income
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Custom Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Custom Date Range
                </label>
                <DateRangePicker
                  dateRange={localFilters.dateRange}
                  onDateRangeChange={(range) =>
                    setLocalFilters({ ...localFilters, dateRange: range })
                  }
                  placeholder="Pick a date range..."
                />
              </div>

              {/* Search by Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Search Description
                </label>
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={localFilters.searchKeyword}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, searchKeyword: e.target.value })
                  }
                  className="bg-background"
                />
              </div>

              {/* Vendor Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Vendors
                </label>
                <MultiSelectComboBox
                  options={vendorOptions}
                  values={localFilters.vendorIds}
                  onValuesChange={(vendorIds) =>
                    setLocalFilters({ ...localFilters, vendorIds })
                  }
                  placeholder="Select vendors..."
                  searchPlaceholder="Search vendors..."
                  emptyMessage="No vendors found."
                  allowAdd={false}
                  className="bg-background"
                />
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Payment Methods
                </label>
                <MultiSelectComboBox
                  options={paymentMethodOptions}
                  values={localFilters.paymentMethodIds}
                  onValuesChange={(paymentMethodIds) =>
                    setLocalFilters({ ...localFilters, paymentMethodIds })
                  }
                  placeholder="Select payment methods..."
                  searchPlaceholder="Search payment methods..."
                  emptyMessage="No payment methods found."
                  allowAdd={false}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Spacer for mobile fixed button */}
            <div className="h-20 md:hidden" />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-t border-border bg-muted sticky bottom-0 md:static">
            <Button
              variant="outline"
              onClick={handleReset}
            >
              Reset
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="hidden md:flex"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
