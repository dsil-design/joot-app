'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ImportStatusCard } from '@/components/page-specific/import-status-card'
import { useImportStatusCounts } from '@/hooks/use-import-status-counts'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  RefreshCw,
  Upload,
  Search,
  History,
  Settings,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Email Sync Card Component
interface EmailSyncCardProps {
  isLoading?: boolean
  lastSyncedAt?: string | null
  folder?: string
  totalSynced?: number
  isConnected?: boolean
  onSyncNow?: () => void
  isSyncing?: boolean
}

function EmailSyncCard({
  isLoading = true,
  lastSyncedAt = null,
  folder = 'Transactions',
  totalSynced = 0,
  // isConnected will be used when we implement connection status display
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isConnected = true,
  onSyncNow,
  isSyncing = false
}: EmailSyncCardProps) {
  // Determine sync status indicator color
  const getSyncStatusColor = () => {
    if (!lastSyncedAt) return 'bg-gray-400'

    const lastSync = new Date(lastSyncedAt)
    const now = new Date()
    const hoursSince = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

    if (hoursSince < 1) return 'bg-green-500'
    if (hoursSince < 6) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const formatLastSynced = () => {
    if (!lastSyncedAt) return 'Never synced'

    const lastSync = new Date(lastSyncedAt)
    const now = new Date()
    const hoursSince = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

    if (hoursSince < 1) {
      const minutes = Math.round(hoursSince * 60)
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Email Sync</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Status indicator */}
              <div className={cn(
                "h-3 w-3 rounded-full mt-1.5",
                getSyncStatusColor()
              )} />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Last synced: {formatLastSynced()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Folder: {folder}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total synced: {totalSynced.toLocaleString()} emails
                </p>
              </div>
            </div>
            <Button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="shrink-0"
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-2",
                isSyncing && "animate-spin"
              )} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick Action Button Component
interface QuickActionProps {
  title: string
  icon: React.ReactNode
  href: string
  variant?: 'primary' | 'secondary'
}

function QuickActionButton({ title, icon, href, variant = 'secondary' }: QuickActionProps) {
  return (
    <Link href={href}>
      <Card className={cn(
        "cursor-pointer transition-colors h-full",
        variant === 'primary'
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "hover:bg-muted/50"
      )}>
        <CardContent className="flex flex-col items-center justify-center py-6 gap-2">
          {icon}
          <span className="text-sm font-medium text-center">{title}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

// Activity Item Component
interface ActivityItemProps {
  type: 'success' | 'waiting' | 'upload' | 'error'
  title: string
  description: string
  timestamp: string
}

function ActivityItem({ type, title, description, timestamp }: ActivityItemProps) {
  const typeStyles = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      dotColor: 'bg-green-500',
    },
    waiting: {
      icon: Clock,
      iconColor: 'text-blue-500',
      dotColor: 'bg-blue-500',
    },
    upload: {
      icon: Upload,
      iconColor: 'text-purple-500',
      dotColor: 'bg-purple-500',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-500',
      dotColor: 'bg-red-500',
    },
  }

  const styles = typeStyles[type]
  const Icon = styles.icon

  return (
    <div className="flex items-start gap-4">
      <div className="relative flex items-center justify-center">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center",
          type === 'success' && 'bg-green-100',
          type === 'waiting' && 'bg-blue-100',
          type === 'upload' && 'bg-purple-100',
          type === 'error' && 'bg-red-100'
        )}>
          <Icon className={cn("h-4 w-4", styles.iconColor)} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
      </div>
    </div>
  )
}

// Loading Activity Skeleton
function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2 mb-1" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  )
}

export default function ImportsDashboardPage() {
  const { counts, sync, isLoading } = useImportStatusCounts()

  return (
    <div className="flex flex-col gap-6">
      {/* Status Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ImportStatusCard
          title="Pending Review"
          value={isLoading ? null : (counts?.pending ?? 0)}
          description="Emails awaiting review"
          variant="pending"
          href="/imports/review?status=pending"
        />
        <ImportStatusCard
          title="Waiting for Statement"
          value={isLoading ? null : (counts?.waiting ?? 0)}
          description="THB receipts awaiting USD match"
          variant="waiting"
          href="/imports/review?status=waiting"
        />
        <ImportStatusCard
          title="Matched (30 days)"
          value={isLoading ? null : (counts?.matched ?? 0)}
          description="Successfully matched transactions"
          variant="success"
          href="/imports/review?status=matched"
        />
      </div>

      {/* Email Sync Card */}
      <EmailSyncCard
        isLoading={isLoading}
        lastSyncedAt={sync?.lastSyncedAt ?? null}
        folder={sync?.folder ?? 'Transactions'}
        totalSynced={sync?.totalSynced ?? 0}
        isConnected={true}
        onSyncNow={() => {
          // TODO: P1-024 will implement actual sync
        }}
        isSyncing={false}
      />

      {/* Quick Actions Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            title="Upload Statement"
            icon={<Upload className="h-6 w-6" />}
            href="/imports/statements"
            variant="primary"
          />
          <QuickActionButton
            title="Review Queue"
            icon={<Search className="h-6 w-6" />}
            href="/imports/review"
          />
          <QuickActionButton
            title="View History"
            icon={<History className="h-6 w-6" />}
            href="/imports/history"
          />
          <QuickActionButton
            title="Import Settings"
            icon={<Settings className="h-6 w-6" />}
            href="/settings"
          />
        </div>
      </div>

      {/* Recent Activity Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Link
            href="/imports/history"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Card>
          <CardContent className="py-6">
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <ActivitySkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Example activity items - would be fetched from API */}
                <ActivityItem
                  type="success"
                  title="Matched 12 Grab receipts to Chase charges"
                  description="12 high-confidence matches - $142.50 total"
                  timestamp="Today, 10:15 AM"
                />
                <ActivityItem
                  type="waiting"
                  title="8 Bolt receipts waiting for statement"
                  description="Expected: ~$35.20 USD on next Chase statement"
                  timestamp="Today, 9:30 AM"
                />
                <ActivityItem
                  type="success"
                  title="Imported 5 Bangkok Bank transfers"
                  description="฿6,450.00 THB - Payment methods, groceries, utilities"
                  timestamp="Dec 30, 4:20 PM"
                />
                <ActivityItem
                  type="upload"
                  title="Processed Chase December statement"
                  description="38 matches found - 7 new transactions - 45 total processed"
                  timestamp="Dec 30, 11:45 AM"
                />
                <ActivityItem
                  type="success"
                  title="Bulk approved 15 high-confidence matches"
                  description="$456.78 USD imported successfully"
                  timestamp="Dec 29, 3:15 PM"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
