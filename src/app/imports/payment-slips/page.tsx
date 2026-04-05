'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, Receipt, ArrowRight, Eye, RefreshCw, X } from 'lucide-react'
import { UploadPaymentSlipDialog } from '@/components/page-specific/upload-payment-slip-dialog'
import { PaymentSlipViewerModal } from '@/components/page-specific/payment-slip-viewer-modal'
import {
  ReviewQueueFilterBar,
  useReviewQueueFilters,
  defaultPaymentSlipFilters,
  type ReviewQueueFilters,
} from '@/components/page-specific/review-queue-filter-bar'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface PaymentSlip {
  id: string
  filename: string
  status: string
  review_status: string
  transaction_date: string | null
  amount: number | null
  currency: string | null
  sender_name: string | null
  recipient_name: string | null
  bank_detected: string | null
  memo: string | null
  detected_direction: string | null
  extraction_confidence: number | null
  extraction_error: string | null
  uploaded_at: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-zinc-100 text-zinc-600' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
  ready_for_review: { label: 'Ready', className: 'bg-amber-100 text-amber-700' },
  done: { label: 'Done', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
}

const bankNames: Record<string, string> = {
  kbank: 'KBank',
  bangkok_bank: 'Bangkok Bank',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function applyFiltersAndSort(slips: PaymentSlip[], filters: ReviewQueueFilters): PaymentSlip[] {
  let result = slips

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(s =>
      (s.sender_name?.toLowerCase().includes(q)) ||
      (s.recipient_name?.toLowerCase().includes(q)) ||
      (s.memo?.toLowerCase().includes(q)) ||
      (s.amount?.toString().includes(q))
    )
  }

  // Direction
  if (filters.direction && filters.direction !== "all") {
    result = result.filter(s => s.detected_direction === filters.direction)
  }

  // Date range
  if (filters.dateRange?.from) {
    const from = filters.dateRange.from
    result = result.filter(s => {
      if (!s.transaction_date) return false
      return new Date(s.transaction_date) >= from
    })
  }
  if (filters.dateRange?.to) {
    const to = filters.dateRange.to
    result = result.filter(s => {
      if (!s.transaction_date) return false
      return new Date(s.transaction_date) <= to
    })
  }

  // Processing status
  if (filters.processingStatus && filters.processingStatus !== "all") {
    result = result.filter(s => s.status === filters.processingStatus)
  }

  // Bank
  if (filters.bank && filters.bank !== "all") {
    result = result.filter(s => s.bank_detected === filters.bank)
  }

  // Review status (maps to the shared "status" filter field)
  if (filters.status !== "all") {
    result = result.filter(s => s.review_status === filters.status)
  }

  // Confidence
  if (filters.confidence !== "all") {
    result = result.filter(s => {
      if (s.extraction_confidence == null) return false
      if (filters.confidence === "high") return s.extraction_confidence >= 90
      if (filters.confidence === "medium") return s.extraction_confidence >= 55 && s.extraction_confidence < 90
      if (filters.confidence === "low") return s.extraction_confidence < 55
      return true
    })
  }

  // Sort
  const field = filters.sortField || "uploaded_at"
  const order = filters.sortOrder || "desc"
  result = [...result].sort((a, b) => {
    let cmp = 0
    switch (field) {
      case "uploaded_at":
        cmp = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
        break
      case "transaction_date":
        cmp = (a.transaction_date ? new Date(a.transaction_date).getTime() : 0) -
              (b.transaction_date ? new Date(b.transaction_date).getTime() : 0)
        break
      case "amount":
        cmp = (a.amount || 0) - (b.amount || 0)
        break
      case "confidence":
        cmp = (a.extraction_confidence || 0) - (b.extraction_confidence || 0)
        break
    }
    return order === "asc" ? cmp : -cmp
  })

  return result
}

export default function PaymentSlipsPage() {
  const [slips, setSlips] = useState<PaymentSlip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewSlip, setPreviewSlip] = useState<{ id: string; filename: string } | null>(null)
  const [filters, setFilters] = useReviewQueueFilters(defaultPaymentSlipFilters)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isReprocessing, setIsReprocessing] = useState(false)

  const fetchSlips = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/payment-slips')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSlips(data.slips || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlips()
  }, [fetchSlips])

  const filteredSlips = useMemo(() => applyFiltersAndSort(slips, filters), [slips, filters])

  const readyCount = slips.filter(s => s.status === 'ready_for_review').length
  const processingCount = slips.filter(s => s.status === 'processing').length

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === filteredSlips.length) return new Set()
      return new Set(filteredSlips.map(s => s.id))
    })
  }, [filteredSlips])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const reprocessSelected = useCallback(async () => {
    setIsReprocessing(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/payment-slips/${id}/process`, { method: 'POST' })
        )
      )
      clearSelection()
      // Brief delay then refresh to show updated statuses
      setTimeout(() => fetchSlips(), 1000)
    } catch {
      setError('Failed to reprocess some slips')
    } finally {
      setIsReprocessing(false)
    }
  }, [selectedIds, clearSelection, fetchSlips])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payment Slips</h2>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Slip
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && slips.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredSlips.length === slips.length ? `${slips.length} total` : `${filteredSlips.length} of ${slips.length}`}</span>
          {readyCount > 0 && (
            <span className="text-amber-600 font-medium">{readyCount} ready for review</span>
          )}
          {processingCount > 0 && (
            <span className="text-blue-600 font-medium">{processingCount} processing</span>
          )}
        </div>
      )}

      {/* Filters */}
      {!isLoading && slips.length > 0 && (
        <ReviewQueueFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          mode="payment-slips"
          syncWithUrl
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <Button variant="link" size="sm" className="ml-2 text-destructive" onClick={fetchSlips}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && slips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No payment slips yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a Thai bank transfer receipt to get started.
          </p>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Slip
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {/* No results after filtering */}
      {!isLoading && slips.length > 0 && filteredSlips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">No slips match the current filters.</p>
        </div>
      )}

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 rounded-lg border bg-zinc-50 sticky top-0 z-10">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={reprocessSelected}
            disabled={isReprocessing}
            className="min-h-[44px] sm:min-h-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isReprocessing && "animate-spin")} />
            {isReprocessing ? 'Reprocessing...' : 'Reprocess Selected'}
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="min-h-[44px] sm:min-h-0">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Select all header */}
      {!isLoading && filteredSlips.length > 0 && (
        <div className="flex items-center gap-3 px-4 -mb-4">
          <Checkbox
            checked={selectedIds.size === filteredSlips.length && filteredSlips.length > 0}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all"
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      )}

      {/* Slip list */}
      {!isLoading && filteredSlips.map(slip => {
        const status = statusConfig[slip.status] || statusConfig.pending
        const bank = slip.bank_detected ? bankNames[slip.bank_detected] || slip.bank_detected : null
        const isIncome = slip.detected_direction === 'income'
        const counterparty = isIncome ? slip.sender_name : slip.recipient_name
        const description = slip.memo || (counterparty ? `${isIncome ? 'From' : 'To'} ${counterparty}` : 'Unknown')

        return (
          <div
            key={slip.id}
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-zinc-50 transition-colors group"
          >
            <Checkbox
              checked={selectedIds.has(slip.id)}
              onCheckedChange={() => toggleSelect(slip.id)}
              aria-label={`Select ${description}`}
              className="shrink-0"
            />
            <Link
              href={`/imports/payment-slips/${slip.id}`}
              className="flex items-center justify-between flex-1 min-w-0"
            >
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{description}</span>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0", status.className)}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {bank && <span>{bank}</span>}
                  {bank && slip.transaction_date && <span>&middot;</span>}
                  {slip.transaction_date && <span>{formatDate(slip.transaction_date)}</span>}
                  {slip.detected_direction && (
                    <>
                      <span>&middot;</span>
                      <span className={isIncome ? 'text-green-600' : 'text-zinc-600'}>
                        {isIncome ? 'Income' : 'Expense'}
                      </span>
                    </>
                  )}
                  {slip.extraction_error && (
                    <>
                      <span>&middot;</span>
                      <span className="text-red-500 truncate max-w-[200px]">{slip.extraction_error}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setPreviewSlip({ id: slip.id, filename: slip.filename })
                }}
                className="p-2.5 sm:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors cursor-pointer min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                title="Preview slip"
              >
                <Eye className="h-4 w-4" />
              </button>
              {slip.amount && (
                <span className={cn("text-sm font-medium", isIncome ? "text-green-600" : "")}>
                  {isIncome ? '+' : ''}{formatAmount(slip.amount)} {slip.currency || 'THB'}
                </span>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
          </div>
        )
      })}

      {/* Upload dialog */}
      <UploadPaymentSlipDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={() => fetchSlips()}
      />

      {previewSlip && (
        <PaymentSlipViewerModal
          open={!!previewSlip}
          onOpenChange={(open) => { if (!open) setPreviewSlip(null) }}
          slipId={previewSlip.id}
          filename={previewSlip.filename}
        />
      )}
    </div>
  )
}
