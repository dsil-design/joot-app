'use client'

import Link from 'next/link'
import { ArrowLeft, RefreshCw, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface StatementDetailHeaderProps {
  paymentMethodName: string
  period: { start: string | null; end: string | null }
  status: string
  filename: string
  uploadedAt?: string
  stats: {
    extracted: number
    matched: number
    unmatched: number
  }
  matchRate: number
  onReprocess?: () => void
  onViewStatement?: () => void
  onDelete?: () => void
  isReprocessing?: boolean
  isDeleting?: boolean
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return 'Unknown period'
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (!end) return s
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} — ${e}`
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ready_for_review':
      return <Badge variant="outline" className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">Ready for Review</Badge>
    case 'in_review':
      return <Badge variant="outline" className="border-blue-300 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">In Review</Badge>
    case 'done':
      return <Badge variant="outline" className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">Done</Badge>
    case 'processing':
      return <Badge variant="outline" className="border-blue-300 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">Processing</Badge>
    case 'pending':
      return <Badge variant="outline" className="border-border bg-muted text-muted-foreground">Pending</Badge>
    case 'failed':
      return <Badge variant="outline" className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function StatementDetailHeader({
  paymentMethodName,
  period,
  status,
  filename,
  uploadedAt,
  stats,
  matchRate,
  onReprocess,
  onViewStatement,
  onDelete,
  isReprocessing,
  isDeleting,
}: StatementDetailHeaderProps) {
  const isProcessed = ['ready_for_review', 'in_review', 'done'].includes(status)
  const isUnprocessed = ['pending', 'failed'].includes(status)
  return (
    <div className="space-y-4">
      {/* Added to system date */}
      {uploadedAt && (
        <p className="text-xs text-muted-foreground">
          Added to system on {new Date(uploadedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      {/* Back link and title */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
          <Link href="/imports/statements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold truncate">
              {paymentMethodName}
            </h1>
            {getStatusBadge(status)}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatPeriod(period.start, period.end)}
            {' · '}
            <span className="text-xs">{filename}</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {onViewStatement && (
            <Button variant="outline" size="sm" onClick={onViewStatement}>
              <Eye className="h-4 w-4 mr-1.5" />
              View Statement
            </Button>
          )}
          {onReprocess && isProcessed && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReprocess}
              disabled={isReprocessing}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isReprocessing ? 'animate-spin' : ''}`} />
              {isReprocessing ? 'Reprocessing...' : 'Reprocess'}
            </Button>
          )}
          {onDelete && status !== 'processing' && (
            <Button
              variant={isUnprocessed ? 'outline' : 'ghost'}
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className={isUnprocessed
                ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400'
                : 'text-muted-foreground hover:text-red-600 dark:hover:text-red-400'
              }
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile action buttons */}
      <div className="flex sm:hidden items-center gap-2 flex-wrap -mt-2">
        {onViewStatement && (
          <Button variant="outline" size="sm" onClick={onViewStatement}>
            <Eye className="h-4 w-4 mr-1.5" />
            View Statement
          </Button>
        )}
        {onReprocess && isProcessed && (
          <Button variant="outline" size="sm" onClick={onReprocess} disabled={isReprocessing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isReprocessing ? 'animate-spin' : ''}`} />
            {isReprocessing ? 'Reprocessing...' : 'Reprocess'}
          </Button>
        )}
        {onDelete && status !== 'processing' && (
          <Button
            variant={isUnprocessed ? 'outline' : 'ghost'}
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className={isUnprocessed
              ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400'
              : 'text-muted-foreground hover:text-red-600 dark:hover:text-red-400'
            }
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </div>

      {/* Stats row */}
      {isProcessed && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.extracted}</p>
              <p className="text-xs text-muted-foreground">Extracted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.matched}</p>
              <p className="text-xs text-muted-foreground">Linked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.unmatched}</p>
              <p className="text-xs text-muted-foreground">Unlinked</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={matchRate} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground font-medium">
              {matchRate}% linked
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
