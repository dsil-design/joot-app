'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatementUploadZone } from './statement-upload-zone'
import { useStatementUpload } from '@/hooks/use-statement-upload'
import { calculateFileHash } from '@/lib/statements/duplicate-detector'

interface UploadPaymentSlipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete?: (slipId: string) => void
}

export function UploadPaymentSlipDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadPaymentSlipDialogProps) {
  const router = useRouter()
  const { uploadState, uploadFile, reset, isUploading } = useStatementUpload()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      reset()
      setSubmitError(null)
      setIsSubmitting(false)
    }
  }, [open, reset])

  const handleFileAccepted = useCallback(async (file: File) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const fileHash = await calculateFileHash(file)
      const uploadId = crypto.randomUUID()

      // Upload to Supabase Storage (reuses statement-uploads bucket)
      const uploadResult = await uploadFile(file, uploadId)
      if (!uploadResult.success) {
        setIsSubmitting(false)
        return
      }

      // Create payment slip record
      const response = await fetch('/api/payment-slips/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: uploadResult.path,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          file_hash: fileHash,
        }),
      })

      const data = await response.json()

      if (response.status === 409) {
        setSubmitError(data.error || 'Duplicate payment slip detected')
        reset()
        setIsSubmitting(false)
        return
      }

      if (!response.ok) {
        setSubmitError(data.error || 'Upload failed')
        setIsSubmitting(false)
        return
      }

      // Trigger processing immediately
      fetch(`/api/payment-slips/${data.upload_id}/process`, { method: 'POST' })
        .catch(() => { /* fire-and-forget */ })

      onUploadComplete?.(data.upload_id)
      setTimeout(() => {
        onOpenChange(false)
        router.push(`/imports/payment-slips/${data.upload_id}`)
      }, 1000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsSubmitting(false)
    }
  }, [uploadFile, reset, onUploadComplete, onOpenChange, router])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Payment Slip</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Upload a Thai bank transfer receipt (KBank or Bangkok Bank).
            The image will be processed automatically.
          </p>

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
            disabled={isSubmitting}
          />

          {submitError && uploadState.state !== 'error' && (
            <p className="text-sm text-destructive text-center">{submitError}</p>
          )}

          {isSubmitting && !isUploading && (
            <p className="text-sm text-muted-foreground text-center">
              Creating record and starting extraction...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
