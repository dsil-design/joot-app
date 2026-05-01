'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Brain, DollarSign, Clock, Lightbulb, Activity } from 'lucide-react'
import type { JournalStats } from '@/hooks/use-ai-journal'

interface AiJournalStatsBarProps {
  stats: JournalStats | null
  isLoading: boolean
}

export function AiJournalStatsBar({ stats, isLoading }: AiJournalStatsBarProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const items = [
    {
      label: 'AI Calls (30d)',
      value: stats.total_calls_30d.toLocaleString(),
      icon: Brain,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Est. Cost (30d)',
      value: `$${stats.estimated_cost_30d.toFixed(4)}`,
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Avg Response',
      value: stats.avg_response_ms > 0 ? `${(stats.avg_response_ms / 1000).toFixed(1)}s` : 'N/A',
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Active Insights',
      value: String(stats.active_insights),
      icon: Lightbulb,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Last Analysis',
      value: stats.last_analysis_at
        ? new Date(stats.last_analysis_at).toLocaleDateString()
        : 'Never',
      icon: Activity,
      color: 'text-muted-foreground',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-lg border bg-card p-4"
          >
            <div className={`flex-shrink-0 ${item.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold truncate">{item.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
