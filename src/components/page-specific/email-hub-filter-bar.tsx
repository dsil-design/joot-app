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
import { Search, X, Filter, Play, ArrowUpDown } from "lucide-react"
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
import {
  type DatePresetKey,
  PRESET_LABELS,
  getPresetRange,
  detectPreset,
} from "@/lib/utils/date-filters"

interface EmailHubFilterBarProps {
  filters: EmailHubFilters
  onFiltersChange: (filters: EmailHubFilters) => void
  onSortToggle: () => void
  totalMatches?: number | null
  className?: string
}

const statusOptions: Array<{ value: EmailHubStatus; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "unprocessed", label: "Unprocessed" },
  { value: "pending_review", label: "Pending Review" },
  { value: "matched", label: "Linked" },
  { value: "waiting_for_statement", label: "Waiting (Statement)" },
  { value: "waiting_for_email", label: "Waiting (Email)" },
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

const DATE_PRESET_TOGGLES: Array<{ value: DatePresetKey; label: string }> = [
  { value: "all-time", label: PRESET_LABELS["all-time"] },
  { value: "this-month", label: PRESET_LABELS["this-month"] },
  { value: "last-month", label: PRESET_LABELS["last-month"] },
  { value: "last-30-days", label: PRESET_LABELS["last-30-days"] },
  { value: "this-year", label: PRESET_LABELS["this-year"] },
  { value: "last-year", label: PRESET_LABELS["last-year"] },
]

/** Check if two filter objects differ (excluding dateRange which uses deep compare) */
function filtersChanged(a: EmailHubFilters, b: EmailHubFilters): boolean {
  return (
    a.status !== b.status ||
    a.classification !== b.classification ||
    a.currency !== b.currency ||
    a.confidence !== b.confidence ||
    a.search !== b.search ||
    a.sort !== b.sort ||
    a.dateRange?.from?.getTime() !== b.dateRange?.from?.getTime() ||
    a.dateRange?.to?.getTime() !== b.dateRange?.to?.getTime()
  )
}

export function EmailHubFilterBar({
  filters,
  onFiltersChange,
  onSortToggle,
  totalMatches,
  className,
}: EmailHubFilterBarProps) {
  // Draft state — changes don't take effect until Apply
  const [draft, setDraft] = React.useState<EmailHubFilters>(filters)

  // Sync draft when filters change externally (e.g. stat card click)
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
    const cleared = defaultEmailHubFilters
    setDraft(cleared)
    onFiltersChange(cleared)
  }

  const activeFilterCount = [
    filters.status !== "all",
    filters.classification !== "all",
    filters.currency !== "all",
    filters.confidence !== "all",
    filters.dateRange !== undefined,
    filters.search !== "",
  ].filter(Boolean).length

  const activePreset = detectPreset(draft.dateRange)

  return (
    <div className={cn("space-y-4", className)} onKeyDown={handleKeyDown}>
      {/* Main filters row */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendor, subject, ID..."
            value={draft.search}
            onChange={(e) => {
              const value = e.target.value
              const trimmed = value.trim()
              const fullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
              const partialUuid = /^[0-9a-f]{8,}$/i
              if (fullUuid.test(trimmed) || partialUuid.test(trimmed)) {
                // ID search: clear date filter so the result isn't hidden
                setDraft({ ...draft, search: value, dateRange: undefined })
              } else {
                setDraft({ ...draft, search: value })
              }
            }}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={draft.status}
          onValueChange={(value) => setDraft({ ...draft, status: value as EmailHubStatus })}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
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
          value={draft.classification}
          onValueChange={(value) => setDraft({ ...draft, classification: value as EmailHubClassification })}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {classificationOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>


        {/* Confidence */}
        <Select
          value={draft.confidence}
          onValueChange={(value) => setDraft({ ...draft, confidence: value as EmailHubConfidence })}
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

      {/* Date section */}
      <div className="border-t pt-4 flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {DATE_PRESET_TOGGLES.map((preset) => (
          <Button
            key={preset.value}
            variant={activePreset === preset.value ? "default" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => {
              const range = getPresetRange(preset.value)
              setDraft({ ...draft, dateRange: range })
            }}
          >
            {preset.label}
          </Button>
        ))}
        <DateRangePickerTrigger
          dateRange={draft.dateRange}
          onDateRangeChange={(range: DateRange | undefined) => setDraft({ ...draft, dateRange: range })}
          placeholder="Custom range..."
        />
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!isDirty}
          >
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
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
              {totalMatches != null && `, ${totalMatches.toLocaleString()} match${totalMatches !== 1 ? "es" : ""}`}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onSortToggle}
          className="sm:ml-auto text-muted-foreground hover:text-foreground"
        >
          <ArrowUpDown className="h-4 w-4 mr-1.5" />
          {filters.sort === "email_date_asc" ? "Oldest First" : "Newest First"}
        </Button>
      </div>
    </div>
  )
}
