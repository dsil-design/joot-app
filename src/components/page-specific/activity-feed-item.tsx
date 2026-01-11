'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  CheckCircle2,
  Clock,
  Upload,
  AlertCircle,
  Mail,
  FileText,
  Link2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IMPORT_ACTIVITY_TYPE } from '@/lib/types/email-imports'

/**
 * Visual types for activity feed items.
 * These determine the color and icon styling.
 */
export type ActivityFeedItemType = 'success' | 'waiting' | 'upload' | 'error' | 'info'

/**
 * Maps activity_type from database to visual type.
 */
export function getActivityFeedItemType(activityType: string): ActivityFeedItemType {
  switch (activityType) {
    case IMPORT_ACTIVITY_TYPE.EMAIL_MATCH:
    case IMPORT_ACTIVITY_TYPE.TRANSACTION_MATCHED:
    case IMPORT_ACTIVITY_TYPE.TRANSACTION_CREATED:
    case IMPORT_ACTIVITY_TYPE.EMAIL_IMPORT:
    case IMPORT_ACTIVITY_TYPE.BATCH_IMPORT:
      return 'success'
    case IMPORT_ACTIVITY_TYPE.EMAIL_SYNC:
      return 'info'
    case IMPORT_ACTIVITY_TYPE.STATEMENT_UPLOAD:
    case IMPORT_ACTIVITY_TYPE.STATEMENT_PROCESSED:
      return 'upload'
    case IMPORT_ACTIVITY_TYPE.TRANSACTION_SKIPPED:
      return 'waiting'
    case IMPORT_ACTIVITY_TYPE.ERROR:
      return 'error'
    default:
      return 'info'
  }
}

/**
 * Gets the appropriate icon for an activity type.
 */
export function getActivityIcon(activityType: string): LucideIcon {
  switch (activityType) {
    case IMPORT_ACTIVITY_TYPE.EMAIL_SYNC:
      return Mail
    case IMPORT_ACTIVITY_TYPE.EMAIL_MATCH:
    case IMPORT_ACTIVITY_TYPE.TRANSACTION_MATCHED:
      return Link2
    case IMPORT_ACTIVITY_TYPE.EMAIL_IMPORT:
    case IMPORT_ACTIVITY_TYPE.BATCH_IMPORT:
    case IMPORT_ACTIVITY_TYPE.TRANSACTION_CREATED:
      return CheckCircle2
    case IMPORT_ACTIVITY_TYPE.STATEMENT_UPLOAD:
      return Upload
    case IMPORT_ACTIVITY_TYPE.STATEMENT_PROCESSED:
      return FileText
    case IMPORT_ACTIVITY_TYPE.TRANSACTION_SKIPPED:
      return Clock
    case IMPORT_ACTIVITY_TYPE.ERROR:
      return AlertCircle
    default:
      return CheckCircle2
  }
}

const typeStyles: Record<ActivityFeedItemType, {
  iconColor: string
  bgColor: string
}> = {
  success: {
    iconColor: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  waiting: {
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  upload: {
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  error: {
    iconColor: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  info: {
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
  },
}

export interface ActivityFeedItemProps {
  /** Visual type determining color scheme */
  type: ActivityFeedItemType
  /** Main activity title */
  title: string
  /** Additional details or description */
  description?: string
  /** Human-readable timestamp */
  timestamp: string
  /** Custom icon override */
  icon?: LucideIcon
  /** Additional metadata to display */
  metadata?: {
    transactionsAffected?: number
    totalAmount?: number
    currency?: string
  }
}

/**
 * ActivityFeedItem - A single activity entry in the recent activity feed.
 *
 * Displays an icon, title, description, and timestamp in a timeline-like format.
 * Color-coded based on activity type (success, waiting, upload, error, info).
 */
export function ActivityFeedItem({
  type,
  title,
  description,
  timestamp,
  icon: CustomIcon,
  metadata,
}: ActivityFeedItemProps) {
  const styles = typeStyles[type]
  const Icon = CustomIcon ?? CheckCircle2

  return (
    <div className="flex items-start gap-4">
      <div className="relative flex items-center justify-center shrink-0">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center",
          styles.bgColor
        )}>
          <Icon className={cn("h-4 w-4", styles.iconColor)} aria-hidden="true" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {metadata && (metadata.transactionsAffected || metadata.totalAmount) && (
          <p className="text-xs text-muted-foreground">
            {metadata.transactionsAffected && (
              <span>{metadata.transactionsAffected} transaction{metadata.transactionsAffected !== 1 ? 's' : ''}</span>
            )}
            {metadata.transactionsAffected && metadata.totalAmount && <span> &middot; </span>}
            {metadata.totalAmount && metadata.currency && (
              <span>
                {metadata.currency === 'THB' ? '฿' : '$'}
                {metadata.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {metadata.currency !== 'USD' && ` ${metadata.currency}`}
              </span>
            )}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
      </div>
    </div>
  )
}

/**
 * Skeleton loading state for ActivityFeedItem
 */
export function ActivityFeedItemSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2 mb-1" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  )
}

export default ActivityFeedItem
