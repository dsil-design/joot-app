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
import { MonthStepperFilter } from "@/components/ui/month-stepper-filter"
import { Search, X, SlidersHorizontal } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { getMonthRange, isCurrentMonthRange } from "@/lib/utils/date-filters"

export type FilterStatus = "all" | "pending" | "approved" | "rejected"
export type FilterCurrency = "all" | "USD" | "THB"
export type FilterConfidence = "all" | "high" | "medium" | "low"
export type FilterSource = "all" | "statement" | "email" | "payment_slip" | "merged"
export type FilterPaymentMethodType = "all" | "credit_card" | "bank_account"

export interface ReviewQueueFilters {
  status: FilterStatus
  currency: FilterCurrency
  confidence: FilterConfidence
  source: FilterSource
  dateRange: DateRange | undefined
  search: string
  statementUploadId: string
  paymentMethodType?: FilterPaymentMethodType
}

export const defaultFilters: ReviewQueueFilters = {
  status: "pending",
  currency: "all",
  confidence: "all",
  source: "all",
  dateRange: undefined,
  search: "",
  statementUploadId: "",
  paymentMethodType: "all",
}

export interface ReviewQueueFilterBarProps {
  filters: ReviewQueueFilters
  onFiltersChange: (filters: ReviewQueueFilters) => void
  syncWithUrl?: boolean
  className?: string
}

const statusOptions: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

const currencyOptions: Array<{ value: FilterCurrency; label: string }> = [
  { value: "all", label: "All Currencies" },
  { value: "USD", label: "USD" },
  { value: "THB", label: "THB" },
]

const confidenceOptions: Array<{ value: FilterConfidence; label: string }> = [
  { value: "all", label: "All Confidence" },
  { value: "high", label: "High (90%+)" },
  { value: "medium", label: "Medium (55-89%)" },
  { value: "low", label: "Low (<55%)" },
]

const paymentMethodTypeOptions: Array<{ value: FilterPaymentMethodType; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "credit_card", label: "Credit Card" },
  { value: "bank_account", label: "Bank Account" },
]

// Primary source filter — mutually exclusive. "Cross-Source" lives in the
// expanded panel as a separate toggle since it's a niche power-user filter.
const sourceButtons: Array<{ value: FilterSource; label: string }> = [
  { value: "all", label: "All" },
  { value: "email", label: "Email" },
  { value: "statement", label: "Statement" },
  { value: "payment_slip", label: "Slip" },
]

function parseUrlParams(searchParams: URLSearchParams): Partial<ReviewQueueFilters> {
  const filters: Partial<ReviewQueueFilters> = {}

  const status = searchParams.get("status")
  if (status && ["all", "pending", "approved", "rejected"].includes(status)) {
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

  const source = searchParams.get("source")
  if (source && ["all", "statement", "email", "payment_slip", "merged"].includes(source)) {
    filters.source = source as FilterSource
  }

  const search = searchParams.get("search")
  if (search) filters.search = search

  const from = searchParams.get("from")
  const to = searchParams.get("to")
  if (from || to) {
    filters.dateRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    }
  }

  const statementUploadId = searchParams.get("statementUploadId")
  if (statementUploadId) filters.statementUploadId = statementUploadId

  const paymentMethodType = searchParams.get("paymentMethodType")
  if (paymentMethodType && ["all", "credit_card", "bank_account"].includes(paymentMethodType)) {
    filters.paymentMethodType = paymentMethodType as FilterPaymentMethodType
  }

  return filters
}

function filtersToUrlParams(filters: ReviewQueueFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.currency !== "all") params.set("currency", filters.currency)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)
  if (filters.source !== "all") params.set("source", filters.source)
  if (filters.search) params.set("search", filters.search)
  // Skip serializing the date range when it equals the current calendar month —
  // that's the default view, so we keep the URL clean.
  if (filters.dateRange && !isCurrentMonthRange(filters.dateRange)) {
    if (filters.dateRange.from) {
      const d = filters.dateRange.from
      params.set("from", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
    }
    if (filters.dateRange.to) {
      const d = filters.dateRange.to
      params.set("to", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
    }
  }
  if (filters.statementUploadId) params.set("statementUploadId", filters.statementUploadId)
  if (filters.paymentMethodType && filters.paymentMethodType !== "all") {
    params.set("paymentMethodType", filters.paymentMethodType)
  }

  return params
}

function hasActiveFilters(filters: ReviewQueueFilters): boolean {
  return (
    filters.status !== "all" ||
    filters.currency !== "all" ||
    filters.confidence !== "all" ||
    filters.source !== "all" ||
    filters.search !== "" ||
    (filters.dateRange !== undefined && !isCurrentMonthRange(filters.dateRange)) ||
    filters.statementUploadId !== "" ||
    (filters.paymentMethodType !== undefined && filters.paymentMethodType !== "all")
  )
}

interface StatementOption {
  id: string
  label: string
}

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
  const [statementOptions, setStatementOptions] = React.useState<StatementOption[]>([])
  const [showMoreFilters, setShowMoreFilters] = React.useState(false)

  // Fetch statement options on mount
  React.useEffect(() => {
    const loadStatements = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data } = await supabase
          .from("statement_uploads")
          .select(`
            id,
            filename,
            statement_period_start,
            statement_period_end,
            payment_methods (name)
          `)
          .in("status", ["ready_for_review", "in_review", "done"])
          .order("extraction_completed_at", { ascending: false })
          .limit(50)

        if (data) {
          setStatementOptions(
            data.map((s: {
              id: string
              filename: string
              statement_period_start: string | null
              statement_period_end: string | null
              payment_methods: { name: string } | null
            }) => {
              const pmName = (s.payment_methods as { name: string } | null)?.name
              const period = s.statement_period_start
                ? new Date(s.statement_period_start).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : null
              const label = [pmName, period].filter(Boolean).join(" — ") || s.filename
              return { id: s.id, label }
            })
          )
        }
      } catch {
        // Silently fail
      }
    }
    loadStatements()
  }, [])

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
        const dateRange = urlFilters.dateRange ?? getMonthRange()
        onFiltersChange({ ...defaultFilters, ...urlFilters, dateRange })
        if (urlFilters.search) setSearchInput(urlFilters.search)
        // Auto-expand secondary row if secondary filters are active
        // (Status is in the primary row, so it's not counted here.)
        if (
          urlFilters.currency !== undefined ||
          urlFilters.confidence !== undefined ||
          urlFilters.paymentMethodType !== undefined ||
          urlFilters.statementUploadId !== undefined ||
          urlFilters.source === "merged"
        ) {
          setShowMoreFilters(true)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync filters to URL
  React.useEffect(() => {
    if (syncWithUrl) {
      const params = filtersToUrlParams(filters)
      const newUrl = params.toString()
        ? `${pathname ?? ''}?${params.toString()}`
        : (pathname ?? '')
      router.replace(newUrl, { scroll: false })
    }
  }, [filters, pathname, router, syncWithUrl])

  const handleFilterChange = (
    key: keyof ReviewQueueFilters,
    value: FilterStatus | FilterCurrency | FilterConfidence | FilterSource | FilterPaymentMethodType | DateRange | undefined | string
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleClearAll = () => {
    setSearchInput("")
    onFiltersChange({ ...defaultFilters, dateRange: getMonthRange() })
  }

  // Secondary filters that live in the expanded "More Filters" panel.
  // Note: Status is now promoted to the primary row, so it's NOT counted here.
  const secondaryFilterCount =
    (filters.currency !== "all" ? 1 : 0) +
    (filters.confidence !== "all" ? 1 : 0) +
    (filters.statementUploadId !== "" ? 1 : 0) +
    (filters.paymentMethodType !== undefined && filters.paymentMethodType !== "all" ? 1 : 0) +
    (filters.source === "merged" ? 1 : 0)

  // Show "Reset" only when something has been changed away from the defaults
  // (status="pending" is the default, so it should not count).
  const showReset =
    filters.status !== defaultFilters.status ||
    filters.currency !== "all" ||
    filters.confidence !== "all" ||
    filters.source !== "all" ||
    filters.search !== "" ||
    (filters.dateRange !== undefined && !isCurrentMonthRange(filters.dateRange)) ||
    filters.statementUploadId !== "" ||
    (filters.paymentMethodType !== undefined && filters.paymentMethodType !== "all")

  const isCrossSourceOnly = filters.source === "merged"

  return (
    <div className={cn("space-y-3", className)}>
      {/* Row A — date navigation */}
      <div className="pb-3 border-b">
        <MonthStepperFilter
          dateRange={filters.dateRange}
          onDateRangeChange={(range: DateRange | undefined) => handleFilterChange("dateRange", range)}
        />
      </div>

      {/* Row B — search, source, status, actions */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendor, amount..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Source segmented control */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 h-10 overflow-x-auto shrink-0">
          {sourceButtons.map((btn) => (
            <button
              key={btn.value}
              type="button"
              onClick={() => handleFilterChange("source", btn.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                filters.source === btn.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Status select — promoted from secondary row */}
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value as FilterStatus)}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-10 shrink-0">
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

        {/* Spacer pushes actions to the right on desktop */}
        <div className="hidden sm:block sm:flex-1" />

        {/* More Filters toggle */}
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

        {/* Reset button */}
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
          {/* Group 1: data shape */}
          <Select
            value={filters.currency}
            onValueChange={(value) => handleFilterChange("currency", value as FilterCurrency)}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
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

          <Select
            value={filters.paymentMethodType || "all"}
            onValueChange={(value) =>
              handleFilterChange("paymentMethodType", value as FilterPaymentMethodType)
            }
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Payment Type" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Divider between filter groups */}
          <div className="hidden sm:block h-6 w-px bg-border" />

          {/* Group 2: review quality */}
          <Select
            value={filters.confidence}
            onValueChange={(value) => handleFilterChange("confidence", value as FilterConfidence)}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
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

          {statementOptions.length > 0 && (
            <Select
              value={filters.statementUploadId || "all"}
              onValueChange={(value) =>
                handleFilterChange("statementUploadId", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Statements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statements</SelectItem>
                {statementOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Cross-source toggle — niche power-user filter */}
          <button
            type="button"
            onClick={() =>
              handleFilterChange("source", isCrossSourceOnly ? "all" : "merged")
            }
            className={cn(
              "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
              isCrossSourceOnly
                ? "border-foreground/40 bg-foreground/5 text-foreground"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Cross-source only
          </button>
        </div>
      )}
    </div>
  )
}

export function useReviewQueueFilters(
  initialFilters: Partial<ReviewQueueFilters> = {}
): [ReviewQueueFilters, (filters: ReviewQueueFilters) => void] {
  const searchParams = useSearchParams()

  const [filters, setFilters] = React.useState<ReviewQueueFilters>(() => {
    const urlFilters = searchParams ? parseUrlParams(searchParams) : {}
    // Default to the current calendar month when no date range is in the URL.
    const dateRange = urlFilters.dateRange ?? initialFilters.dateRange ?? getMonthRange()
    return { ...defaultFilters, ...initialFilters, ...urlFilters, dateRange }
  })

  return [filters, setFilters]
}

export { parseUrlParams, filtersToUrlParams, hasActiveFilters }
