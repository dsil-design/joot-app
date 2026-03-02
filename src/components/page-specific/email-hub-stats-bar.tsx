"use client"

import { Clock, CheckCircle2, ArrowDownToLine, Inbox } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
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
  const pendingCount = stats?.status_counts?.pending_review || 0
  const waitingCount = stats?.status_counts?.waiting_for_statement || 0
  const matchedCount = stats?.status_counts?.matched || 0
  const importedCount = stats?.status_counts?.imported || 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
  )
}
