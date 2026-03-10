"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
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
  type ProposalMeta,
} from "@/components/page-specific/create-from-import-dialog"
import {
  useInfiniteScroll,
  LoadMoreTrigger,
} from "@/hooks/use-infinite-scroll"
import { useMatchActions } from "@/hooks/use-match-actions"
import { useCreateAndLink } from "@/hooks/use-create-and-link"
import { useProposalAccept } from "@/hooks/use-proposal-accept"
import type { TransactionProposal } from "@/lib/proposals/types"
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
  Zap,
  Hourglass,
  ChevronDown,
  Focus,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getConfidenceLevel } from "@/components/ui/confidence-indicator"
import { ReviewFocusModal } from "@/components/page-specific/review-focus-modal"

interface QueueStats {
  total: number
  pending: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  thisWeekCount?: number
  resolvedCount?: number
  waitingForStatementCount?: number
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
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    const response = await fetch(`/api/imports/queue?${params.toString()}`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
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
      proposal?: TransactionProposal
      waitingForStatement?: boolean
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
      proposal: item.proposal,
      waitingForStatement: item.waitingForStatement,
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
        waitingForStatementCount: 0,
      },
    }
  }
}

export default function ReviewQueuePage() {
  const [filters, setFilters] = useReviewQueueFilters()
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [reviewFocusOpen, setReviewFocusOpen] = React.useState(false)
  const [reviewFocusIndex, setReviewFocusIndex] = React.useState(0)
  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [linkingItemId, setLinkingItemId] = React.useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createDialogData, setCreateDialogData] = React.useState<CreateFromImportData | null>(null)
  const [isRematching, setIsRematching] = React.useState(false)
  const [waitingSectionOpen, setWaitingSectionOpen] = React.useState(false)
  const [stats, setStats] = React.useState<QueueStats>({
    total: 0,
    pending: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    thisWeekCount: 0,
    resolvedCount: 0,
    waitingForStatementCount: 0,
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
    undoAction,
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
    // No onRejectSuccess — feedback is now handled inline in the card
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

  const [rematchStatus, setRematchStatus] = React.useState<string | null>(null)

  const handleRefreshWithRematch = React.useCallback(async () => {
    setIsRematching(true)
    try {
      setRematchStatus("Finding matches...")
      await fetch('/api/imports/rematch', { method: 'POST' })
      setRematchStatus("Generating proposals...")
      const generateBody: Record<string, unknown> = {}
      if (filters.statementUploadId) {
        generateBody.statementUploadId = filters.statementUploadId
      }
      const res = await fetch('/api/imports/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateBody),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.generated > 0) {
          toast.success(`Generated ${result.generated} proposal${result.generated === 1 ? '' : 's'}`)
        }
      }
    } catch (e) {
      console.error('Refresh failed:', e)
    } finally {
      setIsRematching(false)
      setRematchStatus(null)
    }
    refresh()
  }, [refresh, filters.statementUploadId])

  const { createAndLink } = useCreateAndLink(linkToExisting)
  const { acceptProposal } = useProposalAccept()

  const handleCreateAsNew = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    setCreateDialogData({
      compositeId: id,
      description: item.statementTransaction.description,
      amount: item.statementTransaction.amount,
      currency: item.statementTransaction.currency,
      date: item.statementTransaction.date,
      proposal: item.proposal,
    })
    setCreateDialogOpen(true)
  }

  const handleCreateConfirm = async (
    compositeId: string,
    transactionData: Parameters<typeof createAndLink>[1],
    meta?: ProposalMeta
  ) => {
    const result = await createAndLink(compositeId, transactionData)
    // Update proposal status
    if (meta?.proposalId && result) {
      await acceptProposal(meta, result.id)
      // Track if proposal was modified for UI feedback
      if (meta.proposalFieldsModified) {
        updateItemByKey(compositeId, (item) => ({
          ...item,
          proposalModified: true,
        }))
      }
    }
  }

  const [generatingProposalIds, setGeneratingProposalIds] = React.useState<Set<string>>(new Set())

  const handleRefreshProposal = async (id: string) => {
    setGeneratingProposalIds((prev) => new Set(prev).add(id))
    try {
      const res = await fetch('/api/imports/proposals/generate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compositeId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to generate proposal')
      const { proposal } = data

      if (proposal) {
        updateItemByKey(id, (item) => ({ ...item, proposal }))
        toast.success('Proposal generated', {
          description: `${proposal.overallConfidence}% confidence`,
        })
      } else {
        toast.info('No proposal could be generated')
      }
    } catch (e) {
      console.error('Proposal generation failed:', e)
      toast.error('Failed to generate proposal')
    } finally {
      setGeneratingProposalIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // Reject feedback: submit reason to ai_feedback table, then optionally re-propose
  const submitRejectFeedback = React.useCallback(
    async (compositeIds: string[], reason: string, nextStatus: string) => {
      const firstItem = items.find((i) => compositeIds.includes(i.id))
      try {
        // Save feedback
        await fetch("/api/imports/reject/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            compositeIds,
            reason,
            context: firstItem
              ? {
                  description: firstItem.statementTransaction.description,
                  amount: firstItem.statementTransaction.amount,
                  currency: firstItem.statementTransaction.currency,
                  confidence: firstItem.confidence,
                  vendor: firstItem.matchedTransaction?.vendor_name,
                }
              : undefined,
          }),
        })

        // Update status if not already skipped (the initial reject call set it to 'skipped')
        if (nextStatus !== "skipped") {
          await fetch("/api/imports/reject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emailIds: compositeIds,
              reason,
              nextStatus,
            }),
          })
        }

        // Brief delay so the "Feedback submitted" confirmation is visible
        await new Promise((r) => setTimeout(r, 1500))

        // Handle next status
        if (nextStatus === "pending_review") {
          // Re-queue: restore to pending and regenerate proposal with feedback
          for (const id of compositeIds) {
            updateItemByKey(id, (item) => ({
              ...item,
              status: "pending" as const,
            }))
            await handleRefreshProposal(id)
          }
        } else {
          // "waiting_for_statement" or "skipped" — remove from active queue
          for (const id of compositeIds) {
            removeItemByKey(id)
          }
        }
      } catch (e) {
        console.error("Failed to submit rejection feedback:", e)
      }
    },
    [items, updateItemByKey, removeItemByKey, handleRefreshProposal]
  )

  const handleQuickCreate = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item?.proposal) return

    const p = item.proposal
    try {
      const txData = {
        description: p.description?.value || item.statementTransaction.description,
        amount: p.amount?.value || Math.abs(item.statementTransaction.amount),
        currency: p.currency?.value || item.statementTransaction.currency,
        date: p.date?.value || item.statementTransaction.date,
        vendorId: p.vendor?.value.id || undefined,
        paymentMethodId: p.paymentMethod?.value.id || undefined,
        tagIds: p.tags?.value.map((t) => t.id) || undefined,
        transactionType: p.transactionType?.value || "expense",
      }
      const result = await createAndLink(id, txData)
      if (result && p.id) {
        await acceptProposal({ proposalId: p.id, proposalFieldsModified: false }, result.id)
      }
    } catch {
      // Error handled by createAndLink
    }
  }

  const handleBatchQuickCreate = async (ids: string[]) => {
    let created = 0
    for (const id of ids) {
      try {
        await handleQuickCreate(id)
        created++
      } catch {
        // Continue with remaining
      }
    }
    if (created > 5) {
      toast.success(`Created ${created} transactions`, {
        description: "All proposals accepted",
      })
    }
  }

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

  // Split items into matches, new transactions, and waiting-for-statement
  const waitingItems = items.filter((item) => item.waitingForStatement)
  const activeItems = items.filter((item) => !item.waitingForStatement)
  const matchItems = activeItems.filter((item) => !item.isNew)
  const newItems = activeItems.filter((item) => item.isNew)

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

  // High-confidence proposal items for batch quick create
  const quickCreateItems = newItems.filter(
    (item) =>
      item.status === "pending" &&
      item.proposal &&
      item.proposal.overallConfidence >= 85
  )

  // Pending items for focused review mode
  const pendingItems = React.useMemo(
    () => activeItems.filter((item) => item.status === "pending"),
    [activeItems]
  )

  const handleStartReview = () => {
    if (pendingItems.length === 0) return
    setReviewFocusIndex(0)
    setReviewFocusOpen(true)
  }

  // Inline card rejection handlers
  const handleRejectFeedback = React.useCallback(
    (id: string, reason: string, nextStatus: string) => {
      submitRejectFeedback([id], reason, nextStatus)
    },
    [submitRejectFeedback]
  )

  const handleRejectUndo = React.useCallback(
    (id: string) => {
      undoAction(id)
    },
    [undoAction]
  )

  const handleRejectTimeout = React.useCallback(
    (id: string) => {
      // Timer expired without feedback — revert to pending (stays in pipeline)
      updateItemByKey(id, (item) => ({
        ...item,
        status: "pending" as const,
      }))
    },
    [updateItemByKey]
  )

  const renderMatchCard = (item: MatchCardData) => (
    <MatchCard
      key={item.id}
      data={item}
      selected={selectedIds.has(item.id)}
      loading={isProcessing(item.id) || generatingProposalIds.has(item.id)}
      onApprove={(id) => approve(id)}
      onReject={(id) => reject(id)}
      onLinkManually={handleLinkManually}
      onImport={handleImport}
      onCreateAsNew={handleCreateAsNew}
      onQuickCreate={handleQuickCreate}
      onRefreshProposal={handleRefreshProposal}
      onSelectionChange={handleSelectionChange}
      onRejectFeedback={handleRejectFeedback}
      onRejectUndo={handleRejectUndo}
      onRejectTimeout={handleRejectTimeout}
    />
  )

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Review and link transaction matches
        </p>

        <div className="flex items-center gap-2">
          {pendingItems.length > 0 && (
            <Button
              size="sm"
              onClick={handleStartReview}
              disabled={isLoading}
            >
              <Focus className="h-4 w-4 mr-2" />
              Review ({pendingItems.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshWithRematch}
            disabled={isLoading || isRematching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading || isRematching ? "animate-spin" : ""}`}
            />
            {rematchStatus || "Refresh"}
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
          label="Ready to Link"
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
        ) : activeItems.length === 0 && waitingItems.length === 0 ? (
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
              <Link href="/imports">← Sources</Link>
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
                      Link All High ({highConfidenceItems.length})
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
                  {quickCreateItems.length >= 2 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleBatchQuickCreate(quickCreateItems.map((i) => i.id))}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
                      Quick Create All ({quickCreateItems.length})
                    </Button>
                  )}
                </div>
                {newItems.map(renderMatchCard)}
              </div>
            )}

            {/* Waiting for Statement section — collapsed by default */}
            {waitingItems.length > 0 && (
              <div className="border border-dashed border-muted-foreground/25 rounded-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 rounded-lg transition-colors"
                  onClick={() => setWaitingSectionOpen(!waitingSectionOpen)}
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hourglass className="h-4 w-4" />
                    <span className="font-medium">
                      Waiting for Statement ({waitingItems.length})
                    </span>
                    <span className="text-xs">
                      — Email receipts awaiting credit card statement
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      waitingSectionOpen && "rotate-180"
                    )}
                  />
                </button>
                {waitingSectionOpen && (
                  <div className="px-4 pb-4 space-y-4">
                    {waitingItems.map(renderMatchCard)}
                  </div>
                )}
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

      {/* Focused review modal */}
      <ReviewFocusModal
        open={reviewFocusOpen}
        onOpenChange={setReviewFocusOpen}
        items={pendingItems}
        currentIndex={reviewFocusIndex}
        onIndexChange={setReviewFocusIndex}
        onApprove={(id) => approve(id)}
        onReject={(id) => reject(id)}
        onLinkManually={handleLinkManually}
        onCreateTransaction={handleCreateConfirm}
        isProcessing={isProcessing}
      />
    </div>
  )
}
