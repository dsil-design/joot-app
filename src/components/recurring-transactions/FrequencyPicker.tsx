"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { addMonths, addWeeks, addDays, format } from "date-fns"
import type { FrequencyType, DayOfWeek, DayOfMonth } from "@/lib/types/recurring-transactions"

export interface FrequencyPickerProps {
  frequency: FrequencyType
  onFrequencyChange: (frequency: FrequencyType) => void
  frequencyInterval?: number
  onFrequencyIntervalChange?: (interval: number) => void
  dayOfMonth?: DayOfMonth | null
  onDayOfMonthChange?: (day: DayOfMonth) => void
  dayOfWeek?: DayOfWeek | null
  onDayOfWeekChange?: (day: DayOfWeek) => void
  startDate?: Date
  className?: string
}

/**
 * Custom input for recurrence pattern
 * Supports: Monthly, Bi-weekly, Weekly, Quarterly, Annually, Custom
 */
export function FrequencyPicker({
  frequency,
  onFrequencyChange,
  frequencyInterval = 1,
  onFrequencyIntervalChange,
  dayOfMonth,
  onDayOfMonthChange,
  dayOfWeek,
  onDayOfWeekChange,
  startDate = new Date(),
  className,
}: FrequencyPickerProps) {
  const showDayOfMonth = frequency === "monthly" || frequency === "quarterly" || frequency === "annually"
  const showDayOfWeek = frequency === "weekly" || frequency === "bi-weekly"
  const showInterval = frequency === "custom"

  // Calculate next 3 occurrences
  const nextOccurrences = React.useMemo(() => {
    return calculateNextOccurrences(frequency, frequencyInterval, dayOfMonth, dayOfWeek, startDate)
  }, [frequency, frequencyInterval, dayOfMonth, dayOfWeek, startDate])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Frequency Type Selector */}
      <div className="space-y-2">
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={(value) => onFrequencyChange(value as FrequencyType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="bi-weekly">Bi-weekly (every 2 weeks)</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="quarterly">Quarterly (every 3 months)</SelectItem>
            <SelectItem value="annually">Annually</SelectItem>
            <SelectItem value="custom">Custom interval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Day of Month Picker (for monthly/quarterly/annually) */}
      {showDayOfMonth && onDayOfMonthChange && (
        <div className="space-y-2">
          <Label>Day of Month</Label>
          <Select
            value={dayOfMonth?.toString() || "1"}
            onValueChange={(value) => onDayOfMonthChange(parseInt(value) as DayOfMonth)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day === 1 && "1st"}
                  {day === 2 && "2nd"}
                  {day === 3 && "3rd"}
                  {day === 21 && "21st"}
                  {day === 22 && "22nd"}
                  {day === 23 && "23rd"}
                  {day === 31 && "31st (or last day of month)"}
                  {![1, 2, 3, 21, 22, 23, 31].includes(day) && `${day}th`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">
            If the selected day doesn't exist in a month (e.g., Feb 31), the last day of that month will be used.
          </p>
        </div>
      )}

      {/* Day of Week Picker (for weekly/bi-weekly) */}
      {showDayOfWeek && onDayOfWeekChange && (
        <div className="space-y-2">
          <Label>Day of Week</Label>
          <Select
            value={dayOfWeek?.toString() || "0"}
            onValueChange={(value) => onDayOfWeekChange(parseInt(value) as DayOfWeek)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom Interval (for custom frequency) */}
      {showInterval && onFrequencyIntervalChange && (
        <div className="space-y-2">
          <Label>Repeat every (days)</Label>
          <Input
            type="number"
            min="1"
            max="365"
            value={frequencyInterval}
            onChange={(e) => {
              const value = parseInt(e.target.value)
              if (!isNaN(value) && value > 0 && value <= 365) {
                onFrequencyIntervalChange(value)
              }
            }}
          />
          <p className="text-xs text-zinc-500">
            How many days between each occurrence (1-365)
          </p>
        </div>
      )}

      {/* Preview of next occurrences */}
      <div className="border-t pt-4">
        <Label className="text-xs text-zinc-500 mb-2 block">Next 3 occurrences:</Label>
        <div className="space-y-1">
          {nextOccurrences.map((date, index) => (
            <div key={index} className="text-sm text-zinc-700">
              {index + 1}. {format(date, "EEEE, MMMM d, yyyy")}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Calculate next 3 occurrences based on frequency settings
 */
function calculateNextOccurrences(
  frequency: FrequencyType,
  interval: number,
  dayOfMonth: DayOfMonth | null | undefined,
  dayOfWeek: DayOfWeek | null | undefined,
  startDate: Date
): Date[] {
  const occurrences: Date[] = []
  let currentDate = new Date(startDate)

  for (let i = 0; i < 3; i++) {
    switch (frequency) {
      case "monthly":
        if (dayOfMonth) {
          currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + i,
            Math.min(dayOfMonth, getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + i))
          )
        } else {
          currentDate = addMonths(startDate, i)
        }
        break

      case "quarterly":
        if (dayOfMonth) {
          currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + i * 3,
            Math.min(dayOfMonth, getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + i * 3))
          )
        } else {
          currentDate = addMonths(startDate, i * 3)
        }
        break

      case "annually":
        if (dayOfMonth) {
          currentDate = new Date(
            currentDate.getFullYear() + i,
            currentDate.getMonth(),
            Math.min(dayOfMonth, getDaysInMonth(currentDate.getFullYear() + i, currentDate.getMonth()))
          )
        } else {
          currentDate = addMonths(startDate, i * 12)
        }
        break

      case "bi-weekly":
        currentDate = addWeeks(startDate, i * 2)
        if (dayOfWeek !== null && dayOfWeek !== undefined) {
          currentDate = getNextDayOfWeek(currentDate, dayOfWeek)
        }
        break

      case "weekly":
        currentDate = addWeeks(startDate, i)
        if (dayOfWeek !== null && dayOfWeek !== undefined) {
          currentDate = getNextDayOfWeek(currentDate, dayOfWeek)
        }
        break

      case "custom":
        currentDate = addDays(startDate, i * interval)
        break

      default:
        currentDate = addMonths(startDate, i)
    }

    occurrences.push(new Date(currentDate))
  }

  return occurrences
}

/**
 * Get number of days in a specific month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Get the next occurrence of a specific day of week
 */
function getNextDayOfWeek(date: Date, targetDayOfWeek: DayOfWeek): Date {
  const currentDayOfWeek = date.getDay()
  const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7
  return addDays(date, daysUntilTarget)
}
