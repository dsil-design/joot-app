"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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

/**
 * Filter status options
 */
export type FilterStatus = "all" | "pending" | "matched" | "waiting" | "new"

/**
 * Filter currency options
 */
export type FilterCurrency = "all" | "USD" | "THB"

/**
 * Filter confidence level
 */
export type FilterConfidence = "all" | "high" | "medium" | "low"

/**
 * Filter state
 */
export interface ReviewQueueFilters {
  status: FilterStatus
  currency: FilterCurrency
  confidence: FilterConfidence
  dateRange: DateRange | undefined
  search: string
}

/**
 * Default filter values
 */
export const defaultFilters: ReviewQueueFilters = {
  status: "all",
  currency: "all",
  confidence: "all",
  dateRange: undefined,
  search: "",
}

/**
 * ReviewQueueFilterBar props
 */
export interface ReviewQueueFilterBarProps {
  /**
   * Current filter values
   */
  filters: ReviewQueueFilters

  /**
   * Callback when filters change
   */
  onFiltersChange: (filters: ReviewQueueFilters) => void

  /**
   * Whether to sync filters with URL params
   * @default true
   */
  syncWithUrl?: boolean

  /**
   * Additional class name
   */
  className?: string
}

/**
 * Status filter options
 */
const statusOptions: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending Review" },
  { value: "matched", label: "Matched" },
  { value: "waiting", label: "Waiting for Statement" },
  { value: "new", label: "New Transactions" },
]

/**
 * Currency filter options
 */
const currencyOptions: Array<{ value: FilterCurrency; label: string }> = [
  { value: "all", label: "All Currencies" },
  { value: "USD", label: "USD" },
  { value: "THB", label: "THB" },
]

/**
 * Confidence filter options
 */
const confidenceOptions: Array<{ value: FilterConfidence; label: string }> = [
  { value: "all", label: "All Confidence" },
  { value: "high", label: "High (90%+)" },
  { value: "medium", label: "Medium (55-89%)" },
  { value: "low", label: "Low (<55%)" },
]

/**
 * Parse URL params to filters
 */
function parseUrlParams(searchParams: URLSearchParams): Partial<ReviewQueueFilters> {
  const filters: Partial<ReviewQueueFilters> = {}

  const status = searchParams.get("status")
  if (status && ["all", "pending", "matched", "waiting", "new"].includes(status)) {
    filters.status = status as FilterStatus
  }

  const currency = searchParams.get("currency")
  if (currency && ["all", "USD", "THB"].includes(currency)) {
    filters.currency = currency as FilterCurrency
  }

  const confidence = searchParams.get("confidence")
  if (confidence && ["all", "high", "medium", "low"].includes(confidence)) {
    filters.confidence = confidence as FilterConfidence
  }

  const search = searchParams.get("search")
  if (search) {
    filters.search = search
  }

  const from = searchParams.get("from")
  const to = searchParams.get("to")
  if (from || to) {
    filters.dateRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    }
  }

  return filters
}

/**
 * Convert filters to URL params
 */
function filtersToUrlParams(filters: ReviewQueueFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.status !== "all") {
    params.set("status", filters.status)
  }
  if (filters.currency !== "all") {
    params.set("currency", filters.currency)
  }
  if (filters.confidence !== "all") {
    params.set("confidence", filters.confidence)
  }
  if (filters.search) {
    params.set("search", filters.search)
  }
  if (filters.dateRange?.from) {
    params.set("from", filters.dateRange.from.toISOString().split("T")[0])
  }
  if (filters.dateRange?.to) {
    params.set("to", filters.dateRange.to.toISOString().split("T")[0])
  }

  return params
}

/**
 * Check if filters have any active values
 */
function hasActiveFilters(filters: ReviewQueueFilters): boolean {
  return (
    filters.status !== "all" ||
    filters.currency !== "all" ||
    filters.confidence !== "all" ||
    filters.search !== "" ||
    filters.dateRange !== undefined
  )
}

/**
 * ReviewQueueFilterBar Component
 *
 * Filter bar for the review queue with:
 * - Status filter (all, pending, matched, waiting, new)
 * - Currency filter (all, USD, THB)
 * - Confidence filter (all, high, medium, low)
 * - Date range picker
 * - Search input (vendor, amount, description)
 * - Clear all button
 */
export function ReviewQueueFilterBar({
  filters,
  onFiltersChange,
  syncWithUrl = true,
  className,
}: ReviewQueueFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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

  // Initialize from URL params on mount
  React.useEffect(() => {
    if (syncWithUrl && searchParams) {
      const urlFilters = parseUrlParams(searchParams)
      if (Object.keys(urlFilters).length > 0) {
        onFiltersChange({ ...defaultFilters, ...urlFilters })
        if (urlFilters.search) {
          setSearchInput(urlFilters.search)
        }
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync filters to URL
  React.useEffect(() => {
    if (syncWithUrl) {
      const params = filtersToUrlParams(filters)
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname
      router.replace(newUrl, { scroll: false })
    }
  }, [filters, pathname, router, syncWithUrl])

  const handleFilterChange = (
    key: keyof ReviewQueueFilters,
    value: FilterStatus | FilterCurrency | FilterConfidence | DateRange | undefined | string
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleClearAll = () => {
    setSearchInput("")
    onFiltersChange(defaultFilters)
  }

  const activeFilterCount = [
    filters.status !== "all",
    filters.currency !== "all",
    filters.confidence !== "all",
    filters.dateRange !== undefined,
    filters.search !== "",
  ].filter(Boolean).length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendor, amount..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={filters.status}
          onValueChange={(value) =>
            handleFilterChange("status", value as FilterStatus)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Currency filter */}
        <Select
          value={filters.currency}
          onValueChange={(value) =>
            handleFilterChange("currency", value as FilterCurrency)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Confidence filter */}
        <Select
          value={filters.confidence}
          onValueChange={(value) =>
            handleFilterChange("confidence", value as FilterConfidence)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            {confidenceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range picker */}
        <DateRangePicker
          date={filters.dateRange}
          onDateChange={(range) => handleFilterChange("dateRange", range)}
          className="w-[260px]"
        />

        {/* Clear all button */}
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

      {/* Active filters summary (mobile/compact view) */}
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

/**
 * Hook to manage review queue filters
 */
export function useReviewQueueFilters(
  initialFilters: Partial<ReviewQueueFilters> = {}
): [ReviewQueueFilters, (filters: ReviewQueueFilters) => void] {
  const [filters, setFilters] = React.useState<ReviewQueueFilters>({
    ...defaultFilters,
    ...initialFilters,
  })

  return [filters, setFilters]
}

export { parseUrlParams, filtersToUrlParams, hasActiveFilters }
