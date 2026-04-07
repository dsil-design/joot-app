"use client"

import * as React from "react"
import {
  startOfMonth,
  addMonths,
  subMonths,
  format,
  isSameDay,
} from "date-fns"
import type { DateRange } from "react-day-picker"
import { ChevronLeft, ChevronRight, CalendarIcon, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateRangeDialogContent } from "@/components/ui/date-range-dialog"
import {
  detectMonthAnchor,
  getMonthRange,
  getPresetRange,
  type DatePresetKey,
} from "@/lib/utils/date-filters"
import { cn } from "@/lib/utils"

const SECONDARY_PRESETS: Array<{ key: DatePresetKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This Week" },
  { key: "this-year", label: "Year to Date" },
  { key: "all-time", label: "All Time" },
]

interface MonthStepperFilterProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  className?: string
}

/**
 * Date filter built around a month stepper. Primary control is left/right
 * chevrons that step the date range by full calendar months. Secondary preset
 * chips (Today / This Week / YTD) and a custom range picker are available;
 * when one is active, the chevrons dim and a reset (X) snaps back to the
 * current month.
 */
export function MonthStepperFilter({
  dateRange,
  onDateRangeChange,
  className,
}: MonthStepperFilterProps) {
  const [customOpen, setCustomOpen] = React.useState(false)

  const currentMonthAnchor = React.useMemo(() => startOfMonth(new Date()), [])
  const monthAnchor = detectMonthAnchor(dateRange)
  const isMonthMode = monthAnchor !== null

  const activePreset: DatePresetKey | null = React.useMemo(() => {
    // "All Time" is represented by dateRange === undefined
    if (!dateRange) return "all-time"
    if (!dateRange.from || !dateRange.to) return null
    for (const { key } of SECONDARY_PRESETS) {
      if (key === "all-time") continue
      const r = getPresetRange(key)
      if (
        r?.from &&
        r?.to &&
        isSameDay(r.from, dateRange.from) &&
        isSameDay(r.to, dateRange.to)
      ) {
        return key
      }
    }
    return null
  }, [dateRange])

  const isCustomActive = !isMonthMode && !activePreset && !!dateRange?.from

  const label = React.useMemo(() => {
    if (activePreset === "all-time") {
      return "All Time"
    }
    if (isMonthMode && monthAnchor) {
      return format(monthAnchor, "MMMM yyyy")
    }
    if (activePreset && dateRange?.from && dateRange?.to) {
      const presetLabel = SECONDARY_PRESETS.find(p => p.key === activePreset)?.label
      const rangeText = isSameDay(dateRange.from, dateRange.to)
        ? format(dateRange.from, "MMM d")
        : `${format(dateRange.from, "MMM d")}–${format(dateRange.to, "MMM d")}`
      return `${presetLabel}: ${rangeText}`
    }
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
    }
    return format(currentMonthAnchor, "MMMM yyyy")
  }, [isMonthMode, monthAnchor, activePreset, dateRange, currentMonthAnchor])

  const canStepForward = isMonthMode && monthAnchor !== null && monthAnchor < currentMonthAnchor

  const handlePrev = () => {
    if (isMonthMode && monthAnchor) {
      onDateRangeChange(getMonthRange(subMonths(monthAnchor, 1)))
    } else {
      // Snap back to current month from non-month modes
      onDateRangeChange(getMonthRange(currentMonthAnchor))
    }
  }

  const handleNext = () => {
    if (isMonthMode && monthAnchor) {
      if (canStepForward) {
        onDateRangeChange(getMonthRange(addMonths(monthAnchor, 1)))
      }
    } else {
      onDateRangeChange(getMonthRange(currentMonthAnchor))
    }
  }

  const handlePresetClick = (key: DatePresetKey) => {
    if (activePreset === key) {
      onDateRangeChange(getMonthRange(currentMonthAnchor))
    } else {
      onDateRangeChange(getPresetRange(key))
    }
  }

  const handleReset = () => {
    onDateRangeChange(getMonthRange(currentMonthAnchor))
  }

  const nextDisabled = isMonthMode && !canStepForward

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3", className)}>
      <div className="flex items-center gap-1 rounded-lg border bg-background h-10 px-1 sm:w-[260px] shrink-0">
        {isMonthMode && (
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors shrink-0"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-[140px] text-center text-sm font-medium px-2 truncate">
          {label}
        </div>
        {isMonthMode && (
          <button
            type="button"
            onClick={handleNext}
            disabled={nextDisabled}
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors shrink-0",
              !canStepForward && "opacity-40 cursor-not-allowed hover:bg-transparent"
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {!isMonthMode && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-muted-foreground shrink-0"
            aria-label="Reset to current month"
            title="Reset to current month"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors shrink-0",
            isCustomActive ? "text-foreground" : "text-muted-foreground"
          )}
          aria-label="Custom date range"
          title="Custom date range"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {SECONDARY_PRESETS.map(({ key, label: chipLabel }) => {
          const isActive = activePreset === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetClick(key)}
              className={cn(
                "h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
                isActive
                  ? "border-foreground/40 bg-foreground/5 text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {chipLabel}
            </button>
          )
        })}
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-fit">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-zinc-950">
              Custom Date Range
            </DialogTitle>
          </DialogHeader>
          <DateRangeDialogContent
            initialRange={dateRange}
            onSubmit={(range) => {
              onDateRangeChange(range)
              setCustomOpen(false)
            }}
            onCancel={() => setCustomOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
