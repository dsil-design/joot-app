"use client"

import { cn } from "@/lib/utils"
import type { EmailHubStats } from "@/hooks/use-email-hub-stats"

interface EmailHubFunnelBarProps {
  stats: EmailHubStats | null
  isLoading: boolean
}

interface FunnelStage {
  label: string
  count: number
  color: string
  bgColor: string
}

export function EmailHubFunnelBar({ stats, isLoading }: EmailHubFunnelBarProps) {
  if (isLoading || !stats) return null

  const statusCounts = stats.status_counts || {}
  const total =
    (statusCounts.pending_review || 0) +
    (statusCounts.matched || 0) +
    (statusCounts.waiting_for_statement || 0) +
    (statusCounts.ready_to_import || 0) +
    (statusCounts.imported || 0) +
    (statusCounts.skipped || 0)

  if (total === 0) return null

  // Count extracted = anything that has been processed (all statuses except brand new)
  const extracted =
    (statusCounts.pending_review || 0) +
    (statusCounts.matched || 0) +
    (statusCounts.waiting_for_statement || 0) +
    (statusCounts.ready_to_import || 0) +
    (statusCounts.imported || 0)
  const matched = (statusCounts.matched || 0) + (statusCounts.imported || 0)
  const imported = statusCounts.imported || 0

  const stages: FunnelStage[] = [
    { label: "Synced", count: total, color: "bg-slate-500", bgColor: "bg-slate-100" },
    { label: "Extracted", count: extracted, color: "bg-blue-500", bgColor: "bg-blue-100" },
    { label: "Matched", count: matched, color: "bg-amber-500", bgColor: "bg-amber-100" },
    { label: "Imported", count: imported, color: "bg-green-500", bgColor: "bg-green-100" },
  ]

  return (
    <div className="hidden md:block">
      <div className="flex items-center gap-1">
        {stages.map((stage, i) => {
          const width = total > 0 ? Math.max((stage.count / total) * 100, 8) : 25
          const dropOff = i > 0
            ? ((stages[i - 1].count - stage.count) / stages[i - 1].count) * 100
            : 0

          return (
            <div key={stage.label} className="flex items-center gap-1" style={{ flex: width }}>
              <div className="flex-1 min-w-0">
                <div className={cn("h-8 rounded flex items-center justify-center", stage.bgColor)}>
                  <div
                    className={cn("h-full rounded transition-all", stage.color)}
                    style={{ width: total > 0 ? `${(stage.count / total) * 100}%` : "100%", minWidth: "4px", opacity: 0.7 }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                  <span className="text-xs font-semibold">{stage.count}</span>
                </div>
                {dropOff > 10 && i > 0 && (
                  <span className="text-[10px] text-red-500">-{Math.round(dropOff)}%</span>
                )}
              </div>
              {i < stages.length - 1 && (
                <div className="text-muted-foreground/30 text-xs px-0.5 shrink-0">&rarr;</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
