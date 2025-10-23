'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type TimePeriod = 'all' | '5y' | '3y' | '2y' | '1y' | 'ytd'

interface TimePeriodToggleProps {
  value: TimePeriod
  onChange: (value: TimePeriod) => void
  className?: string
}

const TIME_PERIODS: { value: TimePeriod; label: string; shortLabel: string }[] = [
  { value: 'all', label: 'All', shortLabel: 'All' },
  { value: '5y', label: '5YR', shortLabel: '5Y' },
  { value: '3y', label: '3YR', shortLabel: '3Y' },
  { value: '2y', label: '2YR', shortLabel: '2Y' },
  { value: '1y', label: '1YR', shortLabel: '1Y' },
  { value: 'ytd', label: 'YTD', shortLabel: 'YTD' },
]

export function TimePeriodToggle({
  value,
  onChange,
  className,
}: TimePeriodToggleProps) {
  return (
    <div
      role="group"
      aria-label="Time period selection"
      className={cn(
        'inline-flex items-center gap-0 rounded-lg bg-muted p-1',
        className
      )}
    >
      {TIME_PERIODS.map((period) => {
        const isSelected = value === period.value
        return (
          <button
            key={period.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Select time period: ${period.label}`}
            onClick={() => onChange(period.value)}
            className={cn(
              'relative min-w-[44px] rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
              'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
              'md:px-2.5 lg:px-3',
              isSelected
                ? 'bg-card text-foreground font-semibold shadow-sm border border-border'
                : 'bg-transparent text-muted-foreground hover:bg-accent/50'
            )}
          >
            {/* Desktop: Full label */}
            <span className="hidden lg:inline">{period.label}</span>
            {/* Mobile/Tablet: Short label */}
            <span className="inline lg:hidden">{period.shortLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
