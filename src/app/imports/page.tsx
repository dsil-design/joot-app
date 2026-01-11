'use client'

import { ImportStatusCard } from '@/components/page-specific/import-status-card'
import { EmailSyncCard } from '@/components/page-specific/email-sync-card'
import { QuickActionsGrid } from '@/components/page-specific/quick-actions-grid'
import { RecentActivityFeed } from '@/components/page-specific/recent-activity-feed'
import { useImportStatusCounts } from '@/hooks/use-import-status-counts'
import { useEmailSync } from '@/hooks/use-email-sync'

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
      <RecentActivityFeed />
    </div>
  )
}
