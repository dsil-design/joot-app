"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
  type MergedPaymentSlipData,
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
  RefreshCw,
  Sparkles,
  Zap,
  Hourglass,
  ChevronDown,
  Focus,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getConfidenceLevel } from "@/components/ui/confidence-indicator"
import { RejectFeedbackToast } from "@/components/page-specific/reject-feedback-toast"
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
      mergedPaymentSlipData?: MergedPaymentSlipData
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
      mergedPaymentSlipData: item.mergedPaymentSlipData,
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

  // submitRejectFeedback is defined below (after handleRefreshProposal) — use a ref to avoid circular deps
  const submitRejectFeedbackRef = React.useRef<(ids: string[], reason: string, nextStatus: string) => void>(() => {})

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
    onRejectSuccess: (ids, undo) => {
      toast.custom(
        (t) => (
          <RejectFeedbackToast
            compositeIds={ids}
            count={ids.length}
            onSubmitFeedback={(cIds, reason, nextStatus) =>
              submitRejectFeedbackRef.current(cIds, reason, nextStatus)
            }
            onUndo={() => {
              undo()
              toast.dismiss(t)
            }}
            onDismiss={() => {
              // No feedback given — item is already skipped server-side and hidden via status filter.
              // Remove from data array entirely so it doesn't linger.
              for (const id of ids) {
                removeItemByKey(id)
              }
              toast.dismiss(t)
            }}
          />
        ),
        { duration: 20000 }
      )
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
    handleFocusItemRemove(linkingItemId)
    setLinkDialogOpen(false)
    setLinkingItemId(null)
  }

  const [isGeneratingProposals, setIsGeneratingProposals] = React.useState(false)

  const buildFilterBody = React.useCallback(() => {
    const filterBody: Record<string, unknown> = {}
    if (filters.source !== "all") filterBody.source = filters.source
    if (filters.currency !== "all") filterBody.currency = filters.currency
    if (filters.statementUploadId) filterBody.statementUploadId = filters.statementUploadId
    if (filters.dateRange?.from) {
      const d = filters.dateRange.from
      filterBody.from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    }
    if (filters.dateRange?.to) {
      const d = filters.dateRange.to
      filterBody.to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    }
    return filterBody
  }, [filters])

  const handleRefresh = React.useCallback(async () => {
    setIsRematching(true)
    try {
      const res = await fetch('/api/imports/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFilterBody()),
      })
      if (res.ok) {
        const { stats: rematchStats } = await res.json()
        const totalNew = (rematchStats?.statementNewMatchesFound || 0) + (rematchStats?.emailNewMatchesFound || 0)
        if (totalNew > 0) {
          toast.success(`Found ${totalNew} new match${totalNew === 1 ? '' : 'es'}`)
        } else {
          toast.info('No new matches found')
        }
      }
    } catch (e) {
      console.error('Refresh failed:', e)
      toast.error('Refresh failed')
    } finally {
      setIsRematching(false)
    }
    refresh()
  }, [refresh, buildFilterBody])

  const handleGenerateProposals = React.useCallback(async () => {
    setIsGeneratingProposals(true)
    try {
      const res = await fetch('/api/imports/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFilterBody()),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.generated > 0) {
          toast.success(`Generated ${result.generated} proposal${result.generated === 1 ? '' : 's'}`)
        } else {
          toast.info('No new proposals to generate')
        }
      }
    } catch (e) {
      console.error('Proposal generation failed:', e)
      toast.error('Failed to generate proposals')
    } finally {
      setIsGeneratingProposals(false)
    }
    refresh()
  }, [refresh, buildFilterBody])

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

  // Keep the ref in sync
  React.useEffect(() => {
    submitRejectFeedbackRef.current = submitRejectFeedback
  }, [submitRejectFeedback])

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
  const activeItems = items.filter((item) => !item.waitingForStatement && item.status !== "rejected")
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

  // Pending items for focused review mode — fetched independently to avoid pagination limits
  const [focusItems, setFocusItems] = React.useState<MatchCardData[]>([])
  const [focusLoading, setFocusLoading] = React.useState(false)

  // Derive pending count from loaded items (for the button label)
  const pendingCount = React.useMemo(
    () => activeItems.filter((item) => item.status === "pending").length,
    [activeItems]
  )

  const fetchFocusItems = React.useCallback(async () => {
    setFocusLoading(true)
    try {
      const result = await fetchMatches(1, 100, { ...filters, status: "pending" })
      const pending = result.items.filter((item) => !item.waitingForStatement)
      // Show proposed matches first (matching the page layout), then new transactions
      pending.sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? 1 : -1
        return 0 // preserve existing order within each group
      })
      setFocusItems(pending)
    } catch (e) {
      console.error("Failed to fetch focus items:", e)
      // Fall back to loaded items
      setFocusItems(activeItems.filter((item) => item.status === "pending"))
    } finally {
      setFocusLoading(false)
    }
  }, [filters, activeItems])

  const handleStartReview = async () => {
    setReviewFocusIndex(0)
    setReviewFocusOpen(true)
    await fetchFocusItems()
  }

  // Keep focus items in sync when main list actions change them (approve/reject/remove)
  const handleFocusItemRemove = React.useCallback((id: string) => {
    setFocusItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  // Wrap approve/reject to also update focus items
  const handleFocusApprove = React.useCallback((id: string) => {
    approve(id)
    handleFocusItemRemove(id)
  }, [approve, handleFocusItemRemove])

  const handleFocusReject = React.useCallback((id: string) => {
    reject(id)
    handleFocusItemRemove(id)
  }, [reject, handleFocusItemRemove])

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
    />
  )

  return (
    <div className="space-y-4">
      {/* Action row — primary Review button + utility actions */}
      <div className="flex items-center justify-between gap-3">
        {(pendingCount > 0 || stats.pending > 0) ? (
          <Button
            size="default"
            onClick={handleStartReview}
            disabled={isLoading || focusLoading}
            className="flex-1 sm:flex-none sm:min-w-[160px]"
          >
            <Focus className="h-4 w-4 mr-2" />
            Review {stats.pending || pendingCount} item{(stats.pending || pendingCount) !== 1 ? "s" : ""}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground italic">All caught up</p>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateProposals}
            disabled={isLoading || isGeneratingProposals}
            title="Generate AI proposals for unmatched items"
            className="text-muted-foreground hover:text-foreground"
          >
            <Sparkles className={`h-4 w-4 sm:mr-1.5 ${isGeneratingProposals ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline text-xs">
              {isGeneratingProposals ? "Generating..." : "Proposals"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRematching}
            title="Re-match against existing transactions"
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-1.5 ${isRematching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline text-xs">
              {isRematching ? "Matching..." : "Refresh"}
            </span>
          </Button>
        </div>
      </div>

      {/* Compact stats strip */}
      <div className="flex items-stretch rounded-lg border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => handleStatClick({ status: "pending" })}
          className="flex flex-1 flex-col items-center justify-center px-3 py-3 text-center hover:bg-accent/50 transition-colors border-r"
        >
          {isInitialLoading ? (
            <Skeleton className="h-5 w-8 mb-1" />
          ) : (
            <span className="text-lg font-bold text-amber-600 leading-none tabular-nums">{stats.pending}</span>
          )}
          <span className="text-[11px] text-muted-foreground mt-1 leading-none">Pending</span>
        </button>
        <button
          type="button"
          onClick={() => handleStatClick({ status: "pending", confidence: "high" })}
          className="flex flex-1 flex-col items-center justify-center px-3 py-3 text-center hover:bg-accent/50 transition-colors border-r"
        >
          {isInitialLoading ? (
            <Skeleton className="h-5 w-8 mb-1" />
          ) : (
            <span className="text-lg font-bold text-green-600 leading-none tabular-nums">{readyToApprove}</span>
          )}
          <span className="text-[11px] text-muted-foreground mt-1 leading-none">Ready</span>
        </button>
        <div className="flex flex-1 flex-col items-center justify-center px-3 py-3 text-center border-r">
          {isInitialLoading ? (
            <Skeleton className="h-5 w-8 mb-1" />
          ) : (
            <span className="text-lg font-bold leading-none tabular-nums">{stats.thisWeekCount ?? 0}</span>
          )}
          <span className="text-[11px] text-muted-foreground mt-1 leading-none">This Week</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-3 py-3 text-center">
          {isInitialLoading ? (
            <Skeleton className="h-5 w-8 mb-1" />
          ) : (
            <span className="text-lg font-bold text-zinc-500 leading-none tabular-nums">{stats.resolvedCount ?? 0}</span>
          )}
          <span className="text-[11px] text-muted-foreground mt-1 leading-none">Resolved</span>
        </div>
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-0.5 h-5 bg-green-500 rounded-full shrink-0" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Proposed Matches
                      <span className="ml-2 text-muted-foreground font-normal">({matchItems.length})</span>
                    </h2>
                  </div>
                  {highConfidenceItems.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setBatchDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700 self-start sm:self-auto"
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-0.5 h-5 bg-purple-500 rounded-full shrink-0" />
                    <h2 className="text-sm font-semibold text-foreground">
                      New Transactions
                      <span className="ml-2 text-muted-foreground font-normal">({newItems.length})</span>
                    </h2>
                  </div>
                  {quickCreateItems.length >= 2 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleBatchQuickCreate(quickCreateItems.map((i) => i.id))}
                      className="bg-purple-600 hover:bg-purple-700 self-start sm:self-auto"
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
                    <span className="text-xs hidden sm:inline">
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
        items={focusItems}
        loading={focusLoading}
        currentIndex={reviewFocusIndex}
        onIndexChange={setReviewFocusIndex}
        onApprove={handleFocusApprove}
        onReject={handleFocusReject}
        onLinkManually={handleLinkManually}
        onCreateTransaction={async (compositeId, txData, meta) => {
          await handleCreateConfirm(compositeId, txData, meta)
          handleFocusItemRemove(compositeId)
        }}
        isProcessing={isProcessing}
      />
    </div>
  )
}
