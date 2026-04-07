"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { Search, X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MonthStepperFilter } from "@/components/ui/month-stepper-filter"
import { detectPreset, type DatePresetKey } from "@/lib/utils/date-filters"
import { CURRENCY_CONFIG_FALLBACK } from "@/lib/utils/currency-symbols-sync"

export type TransactionType = "all" | "expense" | "income" | "transfer"
export type SourceType = "any" | "email" | "statement" | "none"

export interface TransactionFilters {
  dateRange?: DateRange
  datePreset?: DatePresetKey
  searchKeyword: string
  vendorIds: string[]
  paymentMethodIds: string[]
  transactionType: TransactionType
  sourceType?: SourceType
  amountMin?: number
  amountMax?: number
  amountCurrency?: string
}

interface TransactionsFilterBarProps {
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
  vendors: Array<{ id: string; name: string }>
  paymentMethods: Array<{ id: string; name: string }>
  className?: string
}

const AMOUNT_CURRENCIES = ["USD", "THB", "VND", "MYR", "CNY", "EUR", "GBP", "SGD", "JPY"]

const typeButtons: Array<{ value: TransactionType; label: string }> = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfers" },
]

export function TransactionsFilterBar({
  filters,
  onFiltersChange,
  vendors,
  paymentMethods,
  className,
}: TransactionsFilterBarProps) {
  const [showMoreFilters, setShowMoreFilters] = React.useState(false)
  const [searchInput, setSearchInput] = React.useState(filters.searchKeyword)

  // Debounced search — commits to parent filters 300ms after last keystroke
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.searchKeyword) {
        onFiltersChange({ ...filters, searchKeyword: searchInput })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, filters, onFiltersChange])

  // If parent filters reset externally (e.g. Clear All), sync local search input
  React.useEffect(() => {
    setSearchInput(filters.searchKeyword)
  }, [filters.searchKeyword])

  // Auto-expand Row C on first render if any overflow filter is active
  React.useEffect(() => {
    if (
      filters.vendorIds.length > 0 ||
      filters.paymentMethodIds.length > 0 ||
      filters.sourceType !== undefined ||
      filters.amountMin !== undefined ||
      filters.amountMax !== undefined
    ) {
      setShowMoreFilters(true)
    }
    // Mount-only — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = <K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: range,
      datePreset: detectPreset(range) ?? "custom",
    })
  }

  const handleReset = () => {
    setSearchInput("")
    onFiltersChange({
      ...filters,
      dateRange: undefined,
      datePreset: "all-time",
      searchKeyword: "",
      vendorIds: [],
      paymentMethodIds: [],
      transactionType: "all",
      sourceType: undefined,
      amountMin: undefined,
      amountMax: undefined,
      amountCurrency: undefined,
    })
  }

  const secondaryFilterCount =
    (filters.vendorIds.length > 0 ? 1 : 0) +
    (filters.paymentMethodIds.length > 0 ? 1 : 0) +
    (filters.sourceType !== undefined ? 1 : 0) +
    (filters.amountMin !== undefined || filters.amountMax !== undefined ? 1 : 0)

  // "this-month" is the page default — anything else is user-initiated.
  const showReset =
    filters.searchKeyword !== "" ||
    filters.vendorIds.length > 0 ||
    filters.paymentMethodIds.length > 0 ||
    filters.transactionType !== "all" ||
    filters.sourceType !== undefined ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined ||
    filters.datePreset !== "this-month"

  const vendorOptions = React.useMemo(
    () => vendors.map(v => ({ value: v.id, label: v.name })),
    [vendors],
  )
  const paymentMethodOptions = React.useMemo(
    () => paymentMethods.map(pm => ({ value: pm.id, label: pm.name })),
    [paymentMethods],
  )

  const amountCurrency = filters.amountCurrency || "USD"
  const amountSymbol = CURRENCY_CONFIG_FALLBACK[amountCurrency]?.symbol ?? "$"
  const amountPl = amountSymbol.length > 1 ? "pl-10" : "pl-7"

  return (
    <div className={cn("space-y-3", className)}>
      {/* Row A — date navigation */}
      <div className="pb-3 border-b">
        <MonthStepperFilter
          dateRange={filters.dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {/* Row B — search, type, actions */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search — now inline, no longer buried in a modal */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search description, vendor..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Transaction type segmented control */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 h-10 overflow-x-auto shrink-0">
          {typeButtons.map((btn) => (
            <button
              key={btn.value}
              type="button"
              onClick={() => update("transactionType", btn.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                filters.transactionType === btn.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="hidden sm:block sm:flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={cn("h-10 shrink-0", secondaryFilterCount > 0 && "border-amber-300")}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          More Filters
          {secondaryFilterCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
              {secondaryFilterCount}
            </span>
          )}
        </Button>

        {showReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-10 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Row C — expanded overflow (inline, not modal) */}
      {showMoreFilters && (
        <div className="pt-3 border-t space-y-4">
          {/* Top row: Vendors + Payment Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Vendors</label>
              <MultiSelectComboBox
                options={vendorOptions}
                values={filters.vendorIds}
                onValuesChange={(vendorIds) => update("vendorIds", vendorIds)}
                placeholder="Select vendors..."
                searchPlaceholder="Search vendors..."
                emptyMessage="No vendors found."
                allowAdd={false}
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Payment Methods</label>
              <MultiSelectComboBox
                options={paymentMethodOptions}
                values={filters.paymentMethodIds}
                onValuesChange={(paymentMethodIds) => update("paymentMethodIds", paymentMethodIds)}
                placeholder="Select payment methods..."
                searchPlaceholder="Search payment methods..."
                emptyMessage="No payment methods found."
                allowAdd={false}
                className="bg-background"
              />
            </div>
          </div>

          {/* Bottom row: Source + Amount range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sources</label>
              <ToggleGroup
                type="single"
                value={filters.sourceType || "all"}
                onValueChange={(value: string) => {
                  if (value) {
                    update("sourceType", value === "all" ? undefined : (value as SourceType))
                  }
                }}
                variant="outline"
                className="w-full gap-0"
              >
                <ToggleGroupItem value="all" className="h-9 flex-1 text-xs">All</ToggleGroupItem>
                <ToggleGroupItem value="any" className="h-9 flex-1 text-xs">Any</ToggleGroupItem>
                <ToggleGroupItem value="email" className="h-9 flex-1 text-xs">Email</ToggleGroupItem>
                <ToggleGroupItem value="statement" className="h-9 flex-1 text-xs">Stmt</ToggleGroupItem>
                <ToggleGroupItem value="none" className="h-9 flex-1 text-xs">Unlinked</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount Range</label>
              <div className="flex items-center gap-2">
                <Select
                  value={amountCurrency}
                  onValueChange={(value) => update("amountCurrency", value)}
                >
                  <SelectTrigger className="w-[90px] bg-background h-9 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AMOUNT_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    {amountSymbol}
                  </span>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.amountMin ?? ""}
                    onChange={(e) =>
                      update(
                        "amountMin",
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    className={`bg-background h-9 ${amountPl}`}
                    min={0}
                    step="any"
                  />
                </div>
                <span className="text-muted-foreground text-sm">to</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    {amountSymbol}
                  </span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.amountMax ?? ""}
                    onChange={(e) =>
                      update(
                        "amountMax",
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    className={`bg-background h-9 ${amountPl}`}
                    min={0}
                    step="any"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
