import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  isSameDay,
  isSameMonth,
  isSameYear,
  format,
} from "date-fns"
import type { DateRange } from "react-day-picker"

export type DatePresetKey =
  | 'today'
  | 'yesterday'
  | 'last-7-days'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'last-30-days'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'last-year'
  | 'all-time'
  | 'custom'

export const DATE_PRESETS: Record<DatePresetKey, () => DateRange | undefined> = {
  today: () => {
    const now = new Date()
    return { from: startOfDay(now), to: endOfDay(now) }
  },

  yesterday: () => {
    const yesterday = subDays(new Date(), 1)
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
  },

  'last-7-days': () => {
    const now = new Date()
    return { from: subDays(now, 7), to: now }
  },

  'this-week': () => {
    const now = new Date()
    return { from: startOfWeek(now), to: now }
  },

  'last-week': () => {
    const lastWeek = subWeeks(new Date(), 1)
    return { from: startOfWeek(lastWeek), to: endOfWeek(lastWeek) }
  },

  'this-month': () => {
    const now = new Date()
    return { from: startOfMonth(now), to: now }
  },

  'last-month': () => {
    const lastMonth = subMonths(new Date(), 1)
    return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
  },

  'last-30-days': () => {
    const now = new Date()
    return { from: subDays(now, 30), to: now }
  },

  'this-quarter': () => {
    const now = new Date()
    return { from: startOfQuarter(now), to: now }
  },

  'last-quarter': () => {
    const lastQ = subQuarters(new Date(), 1)
    return { from: startOfQuarter(lastQ), to: endOfQuarter(lastQ) }
  },

  'this-year': () => {
    const now = new Date()
    return { from: startOfYear(now), to: now }
  },

  'last-year': () => {
    const lastY = subYears(new Date(), 1)
    return { from: startOfYear(lastY), to: endOfYear(lastY) }
  },

  'all-time': () => {
    return undefined
  },

  custom: () => {
    return undefined
  },
}

export function getPresetRange(preset: DatePresetKey): DateRange | undefined {
  const presetFn = DATE_PRESETS[preset]
  return presetFn ? presetFn() : undefined
}

/**
 * Returns a full calendar-month range anchored at the given date (defaults to today).
 * Used by the month-stepper filter for review-queue and payment-slips pages.
 */
export function getMonthRange(anchor: Date = new Date()): DateRange {
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) }
}

/**
 * If the range corresponds exactly to a full calendar month, returns the
 * anchor (start-of-month Date). Otherwise returns null.
 */
export function detectMonthAnchor(range: DateRange | undefined): Date | null {
  if (!range?.from || !range?.to) return null
  const anchor = startOfMonth(range.from)
  const expectedEnd = endOfMonth(anchor)
  if (isSameDay(range.from, anchor) && isSameDay(range.to, expectedEnd)) {
    return anchor
  }
  return null
}

/** True if the range is the current calendar month. */
export function isCurrentMonthRange(range: DateRange | undefined): boolean {
  const anchor = detectMonthAnchor(range)
  if (!anchor) return false
  return isSameMonth(anchor, new Date())
}

export function formatDateRangeChip(range: DateRange | undefined): string {
  if (!range?.from) return 'All Time'

  if (!range.to || isSameDay(range.from, range.to)) {
    return format(range.from, 'MMM d, yyyy')
  }

  if (isSameMonth(range.from, range.to)) {
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'd, yyyy')}`
  }

  if (isSameYear(range.from, range.to)) {
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`
  }

  return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
}

export function detectPreset(range: DateRange | undefined): DatePresetKey | null {
  if (!range?.from) return 'all-time'
  if (!range.to) return 'custom'

  // Check each preset
  for (const [key, getRange] of Object.entries(DATE_PRESETS)) {
    if (key === 'custom' || key === 'all-time') continue

    const presetRange = getRange()
    if (
      presetRange?.from &&
      presetRange?.to &&
      isSameDay(range.from, presetRange.from) &&
      isSameDay(range.to, presetRange.to)
    ) {
      return key as DatePresetKey
    }
  }

  return 'custom'
}

export const PRESET_LABELS: Record<DatePresetKey, string> = {
  'today': 'Today',
  'yesterday': 'Yesterday',
  'last-7-days': 'Last 7 Days',
  'this-week': 'This Week',
  'last-week': 'Last Week',
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'last-30-days': 'Last 30 Days',
  'this-quarter': 'This Quarter',
  'last-quarter': 'Last Quarter',
  'this-year': 'This Year',
  'last-year': 'Last Year',
  'all-time': 'All Time',
  'custom': 'Custom Range',
}
