'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { Loader2, CreditCard, Landmark, ChevronRight } from 'lucide-react'
import type { StatementUpload } from '@/hooks/use-statements'

interface StatementRowProps {
  statement: StatementUpload
  paymentMethodType?: string
  onProcess: (id: string) => void
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
      return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">Ready for Review</Badge>
    case 'in_review':
      return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">In Review</Badge>
    case 'done':
      return <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">Done</Badge>
    case 'processing':
      return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">Processing</Badge>
    case 'pending':
      return <Badge variant="outline" className="border-zinc-300 bg-zinc-50 text-zinc-700">Pending</Badge>
    case 'failed':
      return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function StatementRow({ statement, paymentMethodType, onProcess }: StatementRowProps) {
  const TypeIcon = paymentMethodType === 'bank_account' ? Landmark : CreditCard
  const extracted = statement.transactions_extracted ?? 0
  const matched = statement.transactions_matched ?? 0
  const newCount = statement.transactions_new ?? 0
  const matchRate = extracted > 0 ? Math.round((matched / extracted) * 100) : 0

  return (
    <Link href={`/imports/statements/${statement.id}`}>
      <Card className="p-4 mb-3 hover:bg-zinc-50 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          {/* Left side: file info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate">{statement.filename}</span>
              {getStatusBadge(statement.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPeriod(statement.statement_period_start, statement.statement_period_end)}
              {' · '}
              {new Date(statement.uploaded_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Right side: status-specific content */}
          <div className="flex-shrink-0">
            {['ready_for_review', 'in_review', 'done'].includes(statement.status) && (
              <div className="text-right space-y-1">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{extracted} extracted</span>
                  <span className="text-green-600">{matched} linked</span>
                  <span className="text-amber-600">{newCount} new</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={matchRate} className="h-1.5 w-24" />
                  <span className="text-xs text-muted-foreground">{matchRate}%</span>
                </div>
              </div>
            )}

            {statement.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  onProcess(statement.id)
                }}
              >
                Process now
              </Button>
            )}

            {statement.status === 'processing' && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}

            {statement.status === 'failed' && (
              <div className="text-right space-y-1">
                <p className="text-xs text-red-600 max-w-[200px] truncate">
                  {statement.extraction_error ?? 'Processing failed'}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault()
                    onProcess(statement.id)
                  }}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>

          {/* Navigate chevron */}
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 self-center" />
        </div>
      </Card>
    </Link>
  )
}
