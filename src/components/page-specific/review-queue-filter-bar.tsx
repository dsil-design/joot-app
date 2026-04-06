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
import { DateRangePickerTrigger } from "@/components/ui/date-range-dialog"
import { Search, X, SlidersHorizontal, Mail, FileText, GitMerge, Receipt } from "lucide-react"
import type { DateRange } from "react-day-picker"

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

const sourceButtons: Array<{ value: FilterSource; label: string; icon?: React.ReactNode }> = [
  { value: "all", label: "All" },
  { value: "email", label: "Email", icon: <Mail className="h-3 w-3" /> },
  { value: "statement", label: "Statement", icon: <FileText className="h-3 w-3" /> },
  { value: "payment_slip", label: "Slip", icon: <Receipt className="h-3 w-3" /> },
  { value: "merged", label: "Cross-Source", icon: <GitMerge className="h-3 w-3" /> },
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
  if (filters.dateRange?.from) {
    const d = filters.dateRange.from
    params.set("from", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  if (filters.dateRange?.to) {
    const d = filters.dateRange.to
    params.set("to", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
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
    filters.dateRange !== undefined ||
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
        onFiltersChange({ ...defaultFilters, ...urlFilters })
        if (urlFilters.search) setSearchInput(urlFilters.search)
        // Auto-expand secondary row if secondary filters are active
        if (
          urlFilters.status !== undefined ||
          urlFilters.currency !== undefined ||
          urlFilters.confidence !== undefined ||
          urlFilters.paymentMethodType !== undefined ||
          urlFilters.statementUploadId !== undefined
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
    onFiltersChange(defaultFilters)
  }

  const hasActiveSecondary =
    filters.status !== "all" ||
    filters.currency !== "all" ||
    filters.confidence !== "all" ||
    filters.statementUploadId !== "" ||
    (filters.paymentMethodType !== undefined && filters.paymentMethodType !== "all")

  return (
    <div className={cn("space-y-3", className)}>
      {/* Primary row: Search + Source buttons + Date range */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendor, amount..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Source button group */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 overflow-x-auto">
          {sourceButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => handleFilterChange("source", btn.value)}
              className={cn(
                "flex items-center gap-1 px-3 py-2.5 sm:py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                filters.source === btn.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>

        {/* Date range picker */}
        <DateRangePickerTrigger
          dateRange={filters.dateRange}
          onDateRangeChange={(range: DateRange | undefined) => handleFilterChange("dateRange", range)}
        />

        {/* More Filters toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={cn(
            "relative",
            hasActiveSecondary && "border-amber-300"
          )}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          More Filters
          {hasActiveSecondary && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
          )}
        </Button>

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

      {/* Secondary row */}
      {showMoreFilters && (
        <div className="flex flex-wrap items-center gap-3 pl-1">
          {/* Status filter */}
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value as FilterStatus)}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
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

          {/* Confidence filter */}
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

          {/* Statement filter */}
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

          {/* Payment method type filter */}
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
    return { ...defaultFilters, ...initialFilters, ...urlFilters }
  })

  return [filters, setFilters]
}

export { parseUrlParams, filtersToUrlParams, hasActiveFilters }
