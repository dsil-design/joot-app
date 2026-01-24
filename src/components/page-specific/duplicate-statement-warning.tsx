'use client'

import { AlertTriangle, ExternalLink, FileWarning } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DuplicateMatch } from '@/lib/statements/duplicate-detector'

interface DuplicateStatementWarningProps {
  duplicates: DuplicateMatch[]
  message: string
  canForce: boolean
  onForceUpload?: () => void
  onCancel?: () => void
  isForcing?: boolean
}

/**
 * Warning component displayed when a duplicate statement is detected.
 *
 * Shows:
 * - Warning message explaining the duplicate
 * - Link to view the previous upload
 * - Option to proceed anyway (if allowed)
 */
export function DuplicateStatementWarning({
  duplicates,
  message,
  canForce,
  onForceUpload,
  onCancel,
  isForcing = false,
}: DuplicateStatementWarningProps) {
  const firstDuplicate = duplicates[0]
  const isFileHashDuplicate = firstDuplicate?.type === 'file_hash'

  return (
    <Alert
      variant="destructive"
      className="border-amber-500 bg-amber-50 dark:bg-amber-950/30"
    >
      {isFileHashDuplicate ? (
        <FileWarning className="h-5 w-5 text-amber-600" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-amber-600" />
      )}
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        {isFileHashDuplicate ? 'Duplicate File Detected' : 'Statement Period Overlap'}
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <p className="mb-3">{message}</p>

        {/* Previous upload info */}
        {firstDuplicate && (
          <div className="mb-4 rounded-md bg-white/50 p-3 dark:bg-black/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Previous upload:
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {firstDuplicate.existingUpload.filename}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Uploaded{' '}
              {new Date(firstDuplicate.existingUpload.uploaded_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {firstDuplicate.existingUpload.status === 'completed' && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {firstDuplicate.existingUpload.transactions_extracted} transactions extracted,{' '}
                {firstDuplicate.existingUpload.transactions_matched} matched
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {firstDuplicate && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
            >
              <Link
                href={`/imports/statements/${firstDuplicate.existingUpload.id}`}
                target="_blank"
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                View Previous Results
              </Link>
            </Button>
          )}

          {canForce && onForceUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onForceUpload}
              disabled={isForcing}
              className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
            >
              {isForcing ? 'Uploading...' : 'Upload Anyway'}
            </Button>
          )}

          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Additional duplicates notice */}
        {duplicates.length > 1 && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            {duplicates.length - 1} additional potential duplicate
            {duplicates.length > 2 ? 's' : ''} found.
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Compact inline warning for use in upload zones
 */
export function DuplicateWarningInline({
  message,
  uploadId,
}: {
  message: string
  uploadId: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
      <Link
        href={`/imports/statements/${uploadId}`}
        className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
      >
        View <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  )
}
