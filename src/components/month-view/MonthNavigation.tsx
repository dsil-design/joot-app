"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, isThisMonth } from "date-fns"

export interface MonthNavigationProps {
  currentMonth: Date
  onMonthChange: (date: Date) => void
  className?: string
  minMonth?: Date
  maxMonth?: Date
}

/**
 * Month navigation component with prev/next buttons and month/year selectors
 * Mobile: Compact view with dropdowns
 * Desktop: Full layout with buttons
 */
export function MonthNavigation({
  currentMonth,
  onMonthChange,
  className,
  minMonth,
  maxMonth,
}: MonthNavigationProps) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1)
    if (!minMonth || newMonth >= minMonth) {
      onMonthChange(newMonth)
    }
  }

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    if (!maxMonth || newMonth <= maxMonth) {
      onMonthChange(newMonth)
    }
  }

  const handleTodayClick = () => {
    onMonthChange(startOfMonth(new Date()))
  }

  const handleMonthSelect = (value: string) => {
    const monthIndex = parseInt(value)
    const newDate = new Date(currentMonth.getFullYear(), monthIndex, 1)
    onMonthChange(newDate)
  }

  const handleYearSelect = (value: string) => {
    const year = parseInt(value)
    const newDate = new Date(year, currentMonth.getMonth(), 1)
    onMonthChange(newDate)
  }

  const isPrevDisabled = minMonth ? currentMonth <= minMonth : false
  const isNextDisabled = maxMonth ? currentMonth >= maxMonth : false
  const isCurrentMonth = isThisMonth(currentMonth)

  const currentYear = currentMonth.getFullYear()
  const currentMonthIndex = currentMonth.getMonth()

  // Generate year options (current year ± 5 years)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  if (isMobile) {
    return (
      <div className={cn("flex items-center justify-between gap-2", className)}>
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevMonth}
          disabled={isPrevDisabled}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-2 flex-1">
          <Select value={currentMonthIndex.toString()} onValueChange={handleMonthSelect}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currentYear.toString()} onValueChange={handleYearSelect}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          disabled={isNextDisabled}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold text-zinc-950">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        {!isCurrentMonth && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTodayClick}
            className="ml-2"
          >
            <Calendar className="size-4 mr-1" />
            Today
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevMonth}
          disabled={isPrevDisabled}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          disabled={isNextDisabled}
          aria-label="Next month"
        >
          Next
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
