"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import {
  ReviewQueueFilterBar,
  useReviewQueueFilters,
  type ReviewQueueFilters,
} from "@/components/page-specific/review-queue-filter-bar"
import {
  MatchCard,
  MatchCardSkeleton,
  type MatchCardData,
  type ImportSource,
  type EmailMetadata,
  type MergedEmailData,
  type CrossCurrencyInfo,
} from "@/components/page-specific/match-card"
import {
  BatchApproveDialog,
  type BatchApproveItem,
  type SourceBreakdown,
} from "@/components/page-specific/batch-approve-dialog"
import {
  LinkToExistingDialog,
  type LinkSourceItem,
} from "@/components/page-specific/link-to-existing-dialog"
import {
  CreateFromImportDialog,
  type CreateFromImportData,
} from "@/components/page-specific/create-from-import-dialog"
import {
  useInfiniteScroll,
  LoadMoreTrigger,
} from "@/hooks/use-infinite-scroll"
import { useMatchActions } from "@/hooks/use-match-actions"
import { useCreateAndLink } from "@/hooks/use-create-and-link"
import {
  ContextBreadcrumb,
} from "@/components/page-specific/context-breadcrumb"
import {
  CheckCircle2,
  FileText,
  Clock,
  AlertCircle,
  CalendarDays,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { getConfidenceLevel } from "@/components/ui/confidence-indicator"

interface QueueStats {
  total: number
  pending: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  thisWeekCount?: number
  resolvedCount?: number
}

async function fetchMatches(
  page: number,
  limit: number,
  filters: ReviewQueueFilters
): Promise<{
  items: MatchCardData[]
  hasMore: boolean
  total: number
  stats: QueueStats
}> {
  const params = new URLSearchParams()
  params.set("page", page.toString())
  params.set("limit", limit.toString())

  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.currency !== "all") params.set("currency", filters.currency)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)
  if (filters.source !== "all") params.set("source", filters.source)
  if (filters.search) params.set("search", filters.search)
  if (filters.statementUploadId) params.set("statementUploadId", filters.statementUploadId)
  if (filters.dateRange?.from) {
    const d = filters.dateRange.from
    params.set("from", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  if (filters.dateRange?.to) {
    const d = filters.dateRange.to
    params.set("to", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }

  try {
    const response = await fetch(`/api/imports/queue?${params.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch review queue')

    const data = await response.json()

    const items: MatchCardData[] = data.items.map((item: {
      id: string
      statementTransaction: { date: string; description: string; amount: number; currency: string; sourceFilename?: string }
      statementFilename: string
      paymentMethod: { id: string; name: string } | null
      paymentMethodType?: string
      matchedTransaction?: { id: string; date: string; amount: number; currency: string; vendor_name?: string; description?: string; payment_method_name?: string }
      confidence: number
      confidenceLevel: 'high' | 'medium' | 'low' | 'none'
      reasons: string[]
      isNew: boolean
      status: 'pending' | 'approved' | 'rejected'
      source?: ImportSource
      emailMetadata?: EmailMetadata
      mergedEmailData?: MergedEmailData
      crossCurrencyInfo?: CrossCurrencyInfo
    }) => ({
      id: item.id,
      statementTransaction: item.statementTransaction,
      matchedTransaction: item.matchedTransaction,
      confidence: item.confidence,
      confidenceLevel: item.confidenceLevel,
      reasons: item.reasons,
      isNew: item.isNew,
      status: item.status,
      sourceStatement: item.paymentMethod?.name
        ? `${item.paymentMethod.name}`
        : item.statementFilename,
      source: item.source,
      emailMetadata: item.emailMetadata,
      mergedEmailData: item.mergedEmailData,
      crossCurrencyInfo: item.crossCurrencyInfo,
    }))

    return {
      items,
      hasMore: data.hasMore,
      total: data.total,
      stats: data.stats,
    }
  } catch (error) {
    console.error('Error fetching matches:', error)
    return {
      items: [],
      hasMore: false,
      total: 0,
      stats: {
        total: 0,
        pending: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        thisWeekCount: 0,
        resolvedCount: 0,
      },
    }
  }
}

export default function ReviewQueuePage() {
  const [filters, setFilters] = useReviewQueueFilters()
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [linkingItemId, setLinkingItemId] = React.useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createDialogData, setCreateDialogData] = React.useState<CreateFromImportData | null>(null)
  const [stats, setStats] = React.useState<QueueStats>({
    total: 0,
    pending: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    thisWeekCount: 0,
    resolvedCount: 0,
  })

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
  } = useInfiniteScroll<MatchCardData>({
    fetchFn: async (page, limit) => {
      const result = await fetchMatches(page, limit, filters)
      setStats(result.stats)
      return result
    },
    limit: 20,
    deps: [
      filters.status,
      filters.currency,
      filters.confidence,
      filters.source,
      filters.search,
      filters.statementUploadId,
      filters.dateRange?.from?.getTime(),
      filters.dateRange?.to?.getTime(),
    ],
    keyExtractor: (item) => item.id,
  })

  const {
    approve,
    reject,
    linkToExisting,
    batchApprove,
    isProcessing,
  } = useMatchActions({
    onStatusChange: (id, status) => {
      updateItemByKey(id, (item) => ({
        ...item,
        status: status as MatchCardData["status"],
      }))
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

  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleLinkManually = (id: string) => {
    setLinkingItemId(id)
    setLinkDialogOpen(true)
  }

  const handleLinkConfirm = async (transactionIds: string[]) => {
    if (!linkingItemId) return
    for (const txId of transactionIds) {
      await linkToExisting(linkingItemId, txId)
    }
    setLinkDialogOpen(false)
    setLinkingItemId(null)
  }

  const { createAndLink } = useCreateAndLink(linkToExisting)

  const handleCreateAsNew = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    setCreateDialogData({
      compositeId: id,
      description: item.statementTransaction.description,
      amount: item.statementTransaction.amount,
      currency: item.statementTransaction.currency,
      date: item.statementTransaction.date,
    })
    setCreateDialogOpen(true)
  }

  const handleCreateConfirm = createAndLink

  const handleImport = (id: string) => {
    handleCreateAsNew(id)
  }

  const linkingItem: LinkSourceItem | null = React.useMemo(() => {
    if (!linkingItemId) return null
    const item = items.find((i) => i.id === linkingItemId)
    if (!item) return null
    return {
      id: item.id,
      description: item.statementTransaction.description,
      amount: item.statementTransaction.amount,
      currency: item.statementTransaction.currency,
      date: item.statementTransaction.date,
    }
  }, [linkingItemId, items])

  // Split items into matches and new transactions
  const matchItems = items.filter((item) => !item.isNew)
  const newItems = items.filter((item) => item.isNew)

  // High-confidence items for batch approve (matches section only)
  const highConfidenceItems = matchItems.filter(
    (item) =>
      item.status === "pending" &&
      getConfidenceLevel(item.confidence) === "high"
  )

  const handleBatchApprove = async () => {
    const ids = highConfidenceItems.map((item) => item.id)
    await batchApprove(ids)
    setBatchDialogOpen(false)
  }

  const batchApproveItems: BatchApproveItem[] = highConfidenceItems.map(
    (item) => ({
      id: item.id,
      description: item.statementTransaction.description,
      amount: item.statementTransaction.amount,
      currency: item.statementTransaction.currency,
      date: item.statementTransaction.date,
      confidence: item.confidence,
    })
  )

  const batchSourceBreakdown: SourceBreakdown = React.useMemo(() => {
    const breakdown = { email: 0, statement: 0, merged: 0 }
    for (const item of highConfidenceItems) {
      if (item.source === "email") breakdown.email++
      else if (item.source === "merged") breakdown.merged++
      else breakdown.statement++
    }
    return breakdown
  }, [highConfidenceItems])

  // Stat card click handlers
  const handleStatClick = (filter: Partial<ReviewQueueFilters>) => {
    setFilters({ ...filters, ...filter })
  }

  // Ready to approve count (pending + high confidence)
  const readyToApprove = items.filter(
    (item) => item.status === "pending" && getConfidenceLevel(item.confidence) === "high"
  ).length

  const renderMatchCard = (item: MatchCardData) => (
    <MatchCard
      key={item.id}
      data={item}
      selected={selectedIds.has(item.id)}
      loading={isProcessing(item.id)}
      onApprove={(id) => approve(id)}
      onReject={(id) => reject(id)}
      onLinkManually={handleLinkManually}
      onImport={handleImport}
      onCreateAsNew={handleCreateAsNew}
      onSelectionChange={handleSelectionChange}
    />
  )

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve transaction matches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats cards — user-facing labels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Review"
          value={stats.pending}
          isLoading={isInitialLoading}
          className="text-amber-600 cursor-pointer hover:ring-1 hover:ring-amber-200 rounded-lg"
          onClick={() => handleStatClick({ status: "pending" })}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Ready to Approve"
          value={readyToApprove}
          isLoading={isInitialLoading}
          className="text-green-600 cursor-pointer hover:ring-1 hover:ring-green-200 rounded-lg"
          onClick={() => handleStatClick({ status: "pending", confidence: "high" })}
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="This Week"
          value={stats.thisWeekCount ?? 0}
          isLoading={isInitialLoading}
          className="cursor-pointer hover:ring-1 hover:ring-zinc-200 rounded-lg"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Resolved"
          value={stats.resolvedCount ?? 0}
          isLoading={isInitialLoading}
          className="text-zinc-500 cursor-pointer hover:ring-1 hover:ring-zinc-200 rounded-lg"
        />
      </div>

      {/* Context breadcrumb when filtered by statement */}
      {filters.statementUploadId && (
        <ContextBreadcrumb
          statementUploadId={filters.statementUploadId}
          onClearFilter={() => setFilters({ ...filters, statementUploadId: "" })}
        />
      )}

      {/* Filter bar */}
      <ReviewQueueFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        syncWithUrl={true}
      />

      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="ml-auto"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Match cards — two-section layout */}
      <div className="space-y-6">
        {isInitialLoading ? (
          <>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No matches to review</h3>
            <p className="text-muted-foreground mb-4">
              {filters.status !== "all" ||
              filters.currency !== "all" ||
              filters.search
                ? "Try adjusting your filters to see more results."
                : "Upload a statement to start matching transactions."}
            </p>
            <Button asChild variant="outline">
              <Link href="/imports">← Overview</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Proposed Matches section */}
            {matchItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Proposed Matches ({matchItems.length})
                  </h2>
                  {highConfidenceItems.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setBatchDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve All High ({highConfidenceItems.length})
                    </Button>
                  )}
                </div>
                {matchItems.map(renderMatchCard)}
              </div>
            )}

            {/* New Transactions section */}
            {newItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    New Transactions ({newItems.length})
                  </h2>
                </div>
                {newItems.map(renderMatchCard)}
              </div>
            )}
          </>
        )}

        {/* Load more trigger */}
        <LoadMoreTrigger
          loadMoreRef={loadMoreRef}
          isLoading={isLoading && !isInitialLoading}
          hasMore={hasMore}
        />
      </div>

      {/* Batch approve dialog */}
      <BatchApproveDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        items={batchApproveItems}
        onConfirm={handleBatchApprove}
        sourceBreakdown={batchSourceBreakdown}
      />

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
