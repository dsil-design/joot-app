"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"

export interface DateRangePickerProps {
  /** The selected date or date range */
  dateRange?: DateRange
  /** Callback when date or range changes */
  onDateRangeChange?: (range: DateRange | undefined) => void
  /** Placeholder text when no date is selected */
  placeholder?: string
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Label for accessibility */
  label?: string
}

/**
 * Parses a date string with multiple format support
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
 * Parses a date range string (e.g., "1/15/24 - 2/20/24")
 */
function parseDateRangeString(value: string): DateRange | undefined {
  const trimmed = value.trim()

  // Check if it contains a separator (-, to, etc.)
  const separators = [" - ", " to ", " – ", " — "]
  let separator: string | null = null

  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      separator = sep
      break
    }
  }

  if (separator) {
    // Range format
    const parts = trimmed.split(separator)
    if (parts.length === 2) {
      const fromDate = parseDate(parts[0])
      const toDate = parseDate(parts[1])

      if (fromDate && toDate) {
        return { from: fromDate, to: toDate }
      } else if (fromDate) {
        // Only start date is valid
        return { from: fromDate, to: undefined }
      }
    }
  } else {
    // Single date format
    const date = parseDate(trimmed)
    if (date) {
      return { from: date, to: undefined }
    }
  }

  return undefined
}

/**
 * Formats a DateRange for display in the input
 */
function formatDateRangeForInput(dateRange: DateRange | undefined): string {
  if (!dateRange?.from) return ""

  // Single date selection
  if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
    return format(dateRange.from, "M/d/yyyy")
  }

  // Date range selection
  return `${format(dateRange.from, "M/d/yyyy")} - ${format(dateRange.to, "M/d/yyyy")}`
}

/**
 * DateRangePicker - A flexible date picker that supports both manual text input and calendar selection
 *
 * - Type dates manually in formats like: 1/15/24, Jan 15, 2024, etc.
 * - Type ranges like: 1/15/24 - 2/20/24
 * - Click calendar icon to use visual date picker
 * - Smart cursor positioning based on click location
 */
export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Type or pick a date",
  disabled = false,
  className,
  label,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(() => formatDateRangeForInput(dateRange))
  const [isEditing, setIsEditing] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Sync input value with dateRange prop when not editing
  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(formatDateRangeForInput(dateRange))
    }
  }, [dateRange, isEditing])

  const handleSelect = (range: DateRange | undefined) => {
    onDateRangeChange?.(range)
    setIsEditing(false)

    // If both from and to are selected (complete range), close the popover
    if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
      setOpen(false)
    }
  }

  const handleClear = () => {
    onDateRangeChange?.(undefined)
    setInputValue("")
    setIsEditing(false)
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsEditing(true)

    // Clear selection if input is empty
    if (!value.trim()) {
      onDateRangeChange?.(undefined)
    }
  }

  const handleInputBlur = () => {
    setIsEditing(false)

    // Try to parse the input value
    const parsed = parseDateRangeString(inputValue)
    if (parsed) {
      onDateRangeChange?.(parsed)
      // Format the successfully parsed value
      setInputValue(formatDateRangeForInput(parsed))
    } else if (!inputValue.trim()) {
      // Clear if empty
      onDateRangeChange?.(undefined)
      setInputValue("")
    } else {
      // Invalid input - revert to last valid date or clear
      if (dateRange) {
        setInputValue(formatDateRangeForInput(dateRange))
      } else {
        setInputValue("")
      }
    }
  }

  const handleInputFocus = () => {
    setIsEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Open calendar on down arrow
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault()
      setOpen(true)
    }
    // Clear on Escape
    else if (e.key === "Escape") {
      if (inputValue) {
        e.preventDefault()
        handleClear()
      }
    }
    // Parse on Enter
    else if (e.key === "Enter") {
      e.currentTarget.blur()
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label || "Enter date or date range"}
          className={cn(
            "pr-20 bg-white",
            !inputValue && "text-muted-foreground"
          )}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClear}
              disabled={disabled}
              aria-label="Clear date"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
              <Button
                ref={buttonRef}
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={disabled}
                aria-label="Open calendar"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpen(!open)
                }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                }}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverAnchor>
            <PopoverContent
              className="w-auto p-0"
              align="end"
              onOpenAutoFocus={(e) => {
                // Prevent the popover from stealing focus from parent dialog
                e.preventDefault()
              }}
              onPointerDownOutside={(e) => {
                // Don't close if clicking within the dialog that contains this picker or on the trigger button
                const target = e.target as HTMLElement
                if (target.closest('[data-slot="dialog-content"]') ||
                    target === buttonRef.current ||
                    buttonRef.current?.contains(target)) {
                  e.preventDefault()
                }
              }}
              onInteractOutside={(e) => {
                // Don't close if clicking within the dialog that contains this picker or on the trigger button
                const target = e.target as HTMLElement
                if (target.closest('[data-slot="dialog-content"]') ||
                    target === buttonRef.current ||
                    buttonRef.current?.contains(target)) {
                  e.preventDefault()
                }
              }}
            >
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleSelect}
                numberOfMonths={1}
                disabled={disabled}
              />
              {dateRange?.from && (
                <div className="border-t p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleClear()
                      setOpen(false)
                    }}
                    className="w-full"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
