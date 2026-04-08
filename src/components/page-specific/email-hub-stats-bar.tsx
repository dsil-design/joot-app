"use client"

import { Clock, CheckCircle2, ArrowDownToLine, Inbox, Mail, Loader2, FileQuestion } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { Progress } from "@/components/ui/progress"
import type { EmailHubStats } from "@/hooks/use-email-hub-stats"
import type { EmailHubStatus } from "@/hooks/use-email-hub-filters"

interface EmailHubStatsBarProps {
  stats: EmailHubStats | null
  isLoading: boolean
  onFilterByStatus: (status: EmailHubStatus) => void
  /**
   * Optional counts reflecting the active filter/search. When provided, the
   * stat-card values come from this object instead of global `stats`.
   */
  filteredCounts?: { total: number; status_counts: Record<string, number> } | null
  /** Whether to render the extraction pipeline banner (defaults to true). */
  showBanner?: boolean
  /** When true, render only the banner and hide the stat-card grid. */
  bannerOnly?: boolean
}

export function EmailHubStatsBar({
  stats,
  isLoading,
  onFilterByStatus,
  filteredCounts,
  showBanner = true,
  bannerOnly = false,
}: EmailHubStatsBarProps) {
  const source = filteredCounts
    ? { total: filteredCounts.total, status_counts: filteredCounts.status_counts }
    : { total: stats?.total || 0, status_counts: stats?.status_counts || {} }

  const totalEmails = source.total
  const totalSynced = stats?.total_synced_emails || 0
  const unprocessedCount = source.status_counts.unprocessed ?? (filteredCounts ? 0 : totalSynced - (stats?.total || 0))
  const pendingCount = source.status_counts.pending_review || 0
  const waitingCount = (source.status_counts.waiting_for_statement || 0) + (source.status_counts.waiting_for_slip || 0)
  const matchedCount = source.status_counts.matched || 0
  const importedCount = source.status_counts.imported || 0

  const unprocessedForBanner = totalSynced - (stats?.total || 0)
  const extractionPercent = totalSynced > 0 ? Math.round(((stats?.total || 0) / totalSynced) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Extraction pipeline status */}
      {showBanner && !isLoading && totalSynced > 0 && unprocessedForBanner > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-amber-600 shrink-0 animate-spin" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {(stats?.total || 0).toLocaleString()} of {totalSynced.toLocaleString()} synced emails have been processed
            </p>
          </div>
          <Progress value={extractionPercent} className="h-2" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {unprocessedForBanner.toLocaleString()} emails still need extraction.
          </p>
        </div>
      )}

      {!bannerOnly && (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
        <StatCard
          icon={<Mail className="h-5 w-5" />}
          label="Total"
          value={totalEmails}
          isLoading={isLoading}
          className="text-foreground"
          onClick={() => onFilterByStatus("all")}
        />
        <StatCard
          icon={<FileQuestion className="h-5 w-5" />}
          label="Unprocessed"
          value={unprocessedCount}
          isLoading={isLoading}
          className="text-muted-foreground"
          onClick={() => onFilterByStatus("unprocessed")}
        />
        <StatCard
          icon={<Inbox className="h-5 w-5" />}
          label="Pending Review"
          value={pendingCount}
          isLoading={isLoading}
          className="text-amber-600"
          onClick={() => onFilterByStatus("pending_review")}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Waiting"
          value={waitingCount}
          isLoading={isLoading}
          className="text-blue-600"
          onClick={() => onFilterByStatus("waiting_for_statement")}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Linked"
          value={matchedCount}
          isLoading={isLoading}
          className="text-green-600"
          onClick={() => onFilterByStatus("matched")}
        />
        <StatCard
          icon={<ArrowDownToLine className="h-5 w-5" />}
          label="Imported"
          value={importedCount}
          isLoading={isLoading}
          className="text-green-600/70"
          onClick={() => onFilterByStatus("imported")}
        />
      </div>
      )}
    </div>
  )
}
