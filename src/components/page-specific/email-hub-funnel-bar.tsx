"use client"

import { Fragment } from "react"
import { cn } from "@/lib/utils"
import type { EmailHubStats } from "@/hooks/use-email-hub-stats"

interface EmailHubFunnelBarProps {
  stats: EmailHubStats | null
  isLoading: boolean
}

export function EmailHubFunnelBar({ stats, isLoading }: EmailHubFunnelBarProps) {
  if (isLoading || !stats) return null

  const statusCounts = stats.status_counts || {}
  const total =
    (statusCounts.pending_review || 0) +
    (statusCounts.matched || 0) +
    (statusCounts.waiting_for_statement || 0) +
    (statusCounts.waiting_for_email || 0) +
    (statusCounts.ready_to_import || 0) +
    (statusCounts.imported || 0) +
    (statusCounts.skipped || 0)

  if (total === 0) return null

  const extracted =
    (statusCounts.pending_review || 0) +
    (statusCounts.matched || 0) +
    (statusCounts.waiting_for_statement || 0) +
    (statusCounts.waiting_for_email || 0) +
    (statusCounts.ready_to_import || 0) +
    (statusCounts.imported || 0)
  const matched = (statusCounts.matched || 0) + (statusCounts.imported || 0)
  const imported = statusCounts.imported || 0

  const stages = [
    { label: "Synced", count: total, color: "bg-slate-400" },
    { label: "Extracted", count: extracted, color: "bg-blue-400" },
    { label: "Linked", count: matched, color: "bg-amber-400" },
    { label: "Imported", count: imported, color: "bg-green-400" },
  ]

  return (
    <div className="hidden md:block py-2">
      <div className="flex items-end gap-2">
        {stages.map((stage, i) => {
          const prevCount = i > 0 ? stages[i - 1].count : 0
          const dropOff = prevCount > 0
            ? Math.round(((prevCount - stage.count) / prevCount) * 100)
            : 0

          return (
            <Fragment key={stage.label}>
              {/* Arrow connector with drop-off */}
              {i > 0 && (
                <div className="flex flex-col items-center shrink-0 self-end pb-1 gap-0.5">
                  <span className="text-muted-foreground/30 text-sm leading-none">→</span>
                  {dropOff > 10 && (
                    <span className="text-[10px] text-red-500 leading-none whitespace-nowrap">
                      -{dropOff}%
                    </span>
                  )}
                </div>
              )}

              {/* Stage column: label + count above, solid bar below */}
              <div
                className="min-w-0"
                style={{ flex: `${Math.max(stage.count, 1)} 1 0%` }}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {stage.label}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {stage.count}
                  </span>
                </div>
                <div
                  className={cn("h-4 rounded-md", stage.color)}
                  style={{ opacity: stage.count === 0 ? 0.15 : 0.6 }}
                />
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
