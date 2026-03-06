'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Code,
  Tag,
  SkipForward,
  DollarSign,
  AlertTriangle,
  Lightbulb,
  Info,
  X,
  Check,
} from 'lucide-react'
import type { AiInsight } from '@/hooks/use-ai-insights'

interface AiJournalInsightsListProps {
  insights: AiInsight[]
  isLoading: boolean
  onDismiss: (id: string) => void
  onImplement: (id: string) => void
}

const typeIcons: Record<string, typeof Code> = {
  regex_parser_candidate: Code,
  classification_correction: AlertTriangle,
  vendor_normalization: Tag,
  skip_pattern: SkipForward,
  cost_savings: DollarSign,
  general: Lightbulb,
}

const severityStyles: Record<string, { badge: string; border: string }> = {
  action_needed: {
    badge: 'bg-red-100 text-red-700 hover:bg-red-100',
    border: 'border-l-red-500',
  },
  suggestion: {
    badge: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    border: 'border-l-amber-500',
  },
  info: {
    badge: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    border: 'border-l-blue-500',
  },
}

export function AiJournalInsightsList({
  insights,
  isLoading,
  onDismiss,
  onImplement,
}: AiJournalInsightsListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
        <Info className="h-8 w-8 mb-2" />
        <p className="text-sm">No active insights. Run an analysis to detect patterns.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {insights.map((insight) => {
        const Icon = typeIcons[insight.insight_type] || Lightbulb
        const styles = severityStyles[insight.severity] || severityStyles.info

        return (
          <div
            key={insight.id}
            className={`flex items-start gap-4 rounded-lg border border-l-4 ${styles.border} bg-white p-4`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <Icon className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-zinc-900 truncate">
                  {insight.title}
                </h4>
                <Badge variant="outline" className={`text-xs ${styles.badge}`}>
                  {insight.severity.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-zinc-600 mb-2">{insight.description}</p>
              {insight.evidence && (
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                  {insight.email_count && (
                    <span>{insight.email_count} emails</span>
                  )}
                  {insight.format_consistency_pct && (
                    <span>{insight.format_consistency_pct}% consistent</span>
                  )}
                  {insight.target_sender && (
                    <span className="font-mono">{insight.target_sender}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onImplement(insight.id)}
                title="Mark as implemented"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDismiss(insight.id)}
                title="Dismiss"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
