"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Calendar } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DatePresetKey } from "@/lib/utils/date-filters"
import { PRESET_LABELS } from "@/lib/utils/date-filters"

interface QuickFilterBarProps {
  activePreset: string | null
  activeTransactionType: "all" | "expense" | "income"
  onPresetChange: (preset: DatePresetKey) => void
  onTransactionTypeChange: (type: "all" | "expense" | "income") => void
  onMoreFiltersClick: () => void
  onCustomRangeClick?: () => void
}

export function QuickFilterBar({
  activePreset,
  activeTransactionType,
  onPresetChange,
  onTransactionTypeChange,
  onMoreFiltersClick,
  onCustomRangeClick,
}: QuickFilterBarProps) {
  const isActive = (preset: string) => activePreset === preset

  return (
    <div className="w-full bg-zinc-50 rounded-lg border border-zinc-200 px-4 py-3">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">

        {/* Date Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-zinc-700">Time Period:</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPresetChange('this-month')}
              className={
                isActive('this-month')
                  ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                  : 'bg-background text-foreground border-border hover:bg-muted hover:text-muted-foreground'
              }
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPresetChange('last-30-days')}
              className={
                isActive('last-30-days')
                  ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                  : 'bg-background text-foreground border-border hover:bg-muted hover:text-muted-foreground'
              }
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPresetChange('this-year')}
              className={
                isActive('this-year')
                  ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                  : 'bg-background text-foreground border-border hover:bg-muted hover:text-muted-foreground'
              }
            >
              This Year
            </Button>

            {/* Extended Presets Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    isActive('custom') || isActive('today') || isActive('yesterday') ||
                    isActive('last-7-days') || isActive('this-week') || isActive('last-week') ||
                    isActive('last-month') || isActive('this-quarter') || isActive('last-quarter') ||
                    isActive('last-year') || isActive('all-time')
                      ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                      : 'bg-background text-foreground border-border hover:bg-muted hover:text-muted-foreground'
                  }
                >
                  More
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onPresetChange('today')}>
                  {PRESET_LABELS.today}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('yesterday')}>
                  {PRESET_LABELS.yesterday}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('last-7-days')}>
                  {PRESET_LABELS['last-7-days']}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onPresetChange('this-week')}>
                  {PRESET_LABELS['this-week']}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('last-week')}>
                  {PRESET_LABELS['last-week']}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onPresetChange('last-month')}>
                  {PRESET_LABELS['last-month']}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onPresetChange('this-quarter')}>
                  {PRESET_LABELS['this-quarter']}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('last-quarter')}>
                  {PRESET_LABELS['last-quarter']}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onPresetChange('last-year')}>
                  {PRESET_LABELS['last-year']}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPresetChange('all-time')}>
                  {PRESET_LABELS['all-time']}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCustomRangeClick}>
                  <Calendar className="mr-2 h-4 w-4" />
                  <strong>Custom Range...</strong>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Type Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-700">Type:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransactionTypeChange('all')}
                className={
                  activeTransactionType === 'all'
                    ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                    : 'bg-background text-foreground border-border hover:bg-muted hover:text-muted-foreground'
                }
              >
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransactionTypeChange('expense')}
                className={
                  activeTransactionType === 'expense'
                    ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                    : 'bg-background text-foreground border-border hover:bg-muted hover:text-muted-foreground'
                }
              >
                Expenses
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransactionTypeChange('income')}
                className={
                  activeTransactionType === 'income'
                    ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/80'
                    : 'bg-background text-foreground border-border hover:bg-muted hover:text-muted-foreground'
                }
              >
                Income
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onMoreFiltersClick}
            className="text-zinc-600 hover:text-zinc-900"
          >
            More filters
          </Button>
        </div>
      </div>
    </div>
  )
}
