"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { LoadMoreTrigger } from "@/hooks/use-infinite-scroll"
import { useEmailHubFilters, type EmailHubStatus } from "@/hooks/use-email-hub-filters"
import { useEmailHubStats } from "@/hooks/use-email-hub-stats"
import { useEmailTransactions, type EmailTransactionRow } from "@/hooks/use-email-transactions"
import { useEmailSync } from "@/hooks/use-email-sync"
import { useEmailHubActions } from "@/hooks/use-email-hub-actions"
import { useTransactions } from "@/hooks"
import { EmailHubFilterBar } from "@/components/page-specific/email-hub-filter-bar"
import { EmailHubStatsBar } from "@/components/page-specific/email-hub-stats-bar"
import {
  EmailTransactionCard,
  EmailTransactionCardSkeleton,
} from "@/components/page-specific/email-transaction-card"
import { EmailDetailPanel } from "@/components/page-specific/email-detail-panel"
import { EmailBatchToolbar } from "@/components/page-specific/email-batch-toolbar"
import { WaitingCallout } from "@/components/page-specific/waiting-callout"
import { EmailHubFunnelBar } from "@/components/page-specific/email-hub-funnel-bar"
import {
  LinkToExistingDialog,
  type LinkSourceItem,
} from "@/components/page-specific/link-to-existing-dialog"
import {
  CreateFromImportDialog,
  type CreateFromImportData,
} from "@/components/page-specific/create-from-import-dialog"
import { RefreshCw, Mail, Inbox, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function EmailHubPage() {
  // Filter state
  const [filters, setFilters] = useEmailHubFilters()

  // Stats
  const { stats, isLoading: statsLoading, refetch: refetchStats } = useEmailHubStats()

  // Email sync
  const { triggerSync, isSyncing } = useEmailSync()

  // Email transactions with infinite scroll
  const {
    items,
    isLoading,
    isInitialLoading,
    hasMore,
    error,
    loadMoreRef,
    reset,
    refresh,
    updateItemByKey,
    removeItemByKey,
  } = useEmailTransactions(filters)

  // Expanded row (one at a time)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Dialog states
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [linkingItemId, setLinkingItemId] = React.useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createDialogData, setCreateDialogData] = React.useState<CreateFromImportData | null>(null)

  // Actions hook
  const {
    skip,
    linkToTransaction,
    batchSkip,
    batchMarkPending,
    isProcessing,
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
  })

  // Transaction creation hook
  const { createTransaction } = useTransactions()

  // Handle sync
  const handleSyncNow = async () => {
    const result = await triggerSync()
    if (result?.success) {
      toast.success(`Synced ${result.synced} email(s)`)
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
  }

  // Handle link action from detail panel
  const handleLink = (emailId: string, txId: string) => {
    linkToTransaction(emailId, txId).then(() => refetchStats())
  }

  // Handle "Link to Existing" - opens search dialog
  const handleLinkManually = (emailId: string) => {
    setLinkingItemId(emailId)
    setLinkDialogOpen(true)
  }

  // Handle link dialog confirmation
  const handleLinkConfirm = async (transactionId: string) => {
    if (!linkingItemId) return
    await linkToTransaction(linkingItemId, transactionId)
    setLinkDialogOpen(false)
    setLinkingItemId(null)
    refetchStats()
  }

  // Handle create new from email
  const handleCreateNew = (emailId: string) => {
    const item = items.find((i) => i.id === emailId)
    if (!item) return
    setCreateDialogData({
      compositeId: `email:${emailId}`,
      description: item.description || item.subject || "",
      amount: item.amount || 0,
      currency: item.currency || "USD",
      date: item.transaction_date || new Date().toISOString().split("T")[0],
    })
    setCreateDialogOpen(true)
  }

  // Handle create+link confirmation
  const handleCreateConfirm = async (
    compositeId: string,
    transactionData: {
      description: string
      amount: number
      currency: string
      date: string
      vendorId?: string
      paymentMethodId?: string
      tagIds?: string[]
      transactionType: string
    }
  ) => {
    const result = await createTransaction({
      description: transactionData.description,
      amount: transactionData.amount,
      originalCurrency: transactionData.currency as "USD" | "THB",
      transactionDate: transactionData.date,
      transactionType: transactionData.transactionType as "expense" | "income",
      vendorId: transactionData.vendorId,
      paymentMethodId: transactionData.paymentMethodId,
      tagIds: transactionData.tagIds,
    })

    if (!result) throw new Error("Failed to create transaction")

    // Extract emailId from compositeId
    const emailId = compositeId.replace("email:", "")
    await linkToTransaction(emailId, result.id)
    toast.success("Transaction created and linked")
    refetchStats()
  }

  // Handle skip
  const handleSkip = (emailId: string) => {
    skip(emailId).then(() => refetchStats())
  }

  // Handle batch operations
  const handleBatchSkip = () => {
    const ids = Array.from(selectedIds)
    batchSkip(ids).then(() => {
      setSelectedIds(new Set())
      refetchStats()
    })
  }

  const handleBatchMarkPending = () => {
    const ids = Array.from(selectedIds)
    batchMarkPending(ids).then(() => {
      setSelectedIds(new Set())
      refetchStats()
    })
  }

  // Get linking item for dialog
  const linkingItem: LinkSourceItem | null = React.useMemo(() => {
    if (!linkingItemId) return null
    const item = items.find((i) => i.id === linkingItemId)
    if (!item) return null
    return {
      id: item.id,
      description: item.description || item.subject || "",
      amount: item.amount || 0,
      currency: item.currency || "USD",
      date: item.transaction_date || "",
    }
  }, [linkingItemId, items])

  // Format last sync time
  const lastSyncTime = stats?.sync?.last_sync_at
  const syncTimeDisplay = lastSyncTime ? formatRelativeTime(lastSyncTime) : "Never"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Receipts</h2>
          <p className="text-sm text-muted-foreground">
            Last sync: {syncTimeDisplay}
          </p>
        </div>
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
          Sync Now
        </Button>
      </div>

      {/* Stats Bar */}
      <EmailHubStatsBar
        stats={stats}
        isLoading={statsLoading}
        onFilterByStatus={handleFilterByStatus}
      />

      {/* Funnel Bar (desktop only) */}
      <EmailHubFunnelBar stats={stats} isLoading={statsLoading} />

      {/* Waiting Callout */}
      <WaitingCallout
        stats={stats}
        onViewWaiting={() => setFilters({ ...filters, status: "waiting_for_statement" })}
      />

      {/* Filter Bar */}
      <EmailHubFilterBar
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Batch Toolbar */}
      {selectedIds.size > 0 && (
        <EmailBatchToolbar
          selectedCount={selectedIds.size}
          onSkipSelected={handleBatchSkip}
          onMarkWaiting={handleBatchMarkPending}
          onClearSelection={() => setSelectedIds(new Set())}
          isProcessing={isProcessing("batch")}
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
                : "No emails synced yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filters.status !== "all" || filters.classification !== "all" || filters.search
                ? "Try adjusting your filters to see more results."
                : "Click 'Sync Now' to fetch your email receipts."}
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
            >
              <EmailDetailPanel
                emailTransaction={item}
                onLink={handleLink}
                onCreateNew={handleCreateNew}
                onSkip={handleSkip}
                isProcessing={isProcessing(item.id)}
              />
            </EmailTransactionCard>
          ))
        )}

        <LoadMoreTrigger
          loadMoreRef={loadMoreRef}
          isLoading={isLoading && !isInitialLoading}
          hasMore={hasMore}
        />
      </div>

      {/* Link to existing dialog */}
      <LinkToExistingDialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open)
          if (!open) setLinkingItemId(null)
        }}
        item={linkingItem}
        onConfirm={handleLinkConfirm}
      />

      {/* Create from import dialog */}
      <CreateFromImportDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setCreateDialogData(null)
        }}
        data={createDialogData}
        onConfirm={handleCreateConfirm}
      />
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
