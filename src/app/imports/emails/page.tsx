"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { LoadMoreTrigger } from "@/hooks/use-infinite-scroll"
import { useEmailHubFilters, type EmailHubStatus } from "@/hooks/use-email-hub-filters"
import { useEmailHubStats } from "@/hooks/use-email-hub-stats"
import { useEmailTransactions, fetchAllFilteredIds } from "@/hooks/use-email-transactions"
import { useEmailSync } from "@/hooks/use-email-sync"
import { useEmailHubActions } from "@/hooks/use-email-hub-actions"
import { EmailHubFilterBar } from "@/components/page-specific/email-hub-filter-bar"
import { EmailHubStatsBar } from "@/components/page-specific/email-hub-stats-bar"
import {
  EmailTransactionCard,
  EmailTransactionCardSkeleton,
} from "@/components/page-specific/email-transaction-card"
import { EmailDetailPanel } from "@/components/page-specific/email-detail-panel"
import { EmailBatchToolbar } from "@/components/page-specific/email-batch-toolbar"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, Mail, Inbox, AlertCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"

export default function EmailHubPage() {
  // Filter state
  const [filters, setFilters] = useEmailHubFilters()

  // Stats
  const { stats, isLoading: statsLoading, refetch: refetchStats } = useEmailHubStats()

  // Email sync & processing
  const { triggerSync, isSyncing, triggerProcess, isProcessing: isBulkProcessing } = useEmailSync()

  // Email transactions with infinite scroll
  const {
    items,
    isLoading,
    isInitialLoading,
    hasMore,
    total,
    error,
    loadMoreRef,
    loadMore,
    reset,
    refresh,
    updateItemByKey,
    removeItemByKey,
  } = useEmailTransactions(filters)

  // Expanded row (one at a time)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isAllSelected, setIsAllSelected] = React.useState(false)
  const [isSelectingAll, setIsSelectingAll] = React.useState(false)

  // Actions hook
  const {
    skip,
    batchSkip,
    batchMarkPending,
    batchProcess,
    processEmail,
    processWithFeedback,
    isProcessing,
    isExtracting,
    isFeedbackProcessing,
  } = useEmailHubActions({
    onStatusChange: (id, status) => {
      updateItemByKey(id, (item) => ({ ...item, status }))
    },
    onItemRemove: (id) => {
      removeItemByKey(id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    onItemUpdate: (id, data) => {
      updateItemByKey(id, (item) => ({ ...item, ...data }))
    },
  })

  // Handle sync (IMAP fetch only, no AI)
  const handleSyncNow = async () => {
    const result = await triggerSync()
    if (result?.success) {
      toast.success(`Fetched ${result.synced} new email(s)`, {
        description: result.synced > 0 ? "Use 'Process' to extract data with AI." : undefined,
      })
      refresh()
      refetchStats()
    } else if (result && !result.success) {
      toast.error("Sync failed", {
        description: result.message || "Check server logs for details.",
      })
      refetchStats()
    } else if (!result) {
      // triggerSync returns null on network/auth errors (error is in syncError state)
      toast.error("Sync failed", {
        description: "Could not connect to email server. Check server logs.",
      })
    }
  }

  // Handle bulk processing (AI extraction on all unprocessed)
  const handleProcessAll = async () => {
    const result = await triggerProcess()
    if (result?.success) {
      toast.success(`Processed ${result.processed} email(s)`, {
        description: `${result.extracted} extracted, ${result.failed} failed, ${result.skipped} skipped`,
      })
      refresh()
      refetchStats()
    }
  }

  // Handle stat card clicks
  const handleFilterByStatus = (status: EmailHubStatus) => {
    setFilters({ ...filters, status })
  }

  // Handle expand toggle
  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // Handle selection toggle
  const handleToggleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
    if (!selected) setIsAllSelected(false)
  }

  // Handle select all filtered results
  const handleSelectAll = async () => {
    setIsSelectingAll(true)
    try {
      const allIds = await fetchAllFilteredIds(filters)
      setSelectedIds(new Set(allIds))
      setIsAllSelected(true)
    } catch {
      toast.error("Failed to select all")
    } finally {
      setIsSelectingAll(false)
    }
  }

  // Handle skip for individual emails (including unprocessed)
  const handleSkip = (emailId: string) => {
    skip(emailId).then(() => refetchStats())
  }

  // Handle process (extract) for unprocessed emails
  const handleProcess = (emailId: string) => {
    processEmail(emailId).then(() => refetchStats())
  }

  // Handle feedback reprocess (Message AI)
  const handleFeedbackReprocess = (emailId: string, userHint: string) => {
    const item = items.find((i) => i.id === emailId)
    if (!item) return
    processWithFeedback(emailId, {
      emailTransactionId: item.email_transaction_id || emailId,
      originalClassification: item.ai_classification,
      originalSkip: item.ai_suggested_skip,
      subject: item.subject,
      fromAddress: item.from_address,
      userHint,
    }).then(() => refetchStats())
  }

  // Handle batch operations (chunking handled inside the hooks)
  const handleBatchSkip = async () => {
    const ids = Array.from(selectedIds)
    await batchSkip(ids)
    setSelectedIds(new Set())
    setIsAllSelected(false)
    refetchStats()
  }

  const handleBatchMarkPending = async () => {
    const ids = Array.from(selectedIds)
    await batchMarkPending(ids)
    setSelectedIds(new Set())
    setIsAllSelected(false)
    refetchStats()
  }

  const handleBatchProcess = async () => {
    const ids = Array.from(selectedIds)
    await batchProcess(ids)
    setSelectedIds(new Set())
    setIsAllSelected(false)
    refetchStats()
  }

  // Format last sync time
  const lastSyncTime = stats?.sync?.last_sync_at
  const syncTimeDisplay = lastSyncTime ? formatRelativeTime(lastSyncTime) : "Never"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Hub</h2>
          <p className="text-sm text-muted-foreground">
            Last sync: {syncTimeDisplay}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing || isBulkProcessing}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Fetch New
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleProcessAll}
            disabled={isBulkProcessing || isSyncing}
          >
            {isBulkProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Process All
          </Button>
        </div>
      </div>

      {/* Stats Bar (global totals, not affected by filters) */}
      <EmailHubStatsBar
        stats={stats}
        isLoading={statsLoading}
        onFilterByStatus={handleFilterByStatus}
      />

      {/* Filters Card */}
      <Card>
        <CardContent>
          <EmailHubFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onSortToggle={() => {
              const newSort = filters.sort === "email_date_desc" ? "email_date_asc" : "email_date_desc"
              setFilters({ ...filters, sort: newSort })
            }}
            totalMatches={total}
          />
        </CardContent>
      </Card>

      {/* Batch Toolbar */}
      {selectedIds.size > 0 && (
        <EmailBatchToolbar
          selectedCount={selectedIds.size}
          totalFilteredCount={total}
          isAllSelected={isAllSelected}
          onSelectAll={handleSelectAll}
          onSkipSelected={handleBatchSkip}
          onMarkPending={handleBatchMarkPending}
          onProcessSelected={handleBatchProcess}
          onClearSelection={() => {
            setSelectedIds(new Set())
            setIsAllSelected(false)
          }}
          isProcessing={isProcessing("batch")}
          isSelectingAll={isSelectingAll}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={reset} className="ml-auto">
            Try again
          </Button>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {isInitialLoading ? (
          <>
            <EmailTransactionCardSkeleton />
            <EmailTransactionCardSkeleton />
            <EmailTransactionCardSkeleton />
            <EmailTransactionCardSkeleton />
            <EmailTransactionCardSkeleton />
          </>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {filters.status !== "all" || filters.classification !== "all" || filters.search
                ? "No matching emails"
                : "No emails fetched yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filters.status !== "all" || filters.classification !== "all" || filters.search
                ? "Try adjusting your filters to see more results."
                : "Click 'Fetch New' to pull emails from IMAP, then 'Process All' to extract data."}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <EmailTransactionCard
              key={item.id}
              data={item}
              isExpanded={expandedId === item.id}
              isSelected={selectedIds.has(item.id)}
              onToggleExpand={() => handleToggleExpand(item.id)}
              onToggleSelect={(selected) => handleToggleSelect(item.id, selected)}
              onProcess={handleProcess}
              onSkip={handleSkip}
              onFeedbackReprocess={handleFeedbackReprocess}
              isProcessingExtraction={isExtracting(item.id)}
              isSkipping={isProcessing(item.id)}
              isFeedbackProcessing={isFeedbackProcessing(item.id)}
            >
              <EmailDetailPanel
                emailTransaction={item}
                onProcess={handleProcess}
                isProcessing={isProcessing(item.id)}
                isProcessingExtraction={isExtracting(item.id)}
              />
            </EmailTransactionCard>
          ))
        )}

        {/* Pagination footer */}
        {items.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Showing {items.length}{total != null ? ` of ${total}` : ""} email{(total ?? items.length) !== 1 ? "s" : ""}
            </p>

            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            )}
          </div>
        )}

        {/* Invisible scroll trigger (backup for auto-loading) */}
        <div ref={loadMoreRef} />
      </div>

    </div>
  )
}

/**
 * Format ISO timestamp to relative time string
 */
function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
