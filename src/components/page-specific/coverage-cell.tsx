'use client'

import Link from 'next/link'
import { Check, Loader2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CellData } from '@/hooks/use-coverage-data'

interface CoverageCellProps {
  month: string
  cell: CellData
  onMissingClick?: () => void
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(parseInt(year), parseInt(m) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short' })
}

export function CoverageCell({ month, cell, onMissingClick }: CoverageCellProps) {
  const label = formatMonthLabel(month)

  const tooltipContent = cell.tooltipCounts ? (
    <div className="text-xs space-y-0.5">
      <div>{cell.tooltipCounts.extracted} extracted</div>
      <div>{cell.tooltipCounts.matched} matched</div>
      <div>{cell.tooltipCounts.newCount} new</div>
    </div>
  ) : null

  const cellContent = (() => {
    switch (cell.status) {
      case 'done':
        return (
          <Link
            href={`/imports/statements/${cell.statementId}`}
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-lg',
              'bg-green-100 border border-green-300 text-green-600',
              'hover:bg-green-200 transition-colors'
            )}
          >
            <Check className="h-4 w-4" />
          </Link>
        )

      case 'pending_review':
        return (
          <Link
            href={`/review?statementUploadId=${cell.statementId}`}
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-lg',
              'bg-amber-100 border border-amber-300 text-amber-700',
              'hover:bg-amber-200 transition-colors text-xs font-semibold'
            )}
          >
            {cell.count}
          </Link>
        )

      case 'processing':
        return (
          <Link
            href={`/imports/statements/${cell.statementId}`}
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-lg',
              'bg-blue-100 border border-blue-300 text-blue-600',
              'hover:bg-blue-200 transition-colors'
            )}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </Link>
        )

      case 'missing':
        return (
          <button
            onClick={onMissingClick}
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-lg',
              'bg-red-50 border-2 border-dashed border-red-300 text-red-400',
              'hover:bg-red-100 hover:border-red-400 hover:text-red-500 transition-colors'
            )}
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
        )

      case 'future':
        return (
          <div
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-lg',
              'bg-gray-50 border border-gray-200 text-gray-300'
            )}
          >
            <span className="text-[10px]">—</span>
          </div>
        )
    }
  })()

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-muted-foreground font-medium uppercase">
        {label}
      </span>
      {tooltipContent ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              {cellContent}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        cellContent
      )}
    </div>
  )
}
