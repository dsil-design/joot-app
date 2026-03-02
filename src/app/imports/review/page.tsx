"use client"

import * as React from "react"
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
  type CrossCurrencyInfo,
} from "@/components/page-specific/match-card"
import {
  BatchApproveDialog,
  type BatchApproveItem,
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
import { useTransactions } from "@/hooks"
import { toast } from "sonner"
import {
  ContextBreadcrumb,
} from "@/components/page-specific/context-breadcrumb"
import {
  CheckCircle2,
  FileText,
  Clock,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { getConfidenceLevel } from "@/components/ui/confidence-indicator"

/**
 * Summary stats for the review queue
 */
interface QueueStats {
  total: number
  pending: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
}

/**
 * Fetch matches from API
 */
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
    params.set("from", filters.dateRange.from.toISOString().split("T")[0])
  }
  if (filters.dateRange?.to) {
    params.set("to", filters.dateRange.to.toISOString().split("T")[0])
  }

  try {
    const response = await fetch(`/api/imports/queue?${params.toString()}`)

    if (!response.ok) {
      throw new Error('Failed to fetch review queue')
    }

    const data = await response.json()

    // Transform API response to MatchCardData format
    const items: MatchCardData[] = data.items.map((item: {
      id: string
      statementTransaction: { date: string; description: string; amount: number; currency: string; sourceFilename?: string }
      statementFilename: string
      paymentMethod: { id: string; name: string } | null
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
      },
    }
  }
}

/**
 * Review Queue Page
 *
 * Main page for reviewing and approving/rejecting matches.
 * Features:
 * - Filter bar with status, currency, confidence, date range, search
 * - Summary stats cards
 * - Infinite scroll list of match cards
 * - Batch approve functionality
 * - Responsive design
 */
export default function ReviewQueuePage() {
  // Filter state
  const [filters, setFilters] = useReviewQueueFilters()

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Batch approve dialog
  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false)

  // Link to existing dialog
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [linkingItemId, setLinkingItemId] = React.useState<string | null>(null)

  // Create from import dialog
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createDialogData, setCreateDialogData] = React.useState<CreateFromImportData | null>(null)

  // Stats state
  const [stats, setStats] = React.useState<QueueStats>({
    total: 0,
    pending: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
  })

  // Infinite scroll
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

  // Match actions hook
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

  // Handle selection change
  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  // Handle "Link to Existing" click
  const handleLinkManually = (id: string) => {
    setLinkingItemId(id)
    setLinkDialogOpen(true)
  }

  // Handle link confirmation
  const handleLinkConfirm = async (transactionId: string) => {
    if (!linkingItemId) return
    await linkToExisting(linkingItemId, transactionId)
    setLinkDialogOpen(false)
    setLinkingItemId(null)
  }

  // Transaction creation hook
  const { createTransaction } = useTransactions()

  // Handle "Create as New" click - opens pre-filled dialog
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

  // Handle create+link confirmation from dialog
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
    // Step 1: Create the transaction via Supabase
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

    if (!result) {
      throw new Error("Failed to create transaction")
    }

    // Step 2: Link the import item to the new transaction
    await linkToExisting(compositeId, result.id)

    toast.success("Transaction created and linked")
  }

  // Handle "Import as New" click (legacy - for ready-to-import variant)
  const handleImport = (id: string) => {
    handleCreateAsNew(id)
  }

  // Get the linking item data for the dialog
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

  // Get high-confidence items for batch approve
  const highConfidenceItems = items.filter(
    (item) =>
      item.status === "pending" &&
      getConfidenceLevel(item.confidence) === "high"
  )

  // Handle batch approve
  const handleBatchApprove = async () => {
    const ids = highConfidenceItems.map((item) => item.id)
    await batchApprove(ids)
    setBatchDialogOpen(false)
  }

  // Batch approve items for dialog
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

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
          >
            <Link href="/imports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review Queue</h1>
            <p className="text-sm text-muted-foreground">
              Review and approve transaction matches
            </p>
          </div>
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
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Total"
          value={stats.total}
          isLoading={isInitialLoading}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending"
          value={stats.pending}
          isLoading={isInitialLoading}
          className="text-amber-600"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="High Confidence"
          value={stats.highConfidence}
          isLoading={isInitialLoading}
          className="text-green-600"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Needs Review"
          value={stats.mediumConfidence + stats.lowConfidence}
          isLoading={isInitialLoading}
          className="text-red-600"
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

      {/* Match cards list */}
      <div className="space-y-4">
        {isInitialLoading ? (
          // Loading skeletons
          <>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </>
        ) : items.length === 0 ? (
          // Empty state
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
              <Link href="/imports">← Coverage</Link>
            </Button>
          </div>
        ) : (
          // Match cards
          items.map((item) => (
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
          ))
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

/**
 * Stat card component
 */
function StatCard({
  icon,
  label,
  value,
  isLoading,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: number
  isLoading?: boolean
  className?: string
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className={`flex items-center gap-2 mb-1 ${className}`}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-7 w-12" />
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
    </div>
  )
}
