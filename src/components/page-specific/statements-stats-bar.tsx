'use client'

import { Card } from '@/components/ui/card'
import type { StatementsStats } from '@/hooks/use-statements'

interface StatementsStatsBarProps {
  stats: StatementsStats
}

export function StatementsStatsBar({ stats }: StatementsStatsBarProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Statements</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.pending + stats.processing}
          </p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.averageMatchRate}%
          </p>
          <p className="text-xs text-muted-foreground">Avg Match Rate</p>
        </div>
      </div>
    </Card>
  )
}
