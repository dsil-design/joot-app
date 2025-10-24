"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
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
      <div className="fixed inset-x-0 md:top-[200px] bottom-0 md:bottom-auto z-50 mx-auto max-w-5xl px-4 md:px-4 animate-in slide-in-from-bottom-4 md:slide-in-from-top-4 duration-200">
        <div className="bg-white rounded-t-2xl md:rounded-lg border border-zinc-200 shadow-xl max-h-[85vh] md:max-h-none overflow-y-auto">
          {/* Mobile Handle */}
          <div className="flex justify-center pt-3 pb-2 md:hidden">
            <div className="w-12 h-1 bg-zinc-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
            <h3 className="text-base md:text-lg font-semibold text-zinc-900">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Transaction Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Transaction Type
                </label>
                <RadioGroup
                  value={localFilters.transactionType}
                  onValueChange={(value: TransactionType) =>
                    setLocalFilters({ ...localFilters, transactionType: value })
                  }
                  className="flex flex-row gap-4 pt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="adv-type-all" />
                    <Label htmlFor="adv-type-all" className="text-sm font-normal cursor-pointer">
                      All
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="adv-type-expense" />
                    <Label htmlFor="adv-type-expense" className="text-sm font-normal cursor-pointer">
                      Expense
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="adv-type-income" />
                    <Label htmlFor="adv-type-income" className="text-sm font-normal cursor-pointer">
                      Income
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Custom Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
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
                <label className="text-sm font-medium text-zinc-700">
                  Search Description
                </label>
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={localFilters.searchKeyword}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, searchKeyword: e.target.value })
                  }
                  className="bg-white h-10 md:h-9"
                />
              </div>

              {/* Vendor Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
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
                  className="bg-white"
                />
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
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
                  className="bg-white"
                />
              </div>
            </div>

            {/* Spacer for mobile fixed button */}
            <div className="h-20 md:hidden" />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-t border-zinc-200 bg-zinc-50 sticky bottom-0 md:static">
            <Button
              variant="outline"
              onClick={handleReset}
              className="h-10 md:h-9"
            >
              Reset
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-10 md:h-9 hidden md:flex"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                className="bg-blue-600 hover:bg-blue-700 text-white h-10 md:h-9"
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
