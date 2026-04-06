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
import { DateRangePickerTrigger } from "@/components/ui/date-range-dialog"
import { Search, X, Filter, Play, ArrowUp, ArrowDown } from "lucide-react"
import type { DateRange } from "react-day-picker"
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
  const [draft, setDraft] = React.useState<PaymentSlipFilters>(filters)

  React.useEffect(() => {
    setDraft(filters)
  }, [filters])

  const isDirty = filtersChanged(draft, filters)

  const handleApply = () => {
    onFiltersChange(draft)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isDirty) {
      handleApply()
    }
  }

  const handleClearAll = () => {
    setDraft(defaultPaymentSlipFilters)
    onFiltersChange(defaultPaymentSlipFilters)
  }

  const activeFilterCount = [
    filters.search !== "",
    filters.direction !== "all",
    filters.slipState !== "all",
    filters.bank !== "all",
    filters.confidence !== "all",
    filters.dateRange !== undefined,
  ].filter(Boolean).length

  return (
    <div className={cn("space-y-4", className)} onKeyDown={handleKeyDown}>
      {/* Main filters row */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sender, recipient, memo..."
            value={draft.search}
            onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Direction toggle */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          {directionButtons.map((btn) => (
            <button
              key={btn.value}
              type="button"
              onClick={() => setDraft({ ...draft, direction: btn.value })}
              className={cn(
                "flex items-center gap-1 px-3 py-2.5 sm:py-1.5 text-xs font-medium rounded-md transition-colors",
                draft.direction === btn.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* State */}
        <Select
          value={draft.slipState}
          onValueChange={(value) => setDraft({ ...draft, slipState: value as PaymentSlipState })}
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
          onValueChange={(value) => setDraft({ ...draft, bank: value as PaymentSlipBank })}
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

        {/* Confidence */}
        <Select
          value={draft.confidence}
          onValueChange={(value) => setDraft({ ...draft, confidence: value as PaymentSlipConfidence })}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            {confidenceOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date + sort row */}
      <div className="border-t pt-4 flex flex-wrap items-center gap-3">
        <DateRangePickerTrigger
          dateRange={draft.dateRange}
          onDateRangeChange={(range: DateRange | undefined) => setDraft({ ...draft, dateRange: range })}
          placeholder="Date range..."
        />

        <Select
          value={draft.sortField}
          onValueChange={(value) => setDraft({ ...draft, sortField: value as PaymentSlipSortField })}
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

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setDraft({ ...draft, sortOrder: draft.sortOrder === "asc" ? "desc" : "asc" })
          }
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

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button size="sm" onClick={handleApply} disabled={!isDirty}>
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Apply
        </Button>

        {hasActiveFilters(filters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
              {totalMatches != null && `, ${totalMatches.toLocaleString()} match${totalMatches !== 1 ? "es" : ""}`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
