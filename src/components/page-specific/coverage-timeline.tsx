'use client'

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { CoverageCell } from './coverage-cell'
import type { CellData } from '@/hooks/use-coverage-data'

interface CoverageTimelineProps {
  months: string[]
  cells: Record<string, CellData>
  paymentMethodId: string
  onMissingCellClick?: (month: string) => void
}

export function CoverageTimeline({
  months,
  cells,
  onMissingCellClick,
}: CoverageTimelineProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-2">
        {months.map(month => (
          <CoverageCell
            key={month}
            month={month}
            cell={cells[month] || { status: 'missing' }}
            onMissingClick={() => onMissingCellClick?.(month)}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
