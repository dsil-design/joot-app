'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle2, XCircle, Loader2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { uploadStatementFile } from '@/lib/supabase/storage'
import { calculateFileHash } from '@/lib/statements/duplicate-detector'
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_DISPLAY,
  formatFileSize,
} from '@/lib/utils/file-validation'

interface UploadPaymentSlipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete?: () => void
}

interface FileUploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error'
  error?: string
  slipId?: string
}

// Only accept images for payment slips (no PDFs)
const SLIP_MIME_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/heic': ['.heic'],
} as const

export function UploadPaymentSlipDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadPaymentSlipDialogProps) {
  const router = useRouter()
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (open) {
      setFiles([])
      setIsProcessing(false)
    }
  }, [open])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileUploadStatus[] = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({
    onDrop,
    accept: SLIP_MIME_TYPES,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
    disabled: isProcessing,
  })

  const processAllFiles = useCallback(async () => {
    if (files.length === 0) return
    setIsProcessing(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const, error: 'Not authenticated' })))
      setIsProcessing(false)
      return
    }

    for (let i = 0; i < files.length; i++) {
      const fileStatus = files[i]
      if (fileStatus.status !== 'pending') continue

      // Update to uploading
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f))

      try {
        const fileHash = await calculateFileHash(fileStatus.file)
        const uploadId = crypto.randomUUID()

        // Upload to storage
        const uploadResult = await uploadStatementFile(
          supabase, fileStatus.file, user.id, uploadId
        )

        if (!uploadResult.success) {
          setFiles(prev => prev.map((f, idx) => idx === i
            ? { ...f, status: 'error', error: uploadResult.error || 'Upload failed' } : f))
          continue
        }

        // Create record
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f))

        const response = await fetch('/api/payment-slips/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: uploadResult.path,
            filename: fileStatus.file.name,
            file_size: fileStatus.file.size,
            file_type: fileStatus.file.type,
            file_hash: fileHash,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setFiles(prev => prev.map((f, idx) => idx === i
            ? { ...f, status: 'error', error: data.error || 'Failed to create record' } : f))
          continue
        }

        // Trigger processing (fire-and-forget)
        fetch(`/api/payment-slips/${data.upload_id}/process`, { method: 'POST' }).catch(() => {})

        setFiles(prev => prev.map((f, idx) => idx === i
          ? { ...f, status: 'done', slipId: data.upload_id } : f))
      } catch (err) {
        setFiles(prev => prev.map((f, idx) => idx === i
          ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Failed' } : f))
      }
    }

    setIsProcessing(false)
    onUploadComplete?.()
  }, [files, onUploadComplete])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')
  const doneCount = files.filter(f => f.status === 'done').length
  const hasFiles = files.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Payment Slips</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          {/* Drop zone (shown when no files yet or to add more) */}
          {!isProcessing && (
            <div
              {...getRootProps()}
              className={cn(
                "flex min-h-[140px] flex-col items-center justify-center rounded-lg p-6 transition-all duration-200 cursor-pointer",
                "border-2 border-dashed",
                isDragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-muted"
              )}
            >
              <input {...getInputProps()} />
              <Upload className={cn("h-8 w-8 mb-2", isDragActive ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground")} />
              {isDragActive ? (
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Drop files here</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">
                    Drag & drop payment slip images here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or{' '}
                    <button type="button" onClick={(e) => { e.stopPropagation(); openPicker() }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2">
                      browse files
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG, HEIC (Max {MAX_FILE_SIZE_DISPLAY}) &middot; Multiple files supported
                  </p>
                </>
              )}
            </div>
          )}

          {/* File list */}
          {hasFiles && (
            <div className="space-y-2">
              {files.map((fileStatus, index) => (
                <div key={`${fileStatus.file.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileStatus.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileStatus.file.size)}
                      {fileStatus.error && (
                        <span className="text-red-500 dark:text-red-400 ml-2">{fileStatus.error}</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {fileStatus.status === 'pending' && !isProcessing && (
                      <button onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-foreground">
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                    {fileStatus.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400" />
                    )}
                    {fileStatus.status === 'processing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500 dark:text-amber-400" />
                    )}
                    {fileStatus.status === 'done' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                    )}
                    {fileStatus.status === 'error' && (
                      <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {hasFiles && !allDone && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setFiles([])} disabled={isProcessing}>
                Clear
              </Button>
              <Button size="sm" onClick={processAllFiles} disabled={isProcessing || files.every(f => f.status !== 'pending')}>
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Upload {files.filter(f => f.status === 'pending').length} file{files.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}</>
                )}
              </Button>
            </div>
          )}

          {allDone && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                {doneCount} slip{doneCount !== 1 ? 's' : ''} uploaded and processing
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  onOpenChange(false)
                  router.push('/imports/payment-slips')
                }}>
                  View All
                </Button>
                {doneCount === 1 && files.find(f => f.slipId) && (
                  <Button size="sm" onClick={() => {
                    const slip = files.find(f => f.slipId)
                    onOpenChange(false)
                    router.push(`/imports/payment-slips/${slip!.slipId}`)
                  }}>
                    View Details
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
