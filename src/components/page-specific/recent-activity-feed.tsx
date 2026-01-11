'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Inbox } from 'lucide-react'
import {
  ActivityFeedItem,
  ActivityFeedItemSkeleton,
  getActivityFeedItemType,
  getActivityIcon,
} from './activity-feed-item'
import { useRecentActivities } from '@/hooks/use-recent-activities'
import { format, isToday, isYesterday } from 'date-fns'

/**
 * Formats a timestamp for display in the activity feed.
 *
 * - Today: "Today, 10:15 AM"
 * - Yesterday: "Yesterday, 3:30 PM"
 * - This week: "Mon, 2:45 PM"
 * - Older: "Dec 30, 4:20 PM"
 */
function formatActivityTimestamp(dateStr: string | null): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)

  if (isToday(date)) {
    return `Today, ${format(date, 'h:mm a')}`
  }
  if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'h:mm a')}`
  }
  // Within last 7 days
  const daysDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff < 7) {
    return format(date, "EEE, h:mm a")
  }
  // Older
  return format(date, "MMM d, h:mm a")
}

export interface RecentActivityFeedProps {
  /** Number of activities to display (default: 5) */
  limit?: number
  /** Section title */
  title?: string
  /** Whether to show the section title */
  showTitle?: boolean
  /** Path for "View All" link */
  viewAllHref?: string
  /** Additional class names */
  className?: string
}

/**
 * RecentActivityFeed - Displays the 5 most recent import activities.
 *
 * Features:
 * - Fetches activities from the API
 * - Color-coded icons by activity type
 * - Relative timestamps (Today, Yesterday, etc.)
 * - "View All History" link
 * - Empty state when no activities
 * - Loading skeleton state
 */
export function RecentActivityFeed({
  limit = 5,
  title = 'Recent Activity',
  showTitle = true,
  viewAllHref = '/imports/history',
  className,
}: RecentActivityFeedProps) {
  const { activities, isLoading, error } = useRecentActivities(limit)

  return (
    <section className={className} aria-labelledby={showTitle ? 'recent-activity-title' : undefined}>
      {/* Header with title and View All link */}
      <div className="flex items-center justify-between mb-4">
        {showTitle && (
          <h2 id="recent-activity-title" className="text-lg font-semibold">
            {title}
          </h2>
        )}
        <Link
          href={viewAllHref}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View All History
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <Card>
        <CardContent className="py-6">
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: limit }).map((_, i) => (
                <ActivityFeedItemSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Failed to load activities
              </p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <EmptyActivityState />
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
        </CardContent>
      </Card>
    </section>
  )
}

/**
 * Empty state displayed when there are no activities.
 */
function EmptyActivityState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-medium mb-1">No recent activity</h3>
      <p className="text-sm text-muted-foreground max-w-[250px]">
        Sync your emails or upload a statement to get started.
      </p>
    </div>
  )
}

/**
 * Skeleton loading state for the entire feed section.
 */
export function RecentActivityFeedSkeleton({
  showTitle = true,
  limit = 5,
}: {
  showTitle?: boolean
  limit?: number
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        {showTitle && (
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        )}
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      </div>
      <Card>
        <CardContent className="py-6">
          <div className="space-y-6">
            {Array.from({ length: limit }).map((_, i) => (
              <ActivityFeedItemSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export default RecentActivityFeed
