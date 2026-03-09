'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Upload, Loader2 } from 'lucide-react'
import type { CoverageData, CellData } from '@/hooks/use-coverage-data'

interface StatementCoverageGridProps {
  data: CoverageData | null
  isLoading: boolean
}

/**
 * Short month format for column headers (e.g. "Feb")
 */
function formatMonthShort(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(parseInt(year), parseInt(m) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short' })
}

/**
 * Get cell href based on status
 */
function getCellHref(cell: CellData): string | null {
  switch (cell.status) {
    case 'done':
    case 'processing':
      return cell.statementId ? `/imports/statements/${cell.statementId}` : null
    case 'pending_review':
      return cell.statementId
        ? `/review?statementUploadId=${cell.statementId}`
        : null
    case 'missing':
      return '/imports/statements/new'
    default:
      return null
  }
}

/**
 * Cell content component
 */
function CoverageCell({ cell }: {
  cell: CellData
}) {
  const href = getCellHref(cell)

  const content = (
    <div
      className={cn(
        'flex items-center justify-center h-10 rounded-md border text-xs font-medium transition-colors',
        cell.status === 'done' && 'border-green-300 bg-green-50 text-green-700',
        cell.status === 'missing' && 'border-dashed border-red-300 bg-red-50/30 text-red-400',
        cell.status === 'pending_review' && 'border-amber-300 bg-amber-50 text-amber-700',
        cell.status === 'processing' && 'border-blue-300 bg-blue-50 text-blue-600',
        href && 'cursor-pointer hover:opacity-80'
      )}
    >
      {cell.status === 'done' && <CheckCircle2 className="h-4 w-4" />}
      {cell.status === 'missing' && <Upload className="h-3.5 w-3.5" />}
      {cell.status === 'pending_review' && <span>{cell.count}</span>}
      {cell.status === 'processing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
    </div>
  )

  if (href) {
    return (
      <Link href={href} title={`${cell.status === 'missing' ? 'Upload statement' : cell.status === 'pending_review' ? `${cell.count} pending review` : cell.status}`}>
        {content}
      </Link>
    )
  }

  return content
}

/**
 * StatementCoverageGrid
 *
 * Displays a matrix of payment methods x months,
 * showing statement upload status per cell.
 */
export function StatementCoverageGrid({ data, isLoading }: StatementCoverageGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!data || data.paymentMethods.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No payment methods configured. Add payment methods in Settings to see statement coverage.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Statement Coverage</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground p-2 min-w-[120px]">
                Payment Method
              </th>
              {data.months.map((month) => (
                <th
                  key={month}
                  className="text-center text-xs font-medium text-muted-foreground p-2 min-w-[64px]"
                >
                  {formatMonthShort(month)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.paymentMethods.map((pm) => (
              <tr key={pm.id} className="border-t">
                <td className="text-sm font-medium p-2 truncate max-w-[160px]" title={pm.name}>
                  {pm.name}
                </td>
                {data.months.map((month) => (
                  <td key={month} className="p-1">
                    <CoverageCell
                      cell={data.cells[pm.id]?.[month] || { status: 'missing' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border border-green-300 bg-green-50" />
          Done
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border border-amber-300 bg-amber-50" />
          Pending Review
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border border-blue-300 bg-blue-50" />
          Processing
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border border-dashed border-red-300 bg-red-50/30" />
          Missing
        </span>
      </div>
    </div>
  )
}
