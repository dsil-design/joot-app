'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatementCoverageGrid } from '@/components/page-specific/statement-coverage-grid'
import { QuickActionsGrid } from '@/components/page-specific/quick-actions-grid'
import { RecentActivityFeed } from '@/components/page-specific/recent-activity-feed'
import { useCoverageData } from '@/hooks/use-coverage-data'
import { useEmailSync } from '@/hooks/use-email-sync'
import { AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react'

export default function ImportsDashboardPage() {
  const { data: coverage, isLoading, refetch } = useCoverageData()
  const { triggerSync, isSyncing, syncError } = useEmailSync()

  const handleSyncNow = async () => {
    const result = await triggerSync()
    if (result?.success) {
      await refetch()
    }
  }

  const pendingTotal = coverage?.pendingTotal ?? 0
  const highConfidenceCount = coverage?.highConfidenceCount ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Attention Required Banner */}
      {!isLoading && pendingTotal > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-900">
                    {pendingTotal} match{pendingTotal !== 1 ? 'es' : ''} pending review
                    {highConfidenceCount > 0 && (
                      <span className="text-amber-700 font-normal">
                        {' '}&mdash; {highConfidenceCount} high confidence
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button asChild size="sm">
                <Link href="/imports/review?status=pending">
                  Review Now
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statement Coverage Grid */}
      <StatementCoverageGrid data={coverage} isLoading={isLoading} />

      {/* Quick Actions + Sync Email */}
      <div className="space-y-4">
        <QuickActionsGrid />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync Email'}
          </Button>
          {syncError && (
            <span className="text-xs text-destructive">{syncError}</span>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivityFeed />
    </div>
  )
}
