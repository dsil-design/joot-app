'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock,
  ArrowDownLeft, ArrowUpRight, Loader2, Eye, Copy, Check, Trash2, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { PaymentSlipViewerModal } from '@/components/page-specific/payment-slip-viewer-modal'
import { DeleteConfirmationDialog } from '@/components/page-specific/delete-confirmation-dialog'

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
  extraction_started_at: string | null
  matched_transaction_id: string | null
  uploaded_at: string
  extraction_completed_at: string | null
}

interface EditableFields {
  amount: string
  fee: string
  transaction_date: string
  transaction_time: string
  sender_name: string
  sender_bank: string
  sender_account: string
  recipient_name: string
  recipient_bank: string
  recipient_account: string
  memo: string
  detected_direction: string
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

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5 pt-2">
      <span className="text-[12px] text-zinc-400 font-mono">{id}</span>
      <button
        onClick={handleCopy}
        className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5"
        aria-label="Copy ID"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-words min-w-0">{value}</span>
    </div>
  )
}

function EditableRow({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  type?: 'text' | 'number' | 'date' | 'time'
  placeholder?: string
}) {
  return (
    <div className="flex justify-between items-center gap-4 py-2 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="max-w-[220px] h-8 text-sm text-right"
        step={type === 'number' ? '0.01' : undefined}
      />
    </div>
  )
}

function slipToEditableFields(slip: SlipDetail): EditableFields {
  return {
    amount: slip.amount != null ? String(slip.amount) : '',
    fee: slip.fee != null ? String(slip.fee) : '0',
    transaction_date: slip.transaction_date || '',
    transaction_time: slip.transaction_time || '',
    sender_name: slip.sender_name || '',
    sender_bank: slip.sender_bank || '',
    sender_account: slip.sender_account || '',
    recipient_name: slip.recipient_name || '',
    recipient_bank: slip.recipient_bank || '',
    recipient_account: slip.recipient_account || '',
    memo: slip.memo || '',
    detected_direction: slip.detected_direction || 'expense',
  }
}

export default function PaymentSlipDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const slipId = params?.id as string

  const [slip, setSlip] = useState<SlipDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editFields, setEditFields] = useState<EditableFields | null>(null)

  const fetchSlip = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment-slips/${slipId}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setSlip(data)
      return data
    } catch {
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

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/payment-slips/${slipId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Payment slip deleted')
        router.push('/imports/payment-slips')
      } else {
        toast.error('Failed to delete payment slip')
      }
    } catch {
      toast.error('Failed to delete payment slip')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStartEdit = () => {
    if (!slip) return
    setEditFields(slipToEditableFields(slip))
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditFields(null)
  }

  const handleSaveEdit = async () => {
    if (!editFields || !slip) return
    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        amount: editFields.amount ? parseFloat(editFields.amount) : null,
        fee: editFields.fee ? parseFloat(editFields.fee) : 0,
        transaction_date: editFields.transaction_date || null,
        transaction_time: editFields.transaction_time || null,
        sender_name: editFields.sender_name || null,
        sender_bank: editFields.sender_bank || null,
        sender_account: editFields.sender_account || null,
        recipient_name: editFields.recipient_name || null,
        recipient_bank: editFields.recipient_bank || null,
        recipient_account: editFields.recipient_account || null,
        memo: editFields.memo || null,
        detected_direction: editFields.detected_direction || null,
      }

      const res = await fetch(`/api/payment-slips/${slipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      const updated = await res.json()
      setSlip(updated)
      setIsEditing(false)
      setEditFields(null)
      toast.success('Changes saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: keyof EditableFields, value: string) => {
    setEditFields(prev => prev ? { ...prev, [field]: value } : null)
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

  const displayDirection = isEditing ? editFields?.detected_direction : slip.detected_direction
  const isIncome = displayDirection === 'income'
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{slip.filename}</h2>
          <p className="text-sm text-muted-foreground">
            Uploaded {formatDate(slip.uploaded_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setViewerOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>

              {(slip.status === 'ready_for_review' || slip.status === 'done') && (
                <Button size="sm" variant="outline" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}

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

              {(slip.status === 'ready_for_review' || slip.status === 'done') && (
                <Button size="sm" variant="outline" onClick={handleProcess} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Reprocess
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Processing state */}
      {slip.status === 'processing' && (() => {
        const startedAt = slip.extraction_started_at
        const isStuck = startedAt && (Date.now() - new Date(startedAt).getTime()) > 2 * 60 * 1000

        return (
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4">
              {isStuck ? (
                <>
                  <XCircle className="h-8 w-8 text-amber-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Processing appears stuck</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This slip has been processing for over 2 minutes
                    </p>
                  </div>
                  <Button size="sm" onClick={handleProcess} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Retry Processing
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Processing payment slip...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Extracting transaction data with Claude Vision
                    </p>
                  </div>
                  <Progress value={50} className="w-48" />
                </>
              )}
            </CardContent>
          </Card>
        )
      })()}

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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {isIncome ? (
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}
                  <div>
                    {isEditing && editFields ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={editFields.amount}
                          onChange={(e) => updateField('amount', e.target.value)}
                          className="w-32 h-9 text-lg font-bold"
                          placeholder="Amount"
                        />
                        <span className="text-lg font-bold">{slip.currency || 'THB'}</span>
                        <select
                          value={editFields.detected_direction}
                          onChange={(e) => updateField('detected_direction', e.target.value)}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="income">Received</option>
                          <option value="expense">Sent</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold">
                          {isIncome ? '+' : ''}{slip.amount ? formatAmount(slip.amount) : '—'} {slip.currency || 'THB'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isIncome ? 'Received' : 'Sent'} &middot; {bank}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {!isEditing && (
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
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transfer details */}
          <Card>
            <CardContent className="py-4">
              <h3 className="text-sm font-medium mb-3">Transfer Details</h3>
              {isEditing && editFields ? (
                <>
                  <EditableRow label="Date" value={editFields.transaction_date} onChange={(v) => updateField('transaction_date', v)} type="date" />
                  <EditableRow label="Time" value={editFields.transaction_time} onChange={(v) => updateField('transaction_time', v)} type="time" />
                  <EditableRow label="From" value={editFields.sender_name} onChange={(v) => updateField('sender_name', v)} />
                  <EditableRow label="From Bank" value={editFields.sender_bank} onChange={(v) => updateField('sender_bank', v)} />
                  <EditableRow label="From Account" value={editFields.sender_account} onChange={(v) => updateField('sender_account', v)} />
                  <EditableRow label="To" value={editFields.recipient_name} onChange={(v) => updateField('recipient_name', v)} />
                  <EditableRow label="To Bank" value={editFields.recipient_bank} onChange={(v) => updateField('recipient_bank', v)} />
                  <EditableRow label="To Account" value={editFields.recipient_account} onChange={(v) => updateField('recipient_account', v)} />
                  <EditableRow label="Fee" value={editFields.fee} onChange={(v) => updateField('fee', v)} type="number" />
                  <EditableRow label="Memo" value={editFields.memo} onChange={(v) => updateField('memo', v)} />
                  <DetailRow label="Reference" value={slip.transaction_reference} />
                  {slip.bank_reference && <DetailRow label="Bank Ref" value={slip.bank_reference} />}
                  <DetailRow label="Transfer Type" value={slip.transfer_type} />
                </>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Review queue link */}
          {!isEditing && slip.review_status === 'pending' && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div>
                <p className="text-sm font-medium text-amber-800">Ready for review</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Approve or reject this transaction in the review queue
                </p>
              </div>
              <Button size="sm" variant="outline" asChild className="self-start sm:self-auto shrink-0">
                <Link href="/review?source=payment_slip">
                  Go to Review Queue
                </Link>
              </Button>
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between w-full">
        <CopyableId id={slipId} />
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="text-muted-foreground hover:text-red-600 hover:bg-red-50 gap-1.5"
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </div>

      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        title="Delete payment slip?"
        description="This will permanently delete this payment slip and its uploaded file. Any linked transactions will remain but will no longer be associated with this slip."
        isDeleting={isDeleting}
      />

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
