# Transaction Filter UI - Component Examples & Visual Specifications

**Companion Document to:** TRANSACTION_FILTER_REDESIGN.md
**Version:** 1.0
**Date:** 2025-10-21

---

## Quick Reference: Component Hierarchy

```
AllTransactionsPage
├─ QuickFilterBar
│  ├─ DatePresetButtons (This Month, Last 30 Days, etc.)
│  ├─ CustomRangeDropdown
│  ├─ TransactionTypeButtons (All, Expenses, Income)
│  └─ MoreFiltersButton
├─ ActiveFilterChips (conditional: when filters active)
│  ├─ FilterChip[] (one per active filter)
│  ├─ ClearAllButton
│  └─ ResultCount
├─ AdvancedFiltersPanel (conditional: when expanded)
│  ├─ SearchInput
│  ├─ VendorMultiSelect
│  ├─ PaymentMethodMultiSelect
│  ├─ AmountRangeInputs (Phase 3)
│  ├─ TagMultiSelect (Phase 3)
│  └─ PanelActions (Apply, Reset)
└─ TransactionsTable / TransactionCards
```

---

## Component 1: QuickFilterBar

### Desktop Layout (Tailwind Classes)

```tsx
// src/components/page-specific/quick-filter-bar.tsx

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface QuickFilterBarProps {
  activePreset: string | null
  activeTransactionType: "all" | "expense" | "income"
  onPresetChange: (preset: string) => void
  onTransactionTypeChange: (type: "all" | "expense" | "income") => void
  onMoreFiltersClick: () => void
}

export function QuickFilterBar({
  activePreset,
  activeTransactionType,
  onPresetChange,
  onTransactionTypeChange,
  onMoreFiltersClick,
}: QuickFilterBarProps) {
  return (
    <div className="w-full bg-zinc-50 rounded-lg border border-zinc-200 px-4 py-3">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">

        {/* Left Section: Date Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-zinc-700">
            Time Period:
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPresetChange('this-month')}
              className={
                activePreset === 'this-month'
                  ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
              }
            >
              This Month
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPresetChange('last-30-days')}
              className={
                activePreset === 'last-30-days'
                  ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
              }
            >
              Last 30 Days
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPresetChange('this-year')}
              className={
                activePreset === 'this-year'
                  ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
              }
            >
              This Year
            </Button>

            {/* Custom Range Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    activePreset === 'custom'
                      ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
                  }
                >
                  Custom Range
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onPresetChange('today')}>
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('yesterday')}>
                  Yesterday
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('last-7-days')}>
                  Last 7 Days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('this-week')}>
                  This Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('last-week')}>
                  Last Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('last-month')}>
                  Last Month
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('this-quarter')}>
                  This Quarter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('last-quarter')}>
                  Last Quarter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('last-year')}>
                  Last Year
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('all-time')}>
                  All Time
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('custom-picker')}>
                  <strong>Select custom range...</strong>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Right Section: Type Filters + More */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-700">
              Type:
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransactionTypeChange('all')}
                className={
                  activeTransactionType === 'all'
                    ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
                }
              >
                All
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransactionTypeChange('expense')}
                className={
                  activeTransactionType === 'expense'
                    ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
                }
              >
                Expenses
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransactionTypeChange('income')}
                className={
                  activeTransactionType === 'income'
                    ? 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
                }
              >
                Income
              </Button>
            </div>
          </div>

          {/* More Filters Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoreFiltersClick}
            className="text-zinc-600 hover:text-zinc-900"
          >
            More filters
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Mobile Variation

```tsx
// Mobile-optimized version with horizontal scroll

export function QuickFilterBarMobile({
  activePreset,
  activeTransactionType,
  onPresetChange,
  onTransactionTypeChange,
  onMoreFiltersClick,
}: QuickFilterBarProps) {
  return (
    <div className="w-full bg-zinc-50 rounded-lg border border-zinc-200 p-3">
      {/* Date Presets - Horizontal Scroll */}
      <div className="mb-3">
        <span className="text-xs font-medium text-zinc-600 mb-2 block">
          Time Period
        </span>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPresetChange('this-month')}
            className={`flex-shrink-0 snap-start ${
              activePreset === 'this-month'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-700'
            }`}
          >
            This Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPresetChange('last-30-days')}
            className={`flex-shrink-0 snap-start ${
              activePreset === 'last-30-days'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-700'
            }`}
          >
            Last 30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPresetChange('this-year')}
            className={`flex-shrink-0 snap-start ${
              activePreset === 'this-year'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-700'
            }`}
          >
            This Year
          </Button>
          {/* Custom Range dropdown */}
        </div>
      </div>

      {/* Transaction Type */}
      <div className="mb-3">
        <span className="text-xs font-medium text-zinc-600 mb-2 block">
          Type
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTransactionTypeChange('all')}
            className={`flex-1 ${
              activeTransactionType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-700'
            }`}
          >
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTransactionTypeChange('expense')}
            className={`flex-1 ${
              activeTransactionType === 'expense'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-700'
            }`}
          >
            Expenses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTransactionTypeChange('income')}
            className={`flex-1 ${
              activeTransactionType === 'income'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-700'
            }`}
          >
            Income
          </Button>
        </div>
      </div>

      {/* More Filters Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onMoreFiltersClick}
        className="w-full"
      >
        More filters
      </Button>
    </div>
  )
}
```

---

## Component 2: ActiveFilterChips

### Implementation

```tsx
// src/components/page-specific/active-filter-chips.tsx

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { TransactionFilters } from "@/app/transactions/page"

interface ActiveFilterChipsProps {
  filters: TransactionFilters
  onRemoveFilter: (filterType: keyof TransactionFilters) => void
  onRemoveVendor: (vendorId: string) => void
  onRemovePaymentMethod: (paymentMethodId: string) => void
  onClearAll: () => void
  resultCount: number
  vendors: Array<{ id: string; name: string }>
  paymentMethods: Array<{ id: string; name: string }>
}

export function ActiveFilterChips({
  filters,
  onRemoveFilter,
  onRemoveVendor,
  onRemovePaymentMethod,
  onClearAll,
  resultCount,
  vendors,
  paymentMethods,
}: ActiveFilterChipsProps) {
  // Calculate if any filters are active
  const hasActiveFilters =
    filters.dateRange ||
    filters.searchKeyword ||
    filters.vendorIds.length > 0 ||
    filters.paymentMethodIds.length > 0 ||
    filters.transactionType !== "all"

  if (!hasActiveFilters) return null

  // Helper to format date range for chip
  const formatDateRange = (range: typeof filters.dateRange): string => {
    if (!range?.from) return ""

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    if (!range.to || range.from.getTime() === range.to.getTime()) {
      return formatDate(range.from)
    }

    return `${formatDate(range.from)} - ${formatDate(range.to)}`
  }

  return (
    <div className="w-full bg-blue-50/50 border border-blue-100 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-zinc-600 mr-1">
            Active:
          </span>

          {/* Date Range Chip */}
          {filters.dateRange && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              {formatDateRange(filters.dateRange)}
              <button
                onClick={() => onRemoveFilter('dateRange')}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove date filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Transaction Type Chip */}
          {filters.transactionType !== "all" && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              {filters.transactionType === 'expense' ? 'Expenses only' : 'Income only'}
              <button
                onClick={() => onRemoveFilter('transactionType')}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Search Keyword Chip */}
          {filters.searchKeyword && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              Search: {filters.searchKeyword}
              <button
                onClick={() => onRemoveFilter('searchKeyword')}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Vendor Chips */}
          {filters.vendorIds.length === 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              Vendor: {vendors.find(v => v.id === filters.vendorIds[0])?.name}
              <button
                onClick={() => onRemoveVendor(filters.vendorIds[0])}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove vendor filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.vendorIds.length > 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              {filters.vendorIds.length} vendors
              <button
                onClick={() => onRemoveFilter('vendorIds')}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove vendor filters"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Payment Method Chips */}
          {filters.paymentMethodIds.length === 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              Payment: {paymentMethods.find(pm => pm.id === filters.paymentMethodIds[0])?.name}
              <button
                onClick={() => onRemovePaymentMethod(filters.paymentMethodIds[0])}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove payment method filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.paymentMethodIds.length > 1 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 pr-1"
            >
              {filters.paymentMethodIds.length} payment methods
              <button
                onClick={() => onRemoveFilter('paymentMethodIds')}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                aria-label="Remove payment method filters"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>

        {/* Right: Clear All + Count */}
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
```

---

## Component 3: AdvancedFiltersPanel

### Desktop Implementation

```tsx
// src/components/page-specific/advanced-filters-panel.tsx

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import type { TransactionFilters } from "@/app/transactions/page"

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
    })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-x-0 top-[200px] z-50 mx-auto max-w-5xl px-4 animate-in slide-in-from-top-4 duration-200">
        <div className="bg-white rounded-lg border border-zinc-200 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900">
              Advanced Filters
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close advanced filters"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

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
                  className="bg-white"
                />
              </div>

              {/* Vendor Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Vendors
                </label>
                <MultiSelectComboBox
                  options={vendors.map(v => ({ value: v.id, label: v.name }))}
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
                  options={paymentMethods.map(pm => ({ value: pm.id, label: pm.name }))}
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

              {/* Amount Range (Phase 3) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Amount Range (Coming Soon)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    disabled
                    className="bg-zinc-100"
                  />
                  <span className="text-zinc-400">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    disabled
                    className="bg-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50">
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
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
```

### Mobile Bottom Sheet Variation

```tsx
// Mobile version as bottom sheet

export function AdvancedFiltersPanelMobile({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  vendors,
  paymentMethods,
}: AdvancedFiltersPanelProps) {
  // ... same state logic ...

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-zinc-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900">
              Advanced Filters
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filter Controls - Single Column */}
        <div className="p-4 space-y-4">
          {/* Search */}
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
              className="bg-white h-12 text-base"
            />
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Vendors
            </label>
            <MultiSelectComboBox
              options={vendors.map(v => ({ value: v.id, label: v.name }))}
              values={localFilters.vendorIds}
              onValuesChange={(vendorIds) =>
                setLocalFilters({ ...localFilters, vendorIds })
              }
              placeholder="Select vendors..."
              searchPlaceholder="Search vendors..."
              emptyMessage="No vendors found."
              allowAdd={false}
              className="bg-white h-12"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Payment Methods
            </label>
            <MultiSelectComboBox
              options={paymentMethods.map(pm => ({ value: pm.id, label: pm.name }))}
              values={localFilters.paymentMethodIds}
              onValuesChange={(paymentMethodIds) =>
                setLocalFilters({ ...localFilters, paymentMethodIds })
              }
              placeholder="Select payment methods..."
              searchPlaceholder="Search payment methods..."
              emptyMessage="No payment methods found."
              allowAdd={false}
              className="bg-white h-12"
            />
          </div>

          {/* Spacer for fixed button */}
          <div className="h-20" />
        </div>

        {/* Fixed Actions at Bottom */}
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 p-4 flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1 h-12"
          >
            Reset
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  )
}
```

---

## Component 4: Date Preset Utilities

```typescript
// src/lib/utils/date-filters.ts

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  isSameDay,
  isSameMonth,
  isSameYear,
  format,
} from "date-fns"
import type { DateRange } from "react-day-picker"

export type DatePresetKey =
  | 'today'
  | 'yesterday'
  | 'last-7-days'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'last-30-days'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'last-year'
  | 'all-time'
  | 'custom'

export const DATE_PRESETS: Record<DatePresetKey, () => DateRange> = {
  today: () => {
    const now = new Date()
    return { from: startOfDay(now), to: endOfDay(now) }
  },

  yesterday: () => {
    const yesterday = subDays(new Date(), 1)
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
  },

  'last-7-days': () => {
    const now = new Date()
    return { from: subDays(now, 7), to: now }
  },

  'this-week': () => {
    const now = new Date()
    return { from: startOfWeek(now), to: now }
  },

  'last-week': () => {
    const lastWeek = subWeeks(new Date(), 1)
    return { from: startOfWeek(lastWeek), to: endOfWeek(lastWeek) }
  },

  'this-month': () => {
    const now = new Date()
    return { from: startOfMonth(now), to: now }
  },

  'last-month': () => {
    const lastMonth = subMonths(new Date(), 1)
    return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
  },

  'last-30-days': () => {
    const now = new Date()
    return { from: subDays(now, 30), to: now }
  },

  'this-quarter': () => {
    const now = new Date()
    return { from: startOfQuarter(now), to: now }
  },

  'last-quarter': () => {
    const lastQ = subQuarters(new Date(), 1)
    return { from: startOfQuarter(lastQ), to: endOfQuarter(lastQ) }
  },

  'this-year': () => {
    const now = new Date()
    return { from: startOfYear(now), to: now }
  },

  'last-year': () => {
    const lastY = subYears(new Date(), 1)
    return { from: startOfYear(lastY), to: endOfYear(lastY) }
  },

  'all-time': () => {
    return { from: undefined, to: undefined }
  },

  custom: () => {
    // Placeholder, actual custom range set by user
    return { from: undefined, to: undefined }
  },
}

export function getPresetRange(key: DatePresetKey): DateRange {
  const preset = DATE_PRESETS[key]
  return preset ? preset() : { from: undefined, to: undefined }
}

export function formatDateRangeChip(range: DateRange | undefined): string {
  if (!range?.from) return 'All Time'

  if (!range.to || isSameDay(range.from, range.to)) {
    return format(range.from, 'MMM d, yyyy')
  }

  if (isSameMonth(range.from, range.to)) {
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'd, yyyy')}`
  }

  if (isSameYear(range.from, range.to)) {
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`
  }

  return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
}

export function detectPreset(range: DateRange | undefined): DatePresetKey | null {
  if (!range?.from || !range?.to) return 'all-time'

  // Check each preset
  for (const [key, getRange] of Object.entries(DATE_PRESETS)) {
    if (key === 'custom' || key === 'all-time') continue

    const presetRange = getRange()
    if (
      presetRange.from &&
      presetRange.to &&
      isSameDay(range.from, presetRange.from) &&
      isSameDay(range.to, presetRange.to)
    ) {
      return key as DatePresetKey
    }
  }

  return 'custom'
}

export const PRESET_LABELS: Record<DatePresetKey, string> = {
  'today': 'Today',
  'yesterday': 'Yesterday',
  'last-7-days': 'Last 7 Days',
  'this-week': 'This Week',
  'last-week': 'Last Week',
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'last-30-days': 'Last 30 Days',
  'this-quarter': 'This Quarter',
  'last-quarter': 'Last Quarter',
  'this-year': 'This Year',
  'last-year': 'Last Year',
  'all-time': 'All Time',
  'custom': 'Custom Range',
}
```

---

## Integration Example: Updated AllTransactionsPage

```typescript
// Partial update to src/app/transactions/page.tsx

import { QuickFilterBar } from "@/components/page-specific/quick-filter-bar"
import { ActiveFilterChips } from "@/components/page-specific/active-filter-chips"
import { AdvancedFiltersPanel } from "@/components/page-specific/advanced-filters-panel"
import { getPresetRange, detectPreset, type DatePresetKey } from "@/lib/utils/date-filters"

export default function AllTransactionsPage() {
  // ... existing code ...

  // Initialize with "This Month" default
  const [filters, setFilters] = React.useState<TransactionFilters>({
    dateRange: getPresetRange('this-month'),
    datePreset: 'this-month',
    searchKeyword: "",
    vendorIds: [],
    paymentMethodIds: [],
    transactionType: "all",
  })

  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false)

  const handlePresetChange = (preset: DatePresetKey) => {
    const range = getPresetRange(preset)
    setFilters({
      ...filters,
      dateRange: range,
      datePreset: preset,
    })
  }

  const handleTransactionTypeChange = (type: TransactionType) => {
    setFilters({ ...filters, transactionType: type })
  }

  const handleRemoveFilter = (filterType: keyof TransactionFilters) => {
    setFilters({
      ...filters,
      [filterType]: filterType === 'transactionType' ? 'all' :
                    filterType === 'dateRange' ? getPresetRange('this-month') :
                    filterType === 'vendorIds' || filterType === 'paymentMethodIds' ? [] :
                    '',
    })
  }

  const handleClearAll = () => {
    setFilters({
      dateRange: getPresetRange('this-month'),
      datePreset: 'this-month',
      searchKeyword: "",
      vendorIds: [],
      paymentMethodIds: [],
      transactionType: "all",
    })
  }

  // ... rest of component ...

  return (
    <div className="min-h-screen bg-white">
      {/* ... existing navigation ... */}

      <main className="lg:ml-[240px]">
        <div className="w-full max-w-md md:max-w-none mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-6 md:pt-12 px-6 md:px-8">

          {/* Header */}
          {/* ... existing header ... */}

          {/* NEW: Quick Filter Bar */}
          <QuickFilterBar
            activePreset={filters.datePreset || detectPreset(filters.dateRange)}
            activeTransactionType={filters.transactionType}
            onPresetChange={handlePresetChange}
            onTransactionTypeChange={handleTransactionTypeChange}
            onMoreFiltersClick={() => setShowAdvancedFilters(true)}
          />

          {/* NEW: Active Filter Chips */}
          <ActiveFilterChips
            filters={filters}
            onRemoveFilter={handleRemoveFilter}
            onRemoveVendor={(id) => {
              setFilters({
                ...filters,
                vendorIds: filters.vendorIds.filter(v => v !== id)
              })
            }}
            onRemovePaymentMethod={(id) => {
              setFilters({
                ...filters,
                paymentMethodIds: filters.paymentMethodIds.filter(pm => pm !== id)
              })
            }}
            onClearAll={handleClearAll}
            resultCount={filteredTransactions.length}
            vendors={uniqueVendors}
            paymentMethods={uniquePaymentMethods}
          />

          {/* Transaction Display */}
          {/* ... existing table/cards ... */}

        </div>
      </main>

      {/* NEW: Advanced Filters Panel */}
      <AdvancedFiltersPanel
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          setFilters({ ...filters, ...newFilters })
        }}
        vendors={uniqueVendors}
        paymentMethods={uniquePaymentMethods}
      />
    </div>
  )
}
```

---

## Visual States Specification

### Filter Button States

#### Inactive (Default)
```css
background: white
color: #3f3f46 (zinc-700)
border: 1px solid #e4e4e7 (zinc-200)
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05)
```

#### Inactive Hover
```css
background: #fafafa (zinc-50)
color: #18181b (zinc-900)
border: 1px solid #e4e4e7 (zinc-200)
```

#### Active
```css
background: #2563eb (blue-600)
color: white
border: none
box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3)
```

#### Active Hover
```css
background: #1d4ed8 (blue-700)
color: white
```

#### Focus (Keyboard)
```css
outline: 2px solid #2563eb (blue-600)
outline-offset: 2px
```

---

### Filter Chip States

#### Default
```css
background: #dbeafe (blue-100)
color: #1e3a8a (blue-900)
border: 1px solid #bfdbfe (blue-200)
padding: 4px 12px
border-radius: 16px
height: 28px
font-size: 13px
font-weight: 500
```

#### Hover
```css
background: #bfdbfe (blue-200)
```

#### Close Button Hover
```css
background: #93c5fd (blue-300)
border-radius: 9999px
```

---

## Accessibility Annotations

### Keyboard Navigation Flow

1. **Quick Filter Bar:**
   - Tab to first date preset button
   - Arrow Left/Right to navigate between date buttons
   - Tab to type filter section
   - Arrow Left/Right to navigate between type buttons
   - Tab to "More filters" button
   - Enter/Space to activate any button

2. **Active Filter Chips:**
   - Tab to first chip's close button
   - Tab through each chip's close button
   - Tab to "Clear all" button
   - Enter/Space to activate

3. **Advanced Filters Panel:**
   - Focus trap within panel when open
   - Tab through filter inputs
   - Escape key to close panel
   - Enter on "Apply" button
   - Focus returns to "More filters" button on close

### Screen Reader Announcements

```typescript
// Example ARIA labels and live regions

<Button
  aria-label="Filter by this month"
  aria-pressed={activePreset === 'this-month'}
>
  This Month
</Button>

<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {filteredTransactions.length} transactions found
</div>

<Badge
  role="button"
  aria-label={`Remove filter: ${filterLabel}. Press Enter to remove.`}
>
  {filterLabel}
  <X aria-hidden="true" />
</Badge>
```

---

## Animation Specifications

### Panel Slide Down (Advanced Filters)

```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.advanced-panel {
  animation: slideDown 200ms ease-out;
}
```

### Mobile Bottom Sheet

```css
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.bottom-sheet {
  animation: slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Filter Chip Fade In

```css
@keyframes chipFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.filter-chip {
  animation: chipFadeIn 150ms ease-out;
}
```

---

## Performance Best Practices

### Memoization

```typescript
// Memoize filtered transactions
const filteredTransactions = React.useMemo(() => {
  return transactions.filter((transaction) => {
    // ... filtering logic ...
  })
}, [transactions, filters])

// Memoize expensive calculations
const transactionTotals = React.useMemo(() => {
  return calculateTotals(filteredTransactions)
}, [filteredTransactions])

// Debounce search input
const debouncedSearch = useDebounce(filters.searchKeyword, 300)
```

### Lazy Loading

```typescript
// Code-split advanced filters panel
const AdvancedFiltersPanel = React.lazy(() =>
  import('@/components/page-specific/advanced-filters-panel')
)

// Preload on hover
const handleMoreFiltersHover = () => {
  import('@/components/page-specific/advanced-filters-panel')
}

<Button
  onMouseEnter={handleMoreFiltersHover}
  onClick={() => setShowAdvancedFilters(true)}
>
  More filters
</Button>
```

---

**END OF EXAMPLES DOCUMENT**
