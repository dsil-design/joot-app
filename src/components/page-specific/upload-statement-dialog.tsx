'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { StatementUploadZone } from './statement-upload-zone'
import { useStatementUpload } from '@/hooks/use-statement-upload'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { calculateFileHash } from '@/lib/statements/duplicate-detector'

interface UploadStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentMethodId?: string | null
  expectedPeriod?: { start: string; end: string } | null
  onUploadComplete?: (statementId: string) => void
}

export function UploadStatementDialog({
  open,
  onOpenChange,
  paymentMethodId,
  onUploadComplete,
}: UploadStatementDialogProps) {
  const router = useRouter()
  const { paymentMethods, loading: pmLoading } = usePaymentMethods()
  const { uploadState, uploadFile, reset, isUploading } = useStatementUpload()

  const [selectedPmId, setSelectedPmId] = useState<string | null>(paymentMethodId ?? null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Sync selectedPmId when prop changes
  useEffect(() => {
    if (paymentMethodId) {
      setSelectedPmId(paymentMethodId)
    }
  }, [paymentMethodId])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      reset()
      setSubmitError(null)
      setIsSubmitting(false)
    }
  }, [open, reset])

  const handleFileAccepted = useCallback(async (file: File) => {
    const pmId = selectedPmId
    if (!pmId) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const fileHash = await calculateFileHash(file)
      const uploadId = crypto.randomUUID()

      const uploadResult = await uploadFile(file, uploadId)
      if (!uploadResult.success) {
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/statements/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: uploadResult.path,
          payment_method_id: pmId,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          file_hash: fileHash,
        }),
      })

      const data = await response.json()

      if (response.status === 409) {
        setSubmitError(data.message || 'Duplicate statement detected')
        reset()
        setIsSubmitting(false)
        return
      }

      if (!response.ok) {
        setSubmitError(data.error || 'Upload failed')
        setIsSubmitting(false)
        return
      }

      // Success — notify parent and auto-close
      onUploadComplete?.(data.upload_id)
      setTimeout(() => {
        onOpenChange(false)
        router.push(`/imports/statements/${data.upload_id}`)
      }, 1000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedPmId, uploadFile, reset, onUploadComplete, onOpenChange, router])

  const effectivePmId = selectedPmId || paymentMethodId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Statement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment method selector (shown when no PM pre-selected) */}
          {!paymentMethodId && (
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={selectedPmId || ''}
                onValueChange={setSelectedPmId}
                disabled={pmLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.filter(pm => pm.is_import_source !== false).map(pm => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Upload zone */}
          <StatementUploadZone
            onFileAccepted={handleFileAccepted}
            uploadState={uploadState.state}
            uploadProgress={uploadState.progress}
            errorMessage={uploadState.error ?? submitError ?? undefined}
            successFileName={uploadState.uploadedFile?.name}
            successFileSize={uploadState.uploadedFile?.size}
            onReset={() => {
              reset()
              setSubmitError(null)
            }}
            disabled={!effectivePmId || isSubmitting}
          />

          {submitError && uploadState.state !== 'error' && (
            <p className="text-sm text-destructive text-center">{submitError}</p>
          )}

          {!effectivePmId && (
            <p className="text-sm text-muted-foreground text-center">
              Select a payment method to enable upload
            </p>
          )}

          {isSubmitting && !isUploading && (
            <p className="text-sm text-muted-foreground text-center">
              Creating upload record...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
