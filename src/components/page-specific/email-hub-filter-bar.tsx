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
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Search, X, Filter } from "lucide-react"
import type { DateRange } from "react-day-picker"
import {
  type EmailHubFilters,
  type EmailHubStatus,
  type EmailHubClassification,
  type EmailHubCurrency,
  type EmailHubConfidence,
  type EmailHubSort,
  defaultEmailHubFilters,
  hasActiveFilters,
} from "@/hooks/use-email-hub-filters"

interface EmailHubFilterBarProps {
  filters: EmailHubFilters
  onFiltersChange: (filters: EmailHubFilters) => void
  className?: string
}

const statusOptions: Array<{ value: EmailHubStatus; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "unprocessed", label: "Unprocessed" },
  { value: "pending_review", label: "Pending Review" },
  { value: "matched", label: "Matched" },
  { value: "waiting_for_statement", label: "Waiting" },
  { value: "ready_to_import", label: "Ready to Import" },
  { value: "imported", label: "Imported" },
  { value: "skipped", label: "Skipped" },
]

const classificationOptions: Array<{ value: EmailHubClassification; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "receipt", label: "Receipt" },
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "bill_payment", label: "Bill Payment" },
  { value: "unknown", label: "Unknown" },
]

const currencyOptions: Array<{ value: EmailHubCurrency; label: string }> = [
  { value: "all", label: "All Currencies" },
  { value: "USD", label: "USD" },
  { value: "THB", label: "THB" },
]

const confidenceOptions: Array<{ value: EmailHubConfidence; label: string }> = [
  { value: "all", label: "All Confidence" },
  { value: "high", label: "High (90%+)" },
  { value: "medium", label: "Medium (55-89%)" },
  { value: "low", label: "Low (<55%)" },
]

const sortOptions: Array<{ value: EmailHubSort; label: string }> = [
  { value: "email_date_desc", label: "Newest First" },
  { value: "email_date_asc", label: "Oldest First" },
  { value: "amount_desc", label: "Highest Amount" },
  { value: "confidence_desc", label: "Highest Confidence" },
]

export function EmailHubFilterBar({
  filters,
  onFiltersChange,
  className,
}: EmailHubFilterBarProps) {
  const [searchInput, setSearchInput] = React.useState(filters.search)

  // Debounced search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput })
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchInput, filters, onFiltersChange])

  const handleFilterChange = (
    key: keyof EmailHubFilters,
    value: string | DateRange | undefined
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleClearAll = () => {
    setSearchInput("")
    onFiltersChange(defaultEmailHubFilters)
  }

  const activeFilterCount = [
    filters.status !== "all",
    filters.classification !== "all",
    filters.currency !== "all",
    filters.confidence !== "all",
    filters.dateRange !== undefined,
    filters.search !== "",
  ].filter(Boolean).length

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendor, subject..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value as EmailHubStatus)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Classification */}
        <Select
          value={filters.classification}
          onValueChange={(value) => handleFilterChange("classification", value as EmailHubClassification)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {classificationOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Currency */}
        <Select
          value={filters.currency}
          onValueChange={(value) => handleFilterChange("currency", value as EmailHubCurrency)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Confidence */}
        <Select
          value={filters.confidence}
          onValueChange={(value) => handleFilterChange("confidence", value as EmailHubConfidence)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            {confidenceOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sort}
          onValueChange={(value) => handleFilterChange("sort", value as EmailHubSort)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <DateRangePicker
          dateRange={filters.dateRange}
          onDateRangeChange={(range: DateRange | undefined) => handleFilterChange("dateRange", range)}
          className="w-[260px]"
        />

        {/* Clear all */}
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
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>
            {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
          </span>
        </div>
      )}
    </div>
  )
}
