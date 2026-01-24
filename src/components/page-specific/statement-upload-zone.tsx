'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  validateFile,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_DISPLAY,
  ACCEPTED_FILE_TYPES_DISPLAY,
  formatFileSize,
  type FileValidationError,
} from '@/lib/utils/file-validation'

/**
 * Upload zone visual states
 * - idle: Default state, waiting for user interaction
 * - active: File is being dragged over the zone
 * - uploading: File upload in progress
 * - success: File uploaded successfully
 * - error: Upload failed
 */
export type UploadState = 'idle' | 'active' | 'uploading' | 'success' | 'error'

// Re-export constants for backward compatibility
export { ACCEPTED_MIME_TYPES as ACCEPTED_FILE_TYPES }
export { MAX_FILE_SIZE_BYTES as MAX_FILE_SIZE }
export { ACCEPTED_FILE_TYPES_DISPLAY, MAX_FILE_SIZE_DISPLAY }

export interface StatementUploadZoneProps {
  /** Callback when a file is accepted and ready for upload */
  onFileAccepted: (file: File) => void
  /** Callback when a file is rejected (wrong type or too large) */
  onFileRejected?: (rejection: FileRejection) => void
  /** Callback when file validation fails (before upload) */
  onValidationError?: (error: FileValidationError) => void
  /** Current upload state (controlled externally) */
  uploadState?: UploadState
  /** Progress percentage (0-100) when uploading */
  uploadProgress?: number
  /** Error message to display when in error state */
  errorMessage?: string
  /** File name to display when in success state */
  successFileName?: string
  /** File size to display when in success state (in bytes) */
  successFileSize?: number
  /** Callback to reset the zone back to idle state */
  onReset?: () => void
  /** Whether the upload zone is disabled */
  disabled?: boolean
  /** Optional additional class names */
  className?: string
  /** Accessible label for screen readers */
  'aria-label'?: string
}

/**
 * StatementUploadZone - Drag-and-drop file upload component for statement files
 *
 * Supports PDF and image uploads with visual feedback for different states:
 * - Default/Idle: Dashed border, gray background
 * - Drag Over: Blue border and background
 * - Uploading: Progress indicator
 * - Success: Green confirmation
 * - Error: Red error state with retry option
 *
 * @example
 * ```tsx
 * <StatementUploadZone
 *   onFileAccepted={(file) => handleUpload(file)}
 *   uploadState="idle"
 * />
 * ```
 */
export function StatementUploadZone({
  onFileAccepted,
  onFileRejected,
  onValidationError,
  uploadState = 'idle',
  uploadProgress = 0,
  errorMessage = 'Upload failed. Please try again.',
  successFileName,
  successFileSize,
  onReset,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: StatementUploadZoneProps) {
  const [internalError, setInternalError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setInternalError(null)

      // Handle react-dropzone rejections (basic validation)
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0]
        const errorCode = rejection.errors[0]?.code

        let message = 'File could not be uploaded.'
        if (errorCode === 'file-too-large') {
          message = `File exceeds the ${MAX_FILE_SIZE_DISPLAY} size limit.`
        } else if (errorCode === 'file-invalid-type') {
          message = `Invalid file type. Please upload ${ACCEPTED_FILE_TYPES_DISPLAY} files.`
        }

        setInternalError(message)
        onFileRejected?.(rejection)
        return
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]

        // Run additional validation before accepting the file
        const validationResult = validateFile(file)

        if (!validationResult.valid && validationResult.error) {
          setInternalError(validationResult.error.message)
          onValidationError?.(validationResult.error)
          return
        }

        // File passed all validation
        onFileAccepted(file)
      }
    },
    [onFileAccepted, onFileRejected, onValidationError]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    disabled: disabled || uploadState === 'uploading',
    noClick: uploadState === 'success' || uploadState === 'error',
    noKeyboard: uploadState === 'success' || uploadState === 'error',
  })

  const handleRetry = useCallback(() => {
    setInternalError(null)
    onReset?.()
    // Small delay to ensure state is reset before opening file dialog
    setTimeout(open, 100)
  }, [onReset, open])

  const handleReset = useCallback(() => {
    setInternalError(null)
    onReset?.()
  }, [onReset])

  // Determine which error message to show
  const displayError = uploadState === 'error' ? errorMessage : internalError

  const accessibleLabel =
    ariaLabel ??
    `Statement upload zone. ${
      uploadState === 'idle'
        ? `Accepts ${ACCEPTED_FILE_TYPES_DISPLAY} files up to ${MAX_FILE_SIZE_DISPLAY}.`
        : uploadState === 'active'
          ? 'Drop file here to upload.'
          : uploadState === 'uploading'
            ? `Uploading file, ${uploadProgress}% complete.`
            : uploadState === 'success'
              ? `File ${successFileName ?? 'uploaded'} successfully.`
              : `Upload error: ${displayError}`
    }`

  return (
    <div
      {...getRootProps()}
      role="button"
      tabIndex={uploadState === 'success' || uploadState === 'error' ? -1 : 0}
      aria-label={accessibleLabel}
      aria-disabled={disabled || uploadState === 'uploading'}
      aria-busy={uploadState === 'uploading'}
      className={cn(
        // Base styles
        'relative flex min-h-[200px] flex-col items-center justify-center rounded-lg p-8 transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',

        // State-based styles
        uploadState === 'idle' &&
          !isDragActive &&
          !displayError && [
            'cursor-pointer border-2 border-dashed border-gray-300 bg-gray-50',
            'hover:border-gray-400 hover:bg-gray-100',
            'dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500 dark:hover:bg-gray-800',
          ],

        // Drag active state
        (isDragActive || uploadState === 'active') && [
          'cursor-pointer border-2 border-dashed border-blue-500 bg-blue-50',
          'dark:border-blue-400 dark:bg-blue-950',
        ],

        // Uploading state
        uploadState === 'uploading' && [
          'cursor-wait border-2 border-solid border-blue-500 bg-white',
          'dark:bg-gray-900',
        ],

        // Success state
        uploadState === 'success' && [
          'border-2 border-solid border-green-500 bg-green-50',
          'dark:border-green-400 dark:bg-green-950',
        ],

        // Error state (either from uploadState or internal error)
        (uploadState === 'error' || displayError) && [
          'border-2 border-solid border-red-500 bg-red-50',
          'dark:border-red-400 dark:bg-red-950',
        ],

        // Disabled state
        disabled && 'cursor-not-allowed opacity-50',

        className
      )}
    >
      <input {...getInputProps()} aria-hidden="true" />

      {/* Idle/Default State */}
      {uploadState === 'idle' && !isDragActive && !displayError && (
        <div className="flex flex-col items-center gap-3 text-center">
          <Upload
            className="h-10 w-10 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drag & drop statement here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              or{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  open()
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                disabled={disabled}
              >
                browse files
              </button>
            </p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Accepts: {ACCEPTED_FILE_TYPES_DISPLAY} (Max {MAX_FILE_SIZE_DISPLAY})
          </p>
        </div>
      )}

      {/* Drag Active State */}
      {(isDragActive || uploadState === 'active') && !displayError && (
        <div className="flex flex-col items-center gap-3 text-center">
          <Upload
            className="h-10 w-10 animate-pulse text-blue-500 dark:text-blue-400"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Drop file here
          </p>
        </div>
      )}

      {/* Uploading State */}
      {uploadState === 'uploading' && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <Loader2
            className="h-10 w-10 animate-spin text-blue-500"
            aria-hidden="true"
          />
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                Uploading...
              </span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {uploadProgress}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadState === 'success' && !displayError && (
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2
            className="h-10 w-10 text-green-500 dark:text-green-400"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Upload successful
            </p>
            {successFileName && (
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>{successFileName}</span>
                {successFileSize && (
                  <span className="text-gray-400">
                    ({formatFileSize(successFileSize)})
                  </span>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleReset()
            }}
            className="mt-2"
          >
            Upload another file
          </Button>
        </div>
      )}

      {/* Error State */}
      {displayError && (
        <div className="flex flex-col items-center gap-3 text-center">
          <XCircle
            className="h-10 w-10 text-red-500 dark:text-red-400"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Upload failed
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {displayError}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleRetry()
            }}
            className="mt-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * StatementUploadZoneSkeleton - Loading placeholder for StatementUploadZone
 *
 * Use when the upload zone component structure needs to be a skeleton
 */
export function StatementUploadZoneSkeleton() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}
