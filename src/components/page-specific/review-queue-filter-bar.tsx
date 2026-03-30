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
import { Search, X, SlidersHorizontal, Mail, FileText, GitMerge, Receipt, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

export type FilterStatus = "all" | "pending" | "approved" | "rejected"
export type FilterCurrency = "all" | "USD" | "THB"
export type FilterConfidence = "all" | "high" | "medium" | "low"
export type FilterSource = "all" | "statement" | "email" | "payment_slip" | "merged"
export type FilterPaymentMethodType = "all" | "credit_card" | "bank_account"
export type FilterDirection = "all" | "income" | "expense"
export type FilterBank = "all" | "kbank" | "bangkok_bank"
export type FilterProcessingStatus = "all" | "pending" | "processing" | "ready_for_review" | "done" | "failed"
export type FilterSortField = "uploaded_at" | "transaction_date" | "amount" | "confidence"
export type FilterSortOrder = "desc" | "asc"

export interface ReviewQueueFilters {
  status: FilterStatus
  currency: FilterCurrency
  confidence: FilterConfidence
  source: FilterSource
  dateRange: DateRange | undefined
  search: string
  statementUploadId: string
  paymentMethodType?: FilterPaymentMethodType
  // Payment slip mode filters
  direction?: FilterDirection
  bank?: FilterBank
  processingStatus?: FilterProcessingStatus
  sortField?: FilterSortField
  sortOrder?: FilterSortOrder
}

export const defaultFilters: ReviewQueueFilters = {
  status: "all",
  currency: "all",
  confidence: "all",
  source: "all",
  dateRange: undefined,
  search: "",
  statementUploadId: "",
  paymentMethodType: "all",
}

export const defaultPaymentSlipFilters: ReviewQueueFilters = {
  status: "all",
  currency: "all",
  confidence: "all",
  source: "all",
  dateRange: undefined,
  search: "",
  statementUploadId: "",
  direction: "all",
  bank: "all",
  processingStatus: "all",
  sortField: "transaction_date",
  sortOrder: "desc",
}

export type FilterBarMode = "review-queue" | "payment-slips"

export interface ReviewQueueFilterBarProps {
  filters: ReviewQueueFilters
  onFiltersChange: (filters: ReviewQueueFilters) => void
  syncWithUrl?: boolean
  className?: string
  mode?: FilterBarMode
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

const directionButtons: Array<{ value: FilterDirection; label: string }> = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
]

const bankOptions: Array<{ value: FilterBank; label: string }> = [
  { value: "all", label: "All Banks" },
  { value: "kbank", label: "KBank" },
  { value: "bangkok_bank", label: "Bangkok Bank" },
]

const processingStatusOptions: Array<{ value: FilterProcessingStatus; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_review", label: "Ready for Review" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
]

const sortFieldOptions: Array<{ value: FilterSortField; label: string }> = [
  { value: "uploaded_at", label: "Upload Date" },
  { value: "transaction_date", label: "Transaction Date" },
  { value: "amount", label: "Amount" },
  { value: "confidence", label: "Confidence" },
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

  const direction = searchParams.get("direction")
  if (direction && ["all", "income", "expense"].includes(direction)) {
    filters.direction = direction as FilterDirection
  }

  const bank = searchParams.get("bank")
  if (bank && ["all", "kbank", "bangkok_bank"].includes(bank)) {
    filters.bank = bank as FilterBank
  }

  const processingStatus = searchParams.get("processingStatus")
  if (processingStatus && ["all", "pending", "processing", "ready_for_review", "done", "failed"].includes(processingStatus)) {
    filters.processingStatus = processingStatus as FilterProcessingStatus
  }

  const sortField = searchParams.get("sortField")
  if (sortField && ["uploaded_at", "transaction_date", "amount", "confidence"].includes(sortField)) {
    filters.sortField = sortField as FilterSortField
  }

  const sortOrder = searchParams.get("sortOrder")
  if (sortOrder && ["asc", "desc"].includes(sortOrder)) {
    filters.sortOrder = sortOrder as FilterSortOrder
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
  if (filters.direction && filters.direction !== "all") params.set("direction", filters.direction)
  if (filters.bank && filters.bank !== "all") params.set("bank", filters.bank)
  if (filters.processingStatus && filters.processingStatus !== "all") params.set("processingStatus", filters.processingStatus)
  if (filters.sortField && filters.sortField !== "uploaded_at") params.set("sortField", filters.sortField)
  if (filters.sortOrder && filters.sortOrder !== "desc") params.set("sortOrder", filters.sortOrder)

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
    (filters.paymentMethodType !== undefined && filters.paymentMethodType !== "all") ||
    (filters.direction !== undefined && filters.direction !== "all") ||
    (filters.bank !== undefined && filters.bank !== "all") ||
    (filters.processingStatus !== undefined && filters.processingStatus !== "all") ||
    (filters.sortField !== undefined && filters.sortField !== "uploaded_at") ||
    (filters.sortOrder !== undefined && filters.sortOrder !== "desc")
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
  mode = "review-queue",
}: ReviewQueueFilterBarProps) {
  const isPaymentSlips = mode === "payment-slips"
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = React.useState(filters.search)
  const [statementOptions, setStatementOptions] = React.useState<StatementOption[]>([])
  const [showMoreFilters, setShowMoreFilters] = React.useState(false)

  // Fetch statement options on mount (review-queue mode only)
  React.useEffect(() => {
    if (isPaymentSlips) return
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
  }, [isPaymentSlips])

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
    value: FilterStatus | FilterCurrency | FilterConfidence | FilterSource | FilterPaymentMethodType | FilterDirection | FilterBank | FilterProcessingStatus | FilterSortField | FilterSortOrder | DateRange | undefined | string
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleClearAll = () => {
    setSearchInput("")
    onFiltersChange(isPaymentSlips ? defaultPaymentSlipFilters : defaultFilters)
  }

  // Check if any secondary filters are active
  const hasActiveSecondary = isPaymentSlips
    ? (
        (filters.processingStatus !== undefined && filters.processingStatus !== "all") ||
        (filters.bank !== undefined && filters.bank !== "all") ||
        filters.status !== "all" ||
        filters.confidence !== "all" ||
        (filters.sortField !== undefined && filters.sortField !== "transaction_date") ||
        (filters.sortOrder !== undefined && filters.sortOrder !== "desc")
      )
    : (
        filters.status !== "all" ||
        filters.currency !== "all" ||
        filters.confidence !== "all" ||
        filters.statementUploadId !== "" ||
        (filters.paymentMethodType !== undefined && filters.paymentMethodType !== "all")
      )

  return (
    <div className={cn("space-y-3", className)}>
      {/* Primary row: Search + Source buttons + Date range */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={isPaymentSlips ? "Search sender, recipient, memo..." : "Search vendor, amount..."}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Direction button group (payment slips mode) */}
        {isPaymentSlips && (
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            {directionButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => handleFilterChange("direction", btn.value)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  filters.direction === btn.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Source button group (review-queue mode) */}
        {!isPaymentSlips && (
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            {sourceButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => handleFilterChange("source", btn.value)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
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
        )}

        {/* Date range picker */}
        <DateRangePicker
          dateRange={filters.dateRange}
          onDateRangeChange={(range: DateRange | undefined) => handleFilterChange("dateRange", range)}
          className="w-[260px]"
        />

        {/* More Filters toggle (hidden in payment-slips mode) */}
        {!isPaymentSlips && (
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
        )}

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

      {/* Secondary row: always visible in payment-slips mode, collapsible otherwise */}
      {(isPaymentSlips || showMoreFilters) && (
        <div className="flex flex-wrap items-center gap-3 pl-1">
          {/* Payment slips mode secondary filters */}
          {isPaymentSlips && (
            <>
              {/* Processing status */}
              <Select
                value={filters.processingStatus || "all"}
                onValueChange={(value) => handleFilterChange("processingStatus", value as FilterProcessingStatus)}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Processing Status" />
                </SelectTrigger>
                <SelectContent>
                  {processingStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Bank filter */}
              <Select
                value={filters.bank || "all"}
                onValueChange={(value) => handleFilterChange("bank", value as FilterBank)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Bank" />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Review status (reuses existing status filter options) */}
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value as FilterStatus)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Review Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
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

              {/* Sort field */}
              <Select
                value={filters.sortField || "uploaded_at"}
                onValueChange={(value) => handleFilterChange("sortField", value as FilterSortField)}
              >
                <SelectTrigger className="w-[175px]">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortFieldOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort order toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleFilterChange("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")
                }
                className="gap-1.5"
                title={filters.sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                {(filters.sortOrder || "desc") === "asc" ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
                {(filters.sortOrder || "desc") === "asc" ? "Asc" : "Desc"}
              </Button>
            </>
          )}

          {/* Review queue mode secondary filters */}
          {!isPaymentSlips && (
            <>
              {/* Status filter */}
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value as FilterStatus)}
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
                onValueChange={(value) => handleFilterChange("currency", value as FilterCurrency)}
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
                onValueChange={(value) => handleFilterChange("confidence", value as FilterConfidence)}
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

              {/* Statement filter */}
              {statementOptions.length > 0 && (
                <Select
                  value={filters.statementUploadId || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("statementUploadId", value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger className="w-[200px]">
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
                <SelectTrigger className="w-[160px]">
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
            </>
          )}
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
