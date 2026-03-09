'use client'

import { Inbox } from 'lucide-react'
import {
  ActivityFeedItem,
  ActivityFeedItemSkeleton,
  getActivityFeedItemType,
  getActivityIcon,
} from '@/components/page-specific/activity-feed-item'
import { useRecentActivities } from '@/hooks/use-recent-activities'
import { format, isToday, isYesterday } from 'date-fns'

function formatActivityTimestamp(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`
  const daysDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff < 7) return format(date, "EEE, h:mm a")
  return format(date, "MMM d, h:mm a")
}

export default function ImportHistoryPage() {
  const { activities, isLoading, error } = useRecentActivities(50)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-medium">Import History</h2>
        <p className="text-muted-foreground mt-1">
          View all import activities and audit trail
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ActivityFeedItemSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            Failed to load import history
          </p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-medium mb-1">No import history</h3>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            Sync your emails or upload a statement to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activities.map((activity) => (
            <ActivityFeedItem
              key={activity.id}
              type={getActivityFeedItemType(activity.activity_type)}
              title={activity.description}
              icon={getActivityIcon(activity.activity_type)}
              timestamp={formatActivityTimestamp(activity.created_at)}
              metadata={{
                transactionsAffected: activity.transactions_affected ?? undefined,
                totalAmount: activity.total_amount ?? undefined,
                currency: activity.currency ?? undefined,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
