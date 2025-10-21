"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
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
 * DateRangePicker - A flexible date picker that supports both single date and date range selection
 *
 * - Click once to select a single date
 * - Click twice to select a date range
 * - Clear button to reset selection
 */
export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Pick a date or range",
  disabled = false,
  className,
  label,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (range: DateRange | undefined) => {
    onDateRangeChange?.(range)

    // If both from and to are selected (complete range), close the popover
    // For single date, user needs to click outside or press escape
    if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
      setOpen(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateRangeChange?.(undefined)
  }

  const formatDateRange = () => {
    if (!dateRange?.from) return null

    // Single date selection
    if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "MMM d, yyyy")
    }

    // Date range selection
    return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
  }

  const displayText = formatDateRange()

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            aria-label={label || "Select date or date range"}
            className={cn(
              "w-full justify-start text-left font-normal bg-white",
              !displayText && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={1}
            disabled={disabled}
          />
          {displayText && (
            <div className="border-t p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="w-full"
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
