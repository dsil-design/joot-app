"use client"

import * as React from "react"
import { format, parse, isValid, startOfMonth } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarIcon } from "lucide-react"
import { getPresetRange, type DatePresetKey } from "@/lib/utils/date-filters"

interface CustomDateRangeDialogProps {
  initialRange?: DateRange
  onSubmit: (range: DateRange | undefined) => void
  onCancel: () => void
}

/**
 * Parses a date string with multiple format support
 * Supports: "9/1/24", "9/1/2024", "Sep 1 2024", "2024-09-01", etc.
 */
function parseDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim()
  if (!trimmed) return null

  // Try common date formats
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

/**
 * Phase 1 & 2: Enhanced Custom Date Range Dialog
 *
 * Features:
 * - Single-month calendar with showOutsideDays={false}
 * - Editable "From" and "To" text input fields with date parsing
 * - Quick preset buttons (7D, 30D, This Mo, Last Mo, YTD)
 * - Calendar synchronization when user types a date
 * - Clear Selection button below calendar
 * - Submit/Cancel buttons at bottom
 * - Modal width: max-w-md (448px)
 * - Validation: "To" date must be >= "From" date
 */
export function CustomDateRangeDialog({
  initialRange,
  onSubmit,
  onCancel,
}: CustomDateRangeDialogProps) {
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

  // Preset configurations
  const presets: Array<{ key: DatePresetKey; label: string }> = [
    { key: "last-7-days", label: "7D" },
    { key: "last-30-days", label: "30D" },
    { key: "this-month", label: "This Mo" },
    { key: "last-month", label: "Last Mo" },
    { key: "this-year", label: "YTD" },
  ]

  // Handle preset button clicks
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

  // Handle "From" input changes
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

      // Validate: from must be <= to
      if (newRange.to && parsed > newRange.to) {
        setValidationError("From date must be before or equal to To date")
      } else {
        setSelectedRange(newRange)
        setCalendarMonth(startOfMonth(parsed))
        setValidationError("")
      }
    }
  }

  // Handle "To" input changes
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

      // Validate: to must be >= from
      if (newRange.from && parsed < newRange.from) {
        setValidationError("To date must be after or equal to From date")
      } else {
        setSelectedRange(newRange)
        setCalendarMonth(startOfMonth(parsed))
        setValidationError("")
      }
    }
  }

  // Handle "From" input blur - format if valid
  const handleFromInputBlur = () => {
    if (!fromInputValue.trim()) return

    const parsed = parseDate(fromInputValue)
    if (parsed && isValid(parsed)) {
      setFromInputValue(format(parsed, "MM/dd/yyyy"))
    } else {
      // Invalid - revert to last valid value or clear
      if (selectedRange?.from) {
        setFromInputValue(format(selectedRange.from, "MM/dd/yyyy"))
      } else {
        setFromInputValue("")
      }
    }
  }

  // Handle "To" input blur - format if valid
  const handleToInputBlur = () => {
    if (!toInputValue.trim()) return

    const parsed = parseDate(toInputValue)
    if (parsed && isValid(parsed)) {
      setToInputValue(format(parsed, "MM/dd/yyyy"))
    } else {
      // Invalid - revert to last valid value or clear
      if (selectedRange?.to) {
        setToInputValue(format(selectedRange.to, "MM/dd/yyyy"))
      } else {
        setToInputValue("")
      }
    }
  }

  // Handle calendar icon clicks - focus calendar on that field's date
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

  // Handle calendar selection
  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range) {
      setSelectedRange(undefined)
      setFromInputValue("")
      setToInputValue("")
      setValidationError("")
      return
    }

    // Validate range
    if (range.from && range.to && range.from > range.to) {
      setValidationError("From date must be before or equal to To date")
      return
    }

    setSelectedRange(range)
    setFromInputValue(range.from ? format(range.from, "MM/dd/yyyy") : "")
    setToInputValue(range.to ? format(range.to, "MM/dd/yyyy") : "")
    setValidationError("")
  }

  // Handle clear selection
  const handleClear = () => {
    setSelectedRange(undefined)
    setFromInputValue("")
    setToInputValue("")
    setValidationError("")
  }

  // Handle submit - only enabled if valid range exists
  const handleSubmit = () => {
    if (selectedRange?.from && selectedRange?.to && !validationError) {
      onSubmit(selectedRange)
    }
  }

  // Check if Apply Filter button should be enabled
  const isSubmitEnabled = Boolean(
    selectedRange?.from &&
    selectedRange?.to &&
    !validationError
  )

  return (
    <div className="flex flex-col gap-4">
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
          <label className="text-xs font-medium text-zinc-700">
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              aria-label="Focus calendar on From date"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* To Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-700">
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              aria-label="Focus calendar on To date"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <p className="text-xs text-red-600" role="alert">
          {validationError}
        </p>
      )}

      {/* Single-Month Calendar */}
      <div className="flex justify-center py-2">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleCalendarSelect}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          numberOfMonths={1}
          showOutsideDays={false}
          className="rounded-md border"
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
      <p className="text-xs text-zinc-500 -mt-2">
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
