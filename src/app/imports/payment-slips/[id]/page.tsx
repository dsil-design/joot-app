'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock,
  ArrowDownLeft, ArrowUpRight, Loader2, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { PaymentSlipViewerModal } from '@/components/page-specific/payment-slip-viewer-modal'

interface SlipDetail {
  id: string
  filename: string
  status: string
  review_status: string
  transaction_date: string | null
  transaction_time: string | null
  amount: number | null
  fee: number | null
  currency: string | null
  sender_name: string | null
  sender_bank: string | null
  sender_account: string | null
  recipient_name: string | null
  recipient_bank: string | null
  recipient_account: string | null
  transaction_reference: string | null
  bank_reference: string | null
  memo: string | null
  bank_detected: string | null
  transfer_type: string | null
  detected_direction: string | null
  extraction_confidence: number | null
  extraction_error: string | null
  matched_transaction_id: string | null
  uploaded_at: string
  extraction_completed_at: string | null
}

const bankNames: Record<string, string> = {
  kbank: 'KBank (K PLUS)',
  bangkok_bank: 'Bangkok Bank',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
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

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-2 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

export default function PaymentSlipDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const slipId = params?.id as string

  const [slip, setSlip] = useState<SlipDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)

  const fetchSlip = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment-slips/${slipId}/process`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()

      // If only status data returned (processing), fetch full record
      if (!data.transaction_date && data.status) {
        // Fetch from list endpoint and find ours
        const listRes = await fetch('/api/payment-slips')
        if (listRes.ok) {
          const listData = await listRes.json()
          const found = (listData.slips || []).find((s: SlipDetail) => s.id === slipId)
          if (found) {
            setSlip(found)
            return found
          }
        }
      }
      setSlip(data)
      return data
    } catch {
      // Fallback: fetch from list
      try {
        const listRes = await fetch('/api/payment-slips')
        if (listRes.ok) {
          const listData = await listRes.json()
          const found = (listData.slips || []).find((s: SlipDetail) => s.id === slipId)
          if (found) {
            setSlip(found)
            return found
          }
        }
      } catch { /* ignore */ }
      return null
    } finally {
      setIsLoading(false)
    }
  }, [slipId])

  useEffect(() => {
    fetchSlip()
  }, [fetchSlip])

  // Poll while processing
  useEffect(() => {
    if (!slip || slip.status !== 'processing') return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/payment-slips/${slipId}/process`)
      if (!res.ok) return
      const data = await res.json()
      if (data.status !== 'processing') {
        clearInterval(interval)
        fetchSlip()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [slip?.status, slipId, fetchSlip])

  const handleProcess = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/payment-slips/${slipId}/process`, { method: 'POST' })
      if (res.ok || res.status === 202) {
        toast.success('Processing started')
        // Update local state to show processing
        setSlip(prev => prev ? { ...prev, status: 'processing' } : null)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to start processing')
      }
    } catch {
      toast.error('Failed to start processing')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!slip) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-1">Payment slip not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/imports/payment-slips')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payment Slips
        </Button>
      </div>
    )
  }

  const isIncome = slip.detected_direction === 'income'
  const bank = slip.bank_detected ? bankNames[slip.bank_detected] || slip.bank_detected : 'Unknown Bank'

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/imports/payment-slips"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Payment Slips
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{slip.filename}</h2>
          <p className="text-sm text-muted-foreground">
            Uploaded {formatDate(slip.uploaded_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setViewerOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          {slip.status === 'pending' && (
            <Button size="sm" onClick={handleProcess} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Process
            </Button>
          )}

          {slip.status === 'failed' && (
            <Button size="sm" variant="outline" onClick={handleProcess} disabled={isProcessing}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Processing state */}
      {slip.status === 'processing' && (
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <div className="text-center">
              <p className="text-sm font-medium">Processing payment slip...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Extracting transaction data with Claude Vision
              </p>
            </div>
            <Progress value={50} className="w-48" />
          </CardContent>
        </Card>
      )}

      {/* Failed state */}
      {slip.status === 'failed' && (
        <Card className="border-red-200">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">Processing Failed</p>
                <p className="text-sm text-red-600 mt-1">{slip.extraction_error || 'Unknown error'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted data */}
      {(slip.status === 'ready_for_review' || slip.status === 'done') && (
        <>
          {/* Amount & Direction */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isIncome ? (
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <ArrowDownLeft className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold">
                      {isIncome ? '+' : ''}{slip.amount ? formatAmount(slip.amount) : '—'} {slip.currency || 'THB'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isIncome ? 'Received' : 'Sent'} &middot; {bank}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {slip.extraction_confidence && (
                    <span className="text-xs text-muted-foreground">
                      {slip.extraction_confidence}% confidence
                    </span>
                  )}
                  {slip.review_status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved
                    </span>
                  ) : slip.review_status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                      Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      <Clock className="h-3 w-3" />
                      Pending Review
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer details */}
          <Card>
            <CardContent className="py-4">
              <h3 className="text-sm font-medium mb-3">Transfer Details</h3>
              <DetailRow label="Date" value={slip.transaction_date ? formatDate(slip.transaction_date) : null} />
              <DetailRow label="Time" value={slip.transaction_time} />
              <DetailRow label="From" value={slip.sender_name} />
              <DetailRow label="From Bank" value={slip.sender_bank} />
              <DetailRow label="From Account" value={slip.sender_account} />
              <DetailRow label="To" value={slip.recipient_name} />
              <DetailRow label="To Bank" value={slip.recipient_bank} />
              <DetailRow label="To Account" value={slip.recipient_account} />
              <DetailRow label="Fee" value={slip.fee !== null && slip.fee !== undefined ? `${formatAmount(slip.fee)} THB` : null} />
              <DetailRow label="Memo" value={slip.memo} />
              <DetailRow label="Reference" value={slip.transaction_reference} />
              {slip.bank_reference && <DetailRow label="Bank Ref" value={slip.bank_reference} />}
              <DetailRow label="Transfer Type" value={slip.transfer_type} />
            </CardContent>
          </Card>

          {/* Review queue link */}
          {slip.review_status === 'pending' && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div>
                <p className="text-sm font-medium text-amber-800">Ready for review</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Approve or reject this transaction in the review queue
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/review?source=payment_slip">
                  Go to Review Queue
                </Link>
              </Button>
            </div>
          )}
        </>
      )}

      {/* Viewer modal */}
      <PaymentSlipViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        slipId={slipId}
        filename={slip.filename}
      />
    </div>
  )
}
