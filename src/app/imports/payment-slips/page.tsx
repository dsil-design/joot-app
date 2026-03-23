'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, Receipt, ArrowRight } from 'lucide-react'
import { UploadPaymentSlipDialog } from '@/components/page-specific/upload-payment-slip-dialog'
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

export default function PaymentSlipsPage() {
  const [slips, setSlips] = useState<PaymentSlip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

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

  const readyCount = slips.filter(s => s.status === 'ready_for_review').length
  const processingCount = slips.filter(s => s.status === 'processing').length

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
          <span>{slips.length} total</span>
          {readyCount > 0 && (
            <span className="text-amber-600 font-medium">{readyCount} ready for review</span>
          )}
          {processingCount > 0 && (
            <span className="text-blue-600 font-medium">{processingCount} processing</span>
          )}
        </div>
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

      {/* Slip list */}
      {!isLoading && slips.map(slip => {
        const status = statusConfig[slip.status] || statusConfig.pending
        const bank = slip.bank_detected ? bankNames[slip.bank_detected] || slip.bank_detected : null
        const isIncome = slip.detected_direction === 'income'
        const counterparty = isIncome ? slip.sender_name : slip.recipient_name
        const description = slip.memo || (counterparty ? `${isIncome ? 'From' : 'To'} ${counterparty}` : 'Unknown')

        return (
          <Link
            key={slip.id}
            href={`/imports/payment-slips/${slip.id}`}
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-zinc-50 transition-colors group"
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

            <div className="flex items-center gap-3 shrink-0">
              {slip.amount && (
                <span className={cn("text-sm font-medium", isIncome ? "text-green-600" : "")}>
                  {isIncome ? '+' : ''}{formatAmount(slip.amount)} {slip.currency || 'THB'}
                </span>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        )
      })}

      {/* Upload dialog */}
      <UploadPaymentSlipDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={() => fetchSlips()}
      />
    </div>
  )
}
