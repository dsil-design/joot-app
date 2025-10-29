'use client'

/**
 * UploadProgress Component
 *
 * Displays upload progress with file info and status
 * Shows compression savings and error states
 */

import { formatFileSize, getFileTypeLabel } from '@/lib/utils/file-validation'

export interface UploadProgressProps {
  file: File
  progress: number // 0-100
  status: 'uploading' | 'processing' | 'success' | 'error'
  error?: string
  compressionInfo?: {
    originalSize: number
    compressedSize: number
    percentSaved: number
  }
  onCancel?: () => void
  onRetry?: () => void
  className?: string
}

export function UploadProgress({
  file,
  progress,
  status,
  error,
  compressionInfo,
  onCancel,
  onRetry,
  className = '',
}: UploadProgressProps) {
  const isComplete = status === 'success'
  const isError = status === 'error'
  const isInProgress = status === 'uploading' || status === 'processing'

  return (
    <div
      className={`
        rounded-lg border bg-white dark:bg-gray-900
        ${isError ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}
        ${className}
      `}
    >
      <div className="p-4 space-y-3">
        {/* File info */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* File icon */}
            <div
              className={`
                flex-shrink-0 w-10 h-10 rounded flex items-center justify-center
                ${isError ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}
              `}
            >
              {isComplete ? (
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : isError ? (
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>

            {/* File details */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {file.name}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                  {getFileTypeLabel(file.type)}
                </span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>
          </div>

          {/* Cancel/Close button */}
          {isInProgress && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Cancel upload"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar */}
        {isInProgress && (
          <div className="space-y-1">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                {status === 'uploading' ? 'Uploading...' : 'Processing...'}
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {progress}%
              </span>
            </div>
          </div>
        )}

        {/* Success state with compression info */}
        {isComplete && compressionInfo && (
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              Upload complete • Saved {compressionInfo.percentSaved}% space
              ({formatFileSize(compressionInfo.originalSize - compressionInfo.compressedSize)})
            </span>
          </div>
        )}

        {/* Success state without compression info */}
        {isComplete && !compressionInfo && (
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Upload complete</span>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error || 'Upload failed'}</span>
            </div>

            {/* Retry button */}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
