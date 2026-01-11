'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Mail, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmailSyncCardProps {
  /** Whether the card is in loading state */
  isLoading?: boolean
  /** ISO timestamp of last sync */
  lastSyncedAt?: string | null
  /** Email folder being synced */
  folder?: string
  /** Total number of emails synced */
  totalSynced?: number
  /** Whether the email connection is active (reserved for future use) */
  isConnected?: boolean
  /** Callback when Sync Now button is clicked */
  onSyncNow?: () => void
  /** Whether a sync is currently in progress */
  isSyncing?: boolean
  /** Error message from last sync attempt */
  syncError?: string | null
}

/**
 * Determines the sync status indicator color based on time since last sync.
 *
 * - Green: synced < 1 hour ago
 * - Yellow: synced 1-6 hours ago
 * - Gray: synced > 6 hours ago or never synced
 */
function getSyncStatusColor(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'bg-gray-400'

  const lastSync = new Date(lastSyncedAt)
  const now = new Date()
  const hoursSince = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

  if (hoursSince < 1) return 'bg-green-500'
  if (hoursSince < 6) return 'bg-yellow-500'
  return 'bg-gray-400'
}

/**
 * Formats the last synced timestamp into a human-readable string.
 *
 * - < 1 hour: "X minute(s) ago"
 * - 1-24 hours: "X hour(s) ago"
 * - > 24 hours: "Mon DD, HH:MM AM/PM"
 */
function formatLastSynced(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'Never synced'

  const lastSync = new Date(lastSyncedAt)
  const now = new Date()
  const hoursSince = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

  if (hoursSince < 1) {
    const minutes = Math.round(hoursSince * 60)
    if (minutes < 1) return 'Just now'
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  }
  if (hoursSince < 24) {
    const hours = Math.round(hoursSince)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  }
  return lastSync.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

/**
 * Gets the sync status label based on time since last sync.
 */
function getSyncStatusLabel(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'Not synced'

  const lastSync = new Date(lastSyncedAt)
  const now = new Date()
  const hoursSince = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

  if (hoursSince < 1) return 'Up to date'
  if (hoursSince < 6) return 'Sync recommended'
  return 'Sync needed'
}

/**
 * EmailSyncCard displays the email sync status and provides a manual sync trigger.
 *
 * Features:
 * - Color-coded status indicator (green/yellow/gray based on last sync time)
 * - Last sync timestamp display
 * - Folder name and total synced count
 * - "Sync Now" button with loading state
 * - Error display for failed sync attempts
 */
export function EmailSyncCard({
  isLoading = false,
  lastSyncedAt = null,
  folder = 'Transactions',
  totalSynced = 0,
  isConnected: _isConnected = true,
  onSyncNow,
  isSyncing = false,
  syncError = null
}: EmailSyncCardProps) {
  const statusColor = getSyncStatusColor(lastSyncedAt)
  const statusLabel = getSyncStatusLabel(lastSyncedAt)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-lg">Email Sync</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <EmailSyncCardSkeleton />
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Status indicator */}
              <div
                className={cn(
                  "h-3 w-3 rounded-full mt-1.5 shrink-0",
                  statusColor
                )}
                role="status"
                aria-label={statusLabel}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Last synced: {formatLastSynced(lastSyncedAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Folder: {folder}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total synced: {totalSynced.toLocaleString()} emails
                </p>
                {syncError && (
                  <p className="text-sm text-red-500" role="alert">
                    Error: {syncError}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="shrink-0"
              aria-label={isSyncing ? 'Syncing emails...' : 'Sync emails now'}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4 mr-2",
                  isSyncing && "animate-spin"
                )}
                aria-hidden="true"
              />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loading state for EmailSyncCard
 */
function EmailSyncCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      </div>
      <Skeleton className="h-10 w-24" />
    </div>
  )
}

export default EmailSyncCard
