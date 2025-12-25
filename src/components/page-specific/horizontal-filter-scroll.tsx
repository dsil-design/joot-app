"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal } from "lucide-react"
import type { DatePresetKey } from "@/lib/utils/date-filters"

interface HorizontalFilterScrollProps {
  activePreset: DatePresetKey | null
  activeTransactionType: "all" | "expense" | "income"
  onPresetChange: (preset: DatePresetKey) => void
  onTransactionTypeChange: (type: "all" | "expense" | "income") => void
  onMoreClick: () => void
}

interface FilterPill {
  id: string
  label: string
  type: "date" | "transaction"
  value: DatePresetKey | "all" | "expense" | "income"
}

const PRIORITY_FILTERS: FilterPill[] = [
  { id: "today", label: "Today", type: "date", value: "today" },
  { id: "yesterday", label: "Yesterday", type: "date", value: "yesterday" },
  { id: "last-7-days", label: "Last 7 days", type: "date", value: "last-7-days" },
  { id: "this-month", label: "This Month", type: "date", value: "this-month" },
  { id: "all", label: "All", type: "transaction", value: "all" },
  { id: "expenses", label: "Expenses", type: "transaction", value: "expense" },
  { id: "income", label: "Income", type: "transaction", value: "income" },
]

export function HorizontalFilterScroll({
  activePreset,
  activeTransactionType,
  onPresetChange,
  onTransactionTypeChange,
  onMoreClick,
}: HorizontalFilterScrollProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const isActive = (filter: FilterPill) => {
    if (filter.type === "date") {
      return activePreset === filter.value
    }
    return activeTransactionType === filter.value
  }

  const handleClick = (filter: FilterPill) => {
    if (filter.type === "date") {
      onPresetChange(filter.value as DatePresetKey)
    } else {
      onTransactionTypeChange(filter.value as "all" | "expense" | "income")
    }
  }

  return (
    <div className="relative w-full">
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {PRIORITY_FILTERS.map((filter) => (
          <Button
            key={filter.id}
            variant="outline"
            size="sm"
            onClick={() => handleClick(filter)}
            className={`
              h-8 px-3 whitespace-nowrap rounded-full shrink-0
              text-sm font-medium
              ${isActive(filter)
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                : "bg-background text-foreground border-border hover:bg-muted"
              }
            `}
          >
            {filter.label}
          </Button>
        ))}

        {/* More/Filters button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onMoreClick}
          className="h-8 px-3 whitespace-nowrap rounded-full shrink-0 gap-1.5 text-sm font-medium bg-background text-foreground border-border hover:bg-muted"
        >
          <SlidersHorizontal className="w-4 h-4" />
          More
        </Button>
      </div>

      {/* Fade gradient on right edge to indicate more content */}
      <div
        className="absolute top-0 right-0 bottom-2 w-8 pointer-events-none bg-gradient-to-l from-white to-transparent"
        aria-hidden="true"
      />
    </div>
  )
}
