'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { StatementDetailHeader } from '@/components/page-specific/statement-detail-header'
import { StatementTransactionList, type StatementTransaction, type StatementTransactionListHandle } from '@/components/page-specific/statement-transaction-list'
import {
  LinkToExistingDialog,
  type LinkSourceItem,
} from '@/components/page-specific/link-to-existing-dialog'
import {
  CreateFromImportDialog,
  type CreateFromImportData,
} from '@/components/page-specific/create-from-import-dialog'
import { TransactionDetailModal } from '@/components/page-specific/transaction-detail-modal'
import { StatementViewerModal } from '@/components/page-specific/statement-viewer-modal'
import { DeleteConfirmationDialog } from '@/components/page-specific/delete-confirmation-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useMatchActions } from '@/hooks/use-match-actions'
import { useCreateAndLink } from '@/hooks/use-create-and-link'
import { toast } from 'sonner'
import { FileText, RefreshCw, XCircle, ArrowRight, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface StatementInfo {
  id: string
  filename: string
  payment_method: { id: string; name: string; type?: string } | null
  period: { start: string | null; end: string | null }
  processed_at: string | null
  uploaded_at: string | null
}

interface ProcessingResult {
  statement: StatementInfo
  status: 'pending' | 'processing' | 'ready_for_review' | 'in_review' | 'done' | 'failed'
  summary: {
    total_extracted: number
    total_matched: number
    total_new: number
    warnings: string[]
    parser_used: string | null
  } | null
  error?: string | null
  progress?: {
    step: string
    percent: number
    message: string
  } | null
}

async function fetchResults(statementId: string): Promise<ProcessingResult | null> {
  try {
    const response = await fetch(`/api/statements/${statementId}/matches`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export default function StatementDetailPage() {
  const params = useParams<{ id: string }>()
  const statementId = params?.id as string

  const [result, setResult] = React.useState<ProcessingResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  // Review callout state
  const [calloutDismissed, setCalloutDismissed] = React.useState(false)

  // Dialog state
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [linkingItem, setLinkingItem] = React.useState<LinkSourceItem | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createDialogData, setCreateDialogData] = React.useState<CreateFromImportData | null>(null)
  const [detailModalItem, setDetailModalItem] = React.useState<StatementTransaction | null>(null)
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const [reprocessConfirmOpen, setReprocessConfirmOpen] = React.useState(false)

  // Hooks
  const { linkToExisting } = useMatchActions({})
  const { createAndLink } = useCreateAndLink(linkToExisting)
  const txListRef = React.useRef<StatementTransactionListHandle>(null)

  // Linking mode state
  const [linkingQueue, setLinkingQueue] = React.useState<StatementTransaction[]>([])
  const [linkingIndex, setLinkingIndex] = React.useState(0)
  const [linkingReviewed, setLinkingReviewed] = React.useState(0)
  const [pendingMatchCount, setPendingMatchCount] = React.useState<number | null>(null)
  const isLinkingMode = linkingQueue.length > 0

  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isReprocessing, setIsReprocessing] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const router = useRouter()

  const handleDelete = React.useCallback(async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/statements/${statementId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Statement deleted')
        router.push('/imports/statements')
      } else {
        toast.error('Failed to delete statement')
      }
    } catch {
      toast.error('Failed to delete statement')
    } finally {
      setIsDeleting(false)
    }
  }, [statementId, router])

  const handleReprocessConfirmed = React.useCallback(async () => {
    setReprocessConfirmOpen(false)
    setIsReprocessing(true)
    try {
      const response = await fetch(`/api/statements/${statementId}/process`, {
        method: 'POST',
      })
      if (response.ok || response.status === 202) {
        toast.success('Reprocessing started')
        const data = await fetchResults(statementId)
        if (data) setResult(data)
      } else {
        toast.error('Failed to start reprocessing')
      }
    } catch {
      toast.error('Failed to start reprocessing')
    } finally {
      setIsReprocessing(false)
    }
  }, [statementId])

  const triggerProcessing = React.useCallback(async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/statements/${statementId}/process`, {
        method: 'POST',
      })
      if (response.ok || response.status === 202) {
        // Refresh to get processing status
        const data = await fetchResults(statementId)
        if (data) setResult(data)
      }
    } catch {
      // Will show on next poll
    } finally {
      setIsProcessing(false)
    }
  }, [statementId])

  // Fetch on mount
  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const data = await fetchResults(statementId)
      if (!data) {
        setError('Statement not found')
      } else {
        setResult(data)
        // Auto-trigger processing for pending statements
        if (data.status === 'pending') {
          setIsProcessing(true)
          try {
            const response = await fetch(`/api/statements/${statementId}/process`, {
              method: 'POST',
            })
            if (response.ok || response.status === 202) {
              const refreshed = await fetchResults(statementId)
              if (refreshed) setResult(refreshed)
            }
          } catch {
            // Will show pending state with manual button
          } finally {
            setIsProcessing(false)
          }
        }
      }
      setIsLoading(false)
    }
    load()
  }, [statementId])

  // Fetch actual pending match count when in a review state
  const isReviewState = result?.status === 'ready_for_review' || result?.status === 'in_review' || result?.status === 'done'
  React.useEffect(() => {
    if (!isReviewState) return
    const fetchPending = async () => {
      try {
        const response = await fetch(`/api/statements/${statementId}/transactions?status=matched&limit=1`)
        if (!response.ok) return
        const data = await response.json()
        setPendingMatchCount(data.pagination.total)
      } catch { /* ignore */ }
    }
    fetchPending()
  }, [isReviewState, statementId])

  // Poll while processing
  React.useEffect(() => {
    if (result?.status === 'processing') {
      const interval = setInterval(async () => {
        const data = await fetchResults(statementId)
        if (data) {
          setResult(data)
          if (data.status !== 'processing') {
            clearInterval(interval)
          }
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [result?.status, statementId])

  // Handle ignore/unignore
  const handleIgnoreClick = React.useCallback(async (item: StatementTransaction) => {
    const compositeId = `stmt:${statementId}:${item.index}`
    const response = await fetch('/api/imports/ignore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [compositeId] }),
    })
    if (!response.ok) {
      toast.error('Failed to ignore transaction')
      return
    }
    toast.success('Transaction ignored')
    const data = await fetchResults(statementId)
    if (data) setResult(data)
    txListRef.current?.refresh()
  }, [statementId])

  const handleUnignoreClick = React.useCallback(async (item: StatementTransaction) => {
    const compositeId = `stmt:${statementId}:${item.index}`
    const response = await fetch('/api/imports/ignore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [compositeId], undo: true }),
    })
    if (!response.ok) {
      toast.error('Failed to restore transaction')
      return
    }
    toast.success('Transaction restored')
    const data = await fetchResults(statementId)
    if (data) setResult(data)
    txListRef.current?.refresh()
  }, [statementId])

  // Handle link from statement transaction list
  const handleLinkClick = (item: StatementTransaction) => {
    setLinkingItem({
      id: `stmt:${statementId}:${item.index}`,
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      date: item.date,
    })
    setLinkDialogOpen(true)
  }

  const handleLinkConfirm = async (transactionIds: string[]) => {
    if (!linkingItem) return
    let success = true
    for (const txId of transactionIds) {
      const result = await linkToExisting(linkingItem.id, txId)
      if (!result) success = false
    }
    setLinkDialogOpen(false)
    setLinkingItem(null)
    if (success) {
      // Refresh header summary and transaction list
      const data = await fetchResults(statementId)
      if (data) setResult(data)
      txListRef.current?.refresh()
    }
  }

  // Handle create from statement transaction list
  const handleCreateClick = (item: StatementTransaction) => {
    setCreateDialogData({
      compositeId: `stmt:${statementId}:${item.index}`,
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      date: item.date,
      paymentMethodId: statement.payment_method?.id,
    })
    setCreateDialogOpen(true)
  }

  const handleCreateConfirm = async (...args: Parameters<typeof createAndLink>) => {
    await createAndLink(...args)
    // Refresh header summary and transaction list
    const data = await fetchResults(statementId)
    if (data) setResult(data)
    txListRef.current?.refresh()
  }

  // Approve a matched (pending) item from the detail modal
  const handleApproveLink = React.useCallback(async (item: StatementTransaction) => {
    const compositeId = `stmt:${statementId}:${item.index}`
    const response = await fetch('/api/imports/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds: [compositeId], createTransactions: false }),
    })
    if (!response.ok) {
      toast.error('Failed to approve link')
      return
    }
    toast.success('Link approved')
    setPendingMatchCount(prev => prev !== null ? Math.max(0, prev - 1) : prev)
    // Refresh both header summary and transaction list
    const data = await fetchResults(statementId)
    if (data) setResult(data)
    txListRef.current?.refresh()
  }, [statementId])

  // Reject a matched (pending) item from the detail modal
  const handleRejectMatch = React.useCallback(async (item: StatementTransaction) => {
    const compositeId = `stmt:${statementId}:${item.index}`
    const response = await fetch('/api/imports/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds: [compositeId] }),
    })
    if (!response.ok) {
      toast.error('Failed to reject match')
      return
    }
    toast.success('Match rejected')
    setPendingMatchCount(prev => prev !== null ? Math.max(0, prev - 1) : prev)
    // Refresh both header summary and transaction list
    const data = await fetchResults(statementId)
    if (data) setResult(data)
    txListRef.current?.refresh()
  }, [statementId])

  // Unlink a linked item from the detail modal
  const handleUnlink = React.useCallback(async (item: StatementTransaction) => {
    const response = await fetch('/api/imports/unlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: item.matchedTransactionId || undefined,
        sourceType: 'statement',
        statementUploadId: statementId,
        suggestionIndex: item.index,
      }),
    })
    if (!response.ok) {
      toast.error('Failed to unlink transaction')
      return
    }
    toast.success('Transaction unlinked')
    const data = await fetchResults(statementId)
    if (data) setResult(data)
    txListRef.current?.refresh()
  }, [statementId])

  // Enter linking mode — fetch all matched (pending) items
  const startLinkingMode = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/statements/${statementId}/transactions?status=matched&limit=100`)
      if (!response.ok) return
      const data = await response.json()
      const matchedItems: StatementTransaction[] = data.items.filter(
        (item: StatementTransaction) => item.matchStatus === 'matched'
      )
      if (matchedItems.length === 0) {
        toast.info('No pending matches to review')
        return
      }
      setLinkingQueue(matchedItems)
      setLinkingIndex(0)
      setLinkingReviewed(0)
      setPendingMatchCount(matchedItems.length)
    } catch {
      toast.error('Failed to load matches')
    }
  }, [statementId])

  // Linking mode: advance to next unreviewed item
  const advanceLinkingQueue = React.useCallback(() => {
    setLinkingReviewed(prev => prev + 1)
    // Try to go to next item
    setLinkingIndex(prev => {
      if (prev < linkingQueue.length - 1) return prev + 1
      return prev // Stay on last — "all done" state shows
    })
  }, [linkingQueue.length])

  // Linking mode: approve then advance
  const handleLinkingApprove = React.useCallback(async (item: StatementTransaction) => {
    await handleApproveLink(item)
    advanceLinkingQueue()
  }, [handleApproveLink, advanceLinkingQueue])

  // Linking mode: reject then advance
  const handleLinkingReject = React.useCallback(async (item: StatementTransaction) => {
    await handleRejectMatch(item)
    advanceLinkingQueue()
  }, [handleRejectMatch, advanceLinkingQueue])

  // Linking mode: skip (just advance, no action)
  const handleLinkingSkip = React.useCallback(() => {
    setLinkingIndex(prev =>
      prev < linkingQueue.length - 1 ? prev + 1 : prev
    )
  }, [linkingQueue.length])

  // Linking mode: navigate
  const handleLinkingNavigate = React.useCallback((direction: 'prev' | 'next') => {
    setLinkingIndex(prev => {
      if (direction === 'prev') return Math.max(0, prev - 1)
      return Math.min(linkingQueue.length - 1, prev + 1)
    })
  }, [linkingQueue.length])

  // Close linking mode
  const closeLinkingMode = React.useCallback((open: boolean) => {
    if (!open) {
      setLinkingQueue([])
      setLinkingIndex(0)
      setLinkingReviewed(0)
    }
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Error state
  if (error || !result) {
    return (
      <div className="text-center py-16">
        <XCircle className="h-12 w-12 mx-auto text-destructive/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">{error || 'Not found'}</h3>
        <Button asChild variant="outline">
          <Link href="/imports">Back to Overview</Link>
        </Button>
      </div>
    )
  }

  const { statement, status, summary } = result
  const pmName = statement.payment_method?.name || 'Unknown'

  // Statement viewer modal (rendered for all states)
  const statementViewerModal = (
    <StatementViewerModal
      open={viewerOpen}
      onOpenChange={setViewerOpen}
      statementId={statementId}
      filename={statement.filename}
    />
  )

  // Pending state
  if (status === 'pending') {
    return (
      <>
        <div className="space-y-6">
          <StatementDetailHeader
            paymentMethodName={pmName}
            period={statement.period}
            status={status}
            filename={statement.filename}
            uploadedAt={statement.uploaded_at}
            stats={{ extracted: 0, matched: 0, unmatched: 0 }}
            matchRate={0}
            onViewStatement={() => setViewerOpen(true)}
            onDelete={() => setDeleteConfirmOpen(true)}
            isDeleting={isDeleting}
          />
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4 text-center">
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">Starting processing...</p>
                      <p className="text-sm text-amber-700 mt-1">
                        This may take a moment
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <FileText className="h-8 w-8 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">Statement uploaded</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Ready to extract and link transactions
                      </p>
                    </div>
                    <Button onClick={triggerProcessing}>
                      Process Statement
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        {statementViewerModal}
        <DeleteConfirmationDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={handleDelete}
          title="Delete statement?"
          description={`This will permanently remove the uploaded file "${statement.filename}". No transactions have been extracted from this statement.`}
          confirmLabel="Delete"
          isDeleting={isDeleting}
        />
      </>
    )
  }

  // Processing state
  if (status === 'processing') {
    return (
      <>
        <div className="space-y-6">
          <StatementDetailHeader
            paymentMethodName={pmName}
            period={statement.period}
            status={status}
            filename={statement.filename}
            uploadedAt={statement.uploaded_at}
            stats={{ extracted: 0, matched: 0, unmatched: 0 }}
            matchRate={0}
            onViewStatement={() => setViewerOpen(true)}
          />
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                <span className="font-medium text-blue-900">Processing statement...</span>
              </div>
              {result.progress && (
                <>
                  <Progress value={result.progress.percent} className="h-2" />
                  <p className="text-sm text-blue-700">{result.progress.message}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        {statementViewerModal}
      </>
    )
  }

  // Failed state
  if (status === 'failed') {
    return (
      <>
        <div className="space-y-6">
          <StatementDetailHeader
            paymentMethodName={pmName}
            period={statement.period}
            status={status}
            filename={statement.filename}
            uploadedAt={statement.uploaded_at}
            stats={{ extracted: 0, matched: 0, unmatched: 0 }}
            matchRate={0}
            onViewStatement={() => setViewerOpen(true)}
            onDelete={() => setDeleteConfirmOpen(true)}
            isDeleting={isDeleting}
          />
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <XCircle className="h-8 w-8 text-destructive/70" />
                <div>
                  <p className="font-medium text-destructive">Processing failed</p>
                  {result.error && (
                    <p className="text-sm text-muted-foreground mt-1">{result.error}</p>
                  )}
                </div>
                <Button variant="outline" onClick={triggerProcessing} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Retrying...
                    </>
                  ) : (
                    'Retry Processing'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        {statementViewerModal}
        <DeleteConfirmationDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={handleDelete}
          title="Delete statement?"
          description={`This will permanently remove the uploaded file "${statement.filename}". No transactions have been extracted from this statement.`}
          confirmLabel="Delete"
          isDeleting={isDeleting}
        />
      </>
    )
  }

  // Completed state
  const extracted = summary?.total_extracted ?? 0
  const matched = summary?.total_matched ?? 0
  const unmatched = extracted - matched
  const matchRate = extracted > 0 ? Math.round((matched / extracted) * 100) : 0

  return (
    <div className="space-y-6">
      <StatementDetailHeader
        paymentMethodName={pmName}
        period={statement.period}
        status={status}
        filename={statement.filename}
        uploadedAt={statement.uploaded_at}
        stats={{ extracted, matched, unmatched }}
        matchRate={matchRate}
        onReprocess={() => setReprocessConfirmOpen(true)}
        onViewStatement={() => setViewerOpen(true)}
        onDelete={() => setDeleteConfirmOpen(true)}
        isReprocessing={isReprocessing}
        isDeleting={isDeleting}
      />

      {/* Review in Queue callout */}
      {['ready_for_review', 'in_review', 'done'].includes(status) && extracted > 0 && !calloutDismissed && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-blue-900">
                {extracted} transaction{extracted !== 1 ? 's' : ''} extracted.
              </p>
              <div className="flex items-center gap-2">
                {(pendingMatchCount ?? 0) > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={startLinkingMode}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Review {pendingMatchCount} match{pendingMatchCount !== 1 ? 'es' : ''}
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Link href={`/review?statementUploadId=${statementId}`}>
                    Full review queue
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalloutDismissed(true)}
                  className="text-blue-700 hover:text-blue-900"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction list */}
      {['ready_for_review', 'in_review', 'done'].includes(status) && (
        <Card>
          <CardContent className="pt-4">
            <StatementTransactionList
              ref={txListRef}
              statementId={statementId}
              paymentMethodType={statement.payment_method?.type}
              onLinkClick={handleLinkClick}
              onCreateClick={handleCreateClick}
              onIgnoreClick={handleIgnoreClick}
              onUnignoreClick={handleUnignoreClick}
              onRowClick={(item) => setDetailModalItem(item)}
            />
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {summary && summary.warnings.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-medium mb-2">Warnings</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {summary.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Link to existing dialog */}
      <LinkToExistingDialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open)
          if (!open) setLinkingItem(null)
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

      {/* Transaction detail modal (single item) */}
      <TransactionDetailModal
        statementItem={detailModalItem}
        open={!!detailModalItem && !isLinkingMode}
        onOpenChange={(open) => {
          if (!open) setDetailModalItem(null)
        }}
        onApproveLink={handleApproveLink}
        onRejectMatch={handleRejectMatch}
        onUnlink={handleUnlink}
      />

      {/* Linking mode modal (queue) */}
      <TransactionDetailModal
        statementItem={linkingQueue[linkingIndex] ?? null}
        open={isLinkingMode}
        onOpenChange={closeLinkingMode}
        onApproveLink={handleLinkingApprove}
        onRejectMatch={handleLinkingReject}
        queue={{
          current: linkingIndex,
          total: linkingQueue.length,
          reviewed: linkingReviewed,
        }}
        onSkip={handleLinkingSkip}
        onNavigate={handleLinkingNavigate}
      />

      {statementViewerModal}

      {/* Reprocess confirmation dialog */}
      <AlertDialog open={reprocessConfirmOpen} onOpenChange={setReprocessConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprocess statement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlink all transactions that were linked or created from this
              statement and re-extract transactions from the original file. Any
              previously approved links will need to be reviewed again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReprocessConfirmed}>
              Reprocess
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        title="Delete statement?"
        description={
          extracted > 0
            ? `This will permanently remove "${statement.filename}" and unlink ${extracted} transaction${extracted !== 1 ? 's' : ''} that were extracted from it. The transactions themselves will remain in your records but will no longer be associated with this statement.`
            : `This will permanently remove the uploaded file "${statement.filename}". No transactions have been extracted from this statement.`
        }
        confirmLabel={extracted > 0 ? 'Delete Statement' : 'Delete'}
        isDeleting={isDeleting}
      />
    </div>
  )
}
