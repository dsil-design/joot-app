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
import { Upload, ChevronDown, ChevronUp, Loader2, FileText } from 'lucide-react'
import Link from 'next/link'
import type { CoveragePaymentMethod } from '@/hooks/use-coverage-data'

export default function CoveragePage() {
  const { data: coverage, isLoading, error, refetch } = useCoverageData()
  const { triggerSync, isSyncing, syncError } = useEmailSync()

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

  /**
   * Try to extract a month/year from a statement filename.
   * Common patterns: "20251018-statements-..." or "...October_2025..." or "...2025-10-14..."
   */
  function formatUploadDate(filename: string, createdAt: string): string | null {
    // Pattern: YYYYMMDD at start
    const yyyymmdd = filename.match(/^(\d{4})(\d{2})\d{2}/)
    if (yyyymmdd) {
      const d = new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1)
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    // Pattern: YYYY-MM-DD
    const isoDash = filename.match(/(\d{4})-(\d{2})-\d{2}/)
    if (isoDash) {
      const d = new Date(parseInt(isoDash[1]), parseInt(isoDash[2]) - 1)
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    // Pattern: month name + year (e.g. "October_2025", "October 2025")
    const monthName = filename.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[_\s-]?(\d{4})/i)
    if (monthName) {
      return `${monthName[1]} ${monthName[2]}`
    }
    return null
  }

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
          syncError={syncError}
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

      {/* Pending uploads banner */}
      {coverage && coverage.pendingUploads?.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">
            {coverage.pendingUploads.length === 1
              ? 'You have an uploaded statement ready to process'
              : `You have ${coverage.pendingUploads.length} uploaded statements ready to process`}
          </p>
          <div className="space-y-2">
            {coverage.pendingUploads.map(upload => (
              <Link
                key={upload.id}
                href={`/imports/statements/${upload.id}`}
                className="flex items-center gap-3 rounded-md bg-white/70 p-3 hover:bg-white transition-colors"
              >
                {upload.status === 'processing' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-blue-900">
                      {upload.paymentMethodName}
                    </span>
                    {formatUploadDate(upload.filename, upload.createdAt) && (
                      <span className="text-sm text-blue-700">
                        &middot; {formatUploadDate(upload.filename, upload.createdAt)}
                      </span>
                    )}
                    <span className="text-xs text-blue-600">
                      {upload.status === 'processing' ? 'Processing...' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-500 truncate">
                    {upload.filename}
                  </p>
                </div>
                <span className="text-xs text-blue-500">
                  View &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Section header + Upload button */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold truncate">Payment Methods</h2>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => setUploadDialog({ open: true, paymentMethodId: null, expectedPeriod: null })}
        >
          <Upload className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Upload Statement</span>
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
