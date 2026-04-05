'use client'

import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CoverageTimeline } from './coverage-timeline'
import type { CellData, CoveragePaymentMethod } from '@/hooks/use-coverage-data'

interface PaymentMethodCoverageCardProps {
  paymentMethod: CoveragePaymentMethod
  months: string[]
  cells: Record<string, CellData>
  onMissingCellClick: (month: string) => void
  onSettingsClick: () => void
}

export function PaymentMethodCoverageCard({
  paymentMethod,
  months,
  cells,
  onMissingCellClick,
  onSettingsClick,
}: PaymentMethodCoverageCardProps) {
  const { name, preferred_currency, coveragePercent, aggregates } = paymentMethod

  // Count captured months
  const nonFutureMonths = months.filter(m => cells[m]?.status !== 'future')
  const capturedMonths = nonFutureMonths.filter(m => {
    const s = cells[m]?.status
    return s === 'done' || s === 'pending_review'
  })

  const hasStatements = aggregates.statementsCount > 0

  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm truncate">{name}</h3>
            {preferred_currency && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {preferred_currency}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Coverage % with dot bar */}
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {coveragePercent}%
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -m-2 p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:m-0 sm:p-0"
              onClick={onSettingsClick}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Timeline */}
        {hasStatements ? (
          <CoverageTimeline
            months={months}
            cells={cells}
            paymentMethodId={paymentMethod.id}
            onMissingCellClick={onMissingCellClick}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              No statements uploaded yet
            </p>
            <button
              onClick={() => {
                // Click the first missing month
                const firstMissing = months.find(m => cells[m]?.status === 'missing')
                if (firstMissing) onMissingCellClick(firstMissing)
              }}
              className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              Upload your first statement
            </button>
          </div>
        )}

        {/* Footer */}
        {hasStatements && (
          <div className="text-xs text-muted-foreground">
            {capturedMonths.length} of {nonFutureMonths.length} months captured
            {' · '}
            {aggregates.extracted} extracted
            {' · '}
            {aggregates.matched} matched
            {aggregates.newCount > 0 && ` · ${aggregates.newCount} new`}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
