"use client"

import { Clock, CheckCircle2, ArrowDownToLine, Inbox, Mail, AlertTriangle, Loader2 } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { Progress } from "@/components/ui/progress"
import type { EmailHubStats } from "@/hooks/use-email-hub-stats"
import type { EmailHubStatus } from "@/hooks/use-email-hub-filters"

interface EmailHubStatsBarProps {
  stats: EmailHubStats | null
  isLoading: boolean
  onFilterByStatus: (status: EmailHubStatus) => void
}

export function EmailHubStatsBar({
  stats,
  isLoading,
  onFilterByStatus,
}: EmailHubStatsBarProps) {
  const totalProcessed = stats?.total || 0
  const totalSynced = stats?.total_synced_emails || 0
  const notExtractedCount = stats?.not_extracted || 0
  const pendingCount = stats?.status_counts?.pending_review || 0
  const waitingCount = stats?.status_counts?.waiting_for_statement || 0
  const matchedCount = stats?.status_counts?.matched || 0
  const importedCount = stats?.status_counts?.imported || 0

  const unprocessedCount = totalSynced - totalProcessed
  const extractionPercent = totalSynced > 0 ? Math.round((totalProcessed / totalSynced) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Extraction pipeline status */}
      {!isLoading && totalSynced > 0 && unprocessedCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-amber-600 shrink-0 animate-spin" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {totalProcessed.toLocaleString()} of {totalSynced.toLocaleString()} synced emails have been processed
            </p>
          </div>
          <Progress value={extractionPercent} className="h-2" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {unprocessedCount.toLocaleString()} emails still need extraction. Each sync processes more emails automatically.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Mail className="h-5 w-5" />}
          label="Processed"
          value={totalProcessed}
          isLoading={isLoading}
          className="text-foreground"
          onClick={() => onFilterByStatus("all")}
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
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Matched"
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

      {/* Waiting callout */}
      {!isLoading && waitingCount > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5">
          <Clock className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">{waitingCount} email{waitingCount !== 1 ? "s" : ""}</span>
            {" "}waiting for statement upload to match against.
          </p>
        </div>
      )}
    </div>
  )
}
