'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CoverageStatsBar } from '@/components/page-specific/coverage-stats-bar'
import { PaymentMethodCoverageCard } from '@/components/page-specific/payment-method-coverage-card'
import { UploadStatementDialog } from '@/components/page-specific/upload-statement-dialog'
import { BillingCycleDialog } from '@/components/page-specific/billing-cycle-dialog'
import { RecentActivityFeed } from '@/components/page-specific/recent-activity-feed'
import { useCoverageData } from '@/hooks/use-coverage-data'
import { useEmailSync } from '@/hooks/use-email-sync'
import { Upload, ChevronDown, ChevronUp } from 'lucide-react'
import type { CoveragePaymentMethod } from '@/hooks/use-coverage-data'

export default function CoveragePage() {
  const { data: coverage, isLoading, error, refetch } = useCoverageData()
  const { triggerSync, isSyncing } = useEmailSync()

  // Upload dialog state
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean
    paymentMethodId: string | null
    expectedPeriod: { start: string; end: string } | null
  }>({ open: false, paymentMethodId: null, expectedPeriod: null })

  // Billing cycle dialog state
  const [billingCycleDialog, setBillingCycleDialog] = useState<{
    open: boolean
    paymentMethod: CoveragePaymentMethod | null
  }>({ open: false, paymentMethod: null })

  // Recent activity toggle
  const [showActivity, setShowActivity] = useState(false)

  const handleSyncNow = async () => {
    const result = await triggerSync()
    if (result?.success) {
      await refetch()
    }
  }

  const handleGapCellClick = (paymentMethodId: string, month: string, billingCycleDay: number) => {
    const [year, m] = month.split('-').map(Number)
    const start = `${year}-${String(m).padStart(2, '0')}-${String(billingCycleDay).padStart(2, '0')}`
    // End is day before cycle start of next month
    const nextMonth = new Date(year, m, billingCycleDay - 1)
    const end = nextMonth.toISOString().split('T')[0]

    setUploadDialog({
      open: true,
      paymentMethodId,
      expectedPeriod: { start, end },
    })
  }

  const handleUploadComplete = async () => {
    await refetch()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Bar */}
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : coverage && (
        <CoverageStatsBar
          coveragePercent={coverage.overallCoveragePercent}
          pendingCount={coverage.pendingTotal}
          lastEmailSync={coverage.lastEmailSync}
          emailsPendingReview={coverage.emailsPendingReview}
          isSyncing={isSyncing}
          onSyncNow={handleSyncNow}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load coverage data: {error}
          <Button variant="link" size="sm" className="ml-2 text-destructive" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Section header + Upload button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payment Methods</h2>
        <Button
          size="sm"
          onClick={() => setUploadDialog({ open: true, paymentMethodId: null, expectedPeriod: null })}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Statement
        </Button>
      </div>

      {/* Payment Method Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : coverage ? (
        <div className="space-y-4">
          {coverage.paymentMethods.map(pm => (
            <PaymentMethodCoverageCard
              key={pm.id}
              paymentMethod={pm}
              months={coverage.months}
              cells={coverage.cells[pm.id] || {}}
              onMissingCellClick={(month) => handleGapCellClick(pm.id, month, pm.inferredBillingCycleDay)}
              onSettingsClick={() => setBillingCycleDialog({ open: true, paymentMethod: pm })}
            />
          ))}
        </div>
      ) : null}

      {/* Collapsible Recent Activity */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground"
          onClick={() => setShowActivity(!showActivity)}
        >
          Recent Activity
          {showActivity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {showActivity && (
          <div className="mt-3">
            <RecentActivityFeed showTitle={false} />
          </div>
        )}
      </div>

      {/* Upload Statement Dialog */}
      <UploadStatementDialog
        open={uploadDialog.open}
        onOpenChange={(open) => setUploadDialog(prev => ({ ...prev, open }))}
        paymentMethodId={uploadDialog.paymentMethodId}
        expectedPeriod={uploadDialog.expectedPeriod}
        onUploadComplete={handleUploadComplete}
      />

      {/* Billing Cycle Dialog */}
      {billingCycleDialog.paymentMethod && (
        <BillingCycleDialog
          open={billingCycleDialog.open}
          onOpenChange={(open) => setBillingCycleDialog(prev => ({ ...prev, open }))}
          paymentMethod={billingCycleDialog.paymentMethod}
          onSave={() => refetch()}
        />
      )}
    </div>
  )
}
