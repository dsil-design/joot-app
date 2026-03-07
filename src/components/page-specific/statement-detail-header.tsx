'use client'

import Link from 'next/link'
import { ArrowLeft, RefreshCw, Eye } from 'lucide-react'
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
  isReprocessing?: boolean
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
    case 'completed':
      return <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">Completed</Badge>
    case 'processing':
      return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">Processing</Badge>
    case 'pending':
      return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">Pending</Badge>
    case 'failed':
      return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function StatementDetailHeader({
  paymentMethodName,
  period,
  status,
  filename,
  stats,
  matchRate,
  onReprocess,
  onViewStatement,
  isReprocessing,
}: StatementDetailHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back link and title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/imports/statements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 shrink-0">
          {onViewStatement && (
            <Button variant="outline" size="sm" onClick={onViewStatement}>
              <Eye className="h-4 w-4 mr-1.5" />
              View Statement
            </Button>
          )}
          {onReprocess && status === 'completed' && (
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
        </div>
      </div>

      {/* Stats row */}
      {status === 'completed' && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.extracted}</p>
              <p className="text-xs text-muted-foreground">Extracted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
              <p className="text-xs text-muted-foreground">Linked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.unmatched}</p>
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
