'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ImportStatusCard } from '@/components/page-specific/import-status-card'
import { EmailSyncCard } from '@/components/page-specific/email-sync-card'
import { QuickActionsGrid } from '@/components/page-specific/quick-actions-grid'
import { useImportStatusCounts } from '@/hooks/use-import-status-counts'
import { useEmailSync } from '@/hooks/use-email-sync'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const { counts, sync, isLoading, refetch } = useImportStatusCounts()
  const { triggerSync, isSyncing, syncError } = useEmailSync()

  const handleSyncNow = async () => {
    const result = await triggerSync()
    if (result?.success) {
      // Refetch status counts to update the dashboard
      await refetch()
    }
  }

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
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
        syncError={syncError}
      />

      {/* Quick Actions Section */}
      <QuickActionsGrid />

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
