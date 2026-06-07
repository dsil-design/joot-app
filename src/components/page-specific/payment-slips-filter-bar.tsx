"use client"

import * as React from "react"
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
import { MonthStepperFilter } from "@/components/ui/month-stepper-filter"
import { Search, X, SlidersHorizontal, ArrowUp, ArrowDown, Play, Filter } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { getMonthRange, isCurrentMonthRange } from "@/lib/utils/date-filters"
import {
  type PaymentSlipFilters,
  type PaymentSlipState,
  type PaymentSlipDirection,
  type PaymentSlipBank,
  type PaymentSlipConfidence,
  type PaymentSlipSortField,
  defaultPaymentSlipFilters,
  hasActiveFilters,
} from "@/hooks/use-payment-slips-filters"

interface PaymentSlipsFilterBarProps {
  filters: PaymentSlipFilters
  onFiltersChange: (filters: PaymentSlipFilters) => void
  totalMatches?: number | null
  className?: string
}

const stateOptions: Array<{ value: PaymentSlipState; label: string }> = [
  { value: "all", label: "All States" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "ready", label: "Ready for Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

const directionButtons: Array<{ value: PaymentSlipDirection; label: string }> = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
]

const bankOptions: Array<{ value: PaymentSlipBank; label: string }> = [
  { value: "all", label: "All Banks" },
  { value: "kbank", label: "KBank" },
  { value: "bangkok_bank", label: "Bangkok Bank" },
]

const confidenceOptions: Array<{ value: PaymentSlipConfidence; label: string }> = [
  { value: "all", label: "All Confidence" },
  { value: "high", label: "High (90%+)" },
  { value: "medium", label: "Medium (55-89%)" },
  { value: "low", label: "Low (<55%)" },
]

const sortFieldOptions: Array<{ value: PaymentSlipSortField; label: string }> = [
  { value: "transaction_date", label: "Transaction Date" },
  { value: "uploaded_at", label: "Upload Date" },
  { value: "amount", label: "Amount" },
  { value: "confidence", label: "Confidence" },
]

function filtersChanged(a: PaymentSlipFilters, b: PaymentSlipFilters): boolean {
  return (
    a.search !== b.search ||
    a.direction !== b.direction ||
    a.slipState !== b.slipState ||
    a.bank !== b.bank ||
    a.confidence !== b.confidence ||
    a.sortField !== b.sortField ||
    a.sortOrder !== b.sortOrder ||
    a.dateRange?.from?.getTime() !== b.dateRange?.from?.getTime() ||
    a.dateRange?.to?.getTime() !== b.dateRange?.to?.getTime()
  )
}

export function PaymentSlipsFilterBar({
  filters,
  onFiltersChange,
  totalMatches,
  className,
}: PaymentSlipsFilterBarProps) {
  const [showMoreFilters, setShowMoreFilters] = React.useState(false)
  const [draft, setDraft] = React.useState<PaymentSlipFilters>(filters)

  // Sync draft when filters change externally
  React.useEffect(() => {
    setDraft(filters)
  }, [filters])

  // Auto-expand if any of the overflow filters are active on first render
  React.useEffect(() => {
    if (
      filters.slipState !== "all" ||
      filters.bank !== "all" ||
      filters.sortField !== defaultPaymentSlipFilters.sortField ||
      filters.sortOrder !== defaultPaymentSlipFilters.sortOrder
    ) {
      setShowMoreFilters(true)
    }
    // Mount-only — intentional one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isDirty = filtersChanged(draft, filters)

  const handleApply = () => {
    onFiltersChange(draft)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isDirty) {
      handleApply()
    }
  }

  const updateDraft = <K extends keyof PaymentSlipFilters>(key: K, value: PaymentSlipFilters[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  const handleClearAll = () => {
    const reset = { ...defaultPaymentSlipFilters, dateRange: getMonthRange() }
    setDraft(reset)
    onFiltersChange(reset)
  }

  // Badge on "More Filters" reflects draft state
  const secondaryFilterCount =
    (draft.slipState !== "all" ? 1 : 0) +
    (draft.bank !== "all" ? 1 : 0) +
    (draft.sortField !== defaultPaymentSlipFilters.sortField ? 1 : 0) +
    (draft.sortOrder !== defaultPaymentSlipFilters.sortOrder ? 1 : 0)

  // Reset button shows when committed filters differ from defaults
  const showReset =
    filters.search !== "" ||
    filters.direction !== "all" ||
    filters.slipState !== "all" ||
    filters.bank !== "all" ||
    filters.confidence !== "all" ||
    (filters.dateRange !== undefined && !isCurrentMonthRange(filters.dateRange)) ||
    filters.sortField !== defaultPaymentSlipFilters.sortField ||
    filters.sortOrder !== defaultPaymentSlipFilters.sortOrder

  // Count of committed active filters for display
  const activeFilterCount = [
    filters.search !== "",
    filters.direction !== "all",
    filters.slipState !== "all",
    filters.bank !== "all",
    filters.confidence !== "all",
    filters.dateRange !== undefined && !isCurrentMonthRange(filters.dateRange),
  ].filter(Boolean).length

  return (
    <div className={cn("space-y-3", className)} onKeyDown={handleKeyDown}>
      {/* Row A — date navigation */}
      <div className="pb-3 border-b">
        <MonthStepperFilter
          dateRange={draft.dateRange}
          onDateRangeChange={(range: DateRange | undefined) => updateDraft("dateRange", range)}
        />
      </div>

      {/* Row B — search, direction, confidence, actions */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sender, recipient, memo..."
            value={draft.search}
            onChange={(e) => updateDraft("search", e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Direction toggle */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 h-10 shrink-0">
          {directionButtons.map((btn) => (
            <button
              key={btn.value}
              type="button"
              onClick={() => updateDraft("direction", btn.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                draft.direction === btn.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Confidence */}
        <Select
          value={draft.confidence}
          onValueChange={(value) => updateDraft("confidence", value as PaymentSlipConfidence)}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-10 shrink-0">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            {confidenceOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden sm:block sm:flex-1" />

        {/* More Filters */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={cn("h-10 shrink-0", secondaryFilterCount > 0 && "border-amber-300 dark:border-amber-700")}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          More Filters
          {secondaryFilterCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 dark:bg-amber-400 dark:bg-amber-500 text-white text-[10px] font-semibold">
              {secondaryFilterCount}
            </span>
          )}
        </Button>

        {/* Reset */}
        {showReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-10 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Row C — expanded filters */}
      {showMoreFilters && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t">
          {/* State */}
          <Select
            value={draft.slipState}
            onValueChange={(value) => updateDraft("slipState", value as PaymentSlipState)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bank */}
          <Select
            value={draft.bank}
            onValueChange={(value) => updateDraft("bank", value as PaymentSlipBank)}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Bank" />
            </SelectTrigger>
            <SelectContent>
              {bankOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden sm:block h-6 w-px bg-border" />

          {/* Sort field */}
          <Select
            value={draft.sortField}
            onValueChange={(value) => updateDraft("sortField", value as PaymentSlipSortField)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortFieldOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort order */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateDraft("sortOrder", draft.sortOrder === "asc" ? "desc" : "asc")}
            className="gap-1.5"
            title={draft.sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {draft.sortOrder === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )}
            {draft.sortOrder === "asc" ? "Asc" : "Desc"}
          </Button>
        </div>
      )}

      {/* Row D — Apply / filter status */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!isDirty}
        >
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Apply
        </Button>

        {(activeFilterCount > 0 || totalMatches != null) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {activeFilterCount > 0 && (
              <>
                <Filter className="h-4 w-4" />
                <span>
                  {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
                  {totalMatches != null && ` · ${totalMatches.toLocaleString()} match${totalMatches !== 1 ? "es" : ""}`}
                </span>
              </>
            )}
            {activeFilterCount === 0 && totalMatches != null && (
              <span>{totalMatches.toLocaleString()} match{totalMatches !== 1 ? "es" : ""}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
