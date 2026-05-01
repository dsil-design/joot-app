"use client"

import * as React from "react"
import { format, parse, isValid, startOfMonth } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarIcon } from "lucide-react"
import { getPresetRange, type DatePresetKey } from "@/lib/utils/date-filters"

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [breakpoint])
  return isMobile
}

/**
 * Parses a date string with multiple format support
 * Supports: "9/1/24", "9/1/2024", "Sep 1 2024", "2024-09-01", etc.
 */
function parseDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim()
  if (!trimmed) return null

  const formats = [
    "M/d/yyyy",
    "M/d/yy",
    "MM/dd/yyyy",
    "MM/dd/yy",
    "MMM d yyyy",
    "MMM d, yyyy",
    "MMMM d, yyyy",
    "yyyy-MM-dd",
    "M-d-yyyy",
    "M-d-yy",
  ]

  for (const formatStr of formats) {
    try {
      const parsed = parse(trimmed, formatStr, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    } catch {
      continue
    }
  }

  return null
}

// --- DateRangeDialogContent (the inner form) ---

interface DateRangeDialogContentProps {
  initialRange?: DateRange
  onSubmit: (range: DateRange | undefined) => void
  onCancel: () => void
}

export function DateRangeDialogContent({
  initialRange,
  onSubmit,
  onCancel,
}: DateRangeDialogContentProps) {
  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(initialRange)
  const [fromInputValue, setFromInputValue] = React.useState(() =>
    initialRange?.from ? format(initialRange.from, "MM/dd/yyyy") : ""
  )
  const [toInputValue, setToInputValue] = React.useState(() =>
    initialRange?.to ? format(initialRange.to, "MM/dd/yyyy") : ""
  )
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(() =>
    initialRange?.from || new Date()
  )
  const [validationError, setValidationError] = React.useState<string>("")
  const isMobile = useIsMobile()

  const presets: Array<{ key: DatePresetKey; label: string }> = [
    { key: "last-7-days", label: "7D" },
    { key: "last-30-days", label: "30D" },
    { key: "this-month", label: "This Mo" },
    { key: "last-month", label: "Last Mo" },
    { key: "this-year", label: "YTD" },
  ]

  const handlePresetClick = (presetKey: DatePresetKey) => {
    const range = getPresetRange(presetKey)
    if (range) {
      setSelectedRange(range)
      setFromInputValue(range.from ? format(range.from, "MM/dd/yyyy") : "")
      setToInputValue(range.to ? format(range.to, "MM/dd/yyyy") : "")
      if (range.from) {
        setCalendarMonth(startOfMonth(range.from))
      }
      setValidationError("")
    }
  }

  const handleFromInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFromInputValue(value)

    if (!value.trim()) {
      setSelectedRange(prev => ({ from: undefined, to: prev?.to }))
      setValidationError("")
      return
    }

    const parsed = parseDate(value)
    if (parsed && isValid(parsed)) {
      const newRange = { from: parsed, to: selectedRange?.to }
      if (newRange.to && parsed > newRange.to) {
        setValidationError("From date must be before or equal to To date")
      } else {
        setSelectedRange(newRange)
        setCalendarMonth(startOfMonth(parsed))
        setValidationError("")
      }
    }
  }

  const handleToInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setToInputValue(value)

    if (!value.trim()) {
      setSelectedRange(prev => ({ from: prev?.from, to: undefined }))
      setValidationError("")
      return
    }

    const parsed = parseDate(value)
    if (parsed && isValid(parsed)) {
      const newRange = { from: selectedRange?.from, to: parsed }
      if (newRange.from && parsed < newRange.from) {
        setValidationError("To date must be after or equal to From date")
      } else {
        setSelectedRange(newRange)
        setCalendarMonth(startOfMonth(parsed))
        setValidationError("")
      }
    }
  }

  const handleFromInputBlur = () => {
    if (!fromInputValue.trim()) return
    const parsed = parseDate(fromInputValue)
    if (parsed && isValid(parsed)) {
      setFromInputValue(format(parsed, "MM/dd/yyyy"))
    } else {
      if (selectedRange?.from) {
        setFromInputValue(format(selectedRange.from, "MM/dd/yyyy"))
      } else {
        setFromInputValue("")
      }
    }
  }

  const handleToInputBlur = () => {
    if (!toInputValue.trim()) return
    const parsed = parseDate(toInputValue)
    if (parsed && isValid(parsed)) {
      setToInputValue(format(parsed, "MM/dd/yyyy"))
    } else {
      if (selectedRange?.to) {
        setToInputValue(format(selectedRange.to, "MM/dd/yyyy"))
      } else {
        setToInputValue("")
      }
    }
  }

  const handleFromCalendarClick = () => {
    if (selectedRange?.from) {
      setCalendarMonth(startOfMonth(selectedRange.from))
    }
  }

  const handleToCalendarClick = () => {
    if (selectedRange?.to) {
      setCalendarMonth(startOfMonth(selectedRange.to))
    }
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range) {
      setSelectedRange(undefined)
      setFromInputValue("")
      setToInputValue("")
      setValidationError("")
      return
    }

    if (range.from && range.to && range.from > range.to) {
      setValidationError("From date must be before or equal to To date")
      return
    }

    setSelectedRange(range)
    setFromInputValue(range.from ? format(range.from, "MM/dd/yyyy") : "")
    setToInputValue(range.to ? format(range.to, "MM/dd/yyyy") : "")
    setValidationError("")
  }

  const handleClear = () => {
    setSelectedRange(undefined)
    setFromInputValue("")
    setToInputValue("")
    setValidationError("")
  }

  const handleSubmit = () => {
    if (selectedRange?.from && selectedRange?.to && !validationError) {
      onSubmit(selectedRange)
    }
  }

  const isSubmitEnabled = Boolean(
    selectedRange?.from &&
    selectedRange?.to &&
    !validationError
  )

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick(key)}
            className="h-8 px-3 text-xs font-medium"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Editable Date Input Fields */}
      <div className="grid grid-cols-2 gap-3">
        {/* From Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            From
          </label>
          <div className="relative">
            <Input
              type="text"
              value={fromInputValue}
              onChange={handleFromInputChange}
              onBlur={handleFromInputBlur}
              placeholder="MM/DD/YYYY"
              className="pr-9 text-sm"
              aria-label="From date"
              aria-invalid={!!validationError}
            />
            <button
              type="button"
              onClick={handleFromCalendarClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
              aria-label="Focus calendar on From date"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* To Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            To
          </label>
          <div className="relative">
            <Input
              type="text"
              value={toInputValue}
              onChange={handleToInputChange}
              onBlur={handleToInputBlur}
              placeholder="MM/DD/YYYY"
              className="pr-9 text-sm"
              aria-label="To date"
              aria-invalid={!!validationError}
            />
            <button
              type="button"
              onClick={handleToCalendarClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
              aria-label="Focus calendar on To date"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {validationError}
        </p>
      )}

      {/* Calendar - single month on mobile, dual on desktop */}
      <div className="flex justify-center py-2 overflow-x-auto">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleCalendarSelect}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          numberOfMonths={isMobile ? 1 : 2}
          fixedWeeks
          showOutsideDays={false}
          className="rounded-md border"
          classNames={{ months: "flex flex-row gap-4 relative" }}
        />
      </div>

      {/* Clear Selection Button */}
      {selectedRange?.from && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          className="w-full"
          aria-label="Clear date selection"
        >
          Clear Selection
        </Button>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground -mt-2">
        {selectedRange?.from && selectedRange?.to
          ? "Click Apply Filter to confirm your selection"
          : "Select a start date and end date, or use a quick preset above"}
      </p>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isSubmitEnabled}
        >
          Apply Filter
        </Button>
      </div>
    </div>
  )
}

// --- DateRangePickerTrigger (trigger button + dialog wrapper) ---

interface DateRangePickerTriggerProps {
  dateRange?: DateRange
  onDateRangeChange: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  dialogTitle?: string
}

export function DateRangePickerTrigger({
  dateRange,
  onDateRangeChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
  dialogTitle = "Select Date Range",
}: DateRangePickerTriggerProps) {
  const [open, setOpen] = React.useState(false)

  const displayText = React.useMemo(() => {
    if (!dateRange?.from) return null
    if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "MMM d, yyyy")
    }
    return `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
  }, [dateRange])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={className}
        >
          <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
          <span className={displayText ? "text-foreground" : "text-muted-foreground"}>
            {displayText || placeholder}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-fit">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-foreground">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <DateRangeDialogContent
          initialRange={dateRange}
          onSubmit={(range) => {
            onDateRangeChange(range)
            setOpen(false)
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
