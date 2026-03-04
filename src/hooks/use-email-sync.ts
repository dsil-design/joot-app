'use client'

import { useState, useCallback } from 'react'

export interface EmailSyncResult {
  success: boolean
  synced: number
  errors: number
  lastUid?: number
  message?: string
}

export interface EmailProcessResult {
  success: boolean
  processed: number
  extracted: number
  failed: number
  skipped: number
  message?: string
}

export interface UseEmailSyncResult {
  /** Trigger a manual IMAP sync (fetch only, no AI) */
  triggerSync: () => Promise<EmailSyncResult | null>
  /** Whether a sync is currently in progress */
  isSyncing: boolean
  /** Trigger AI processing on all unprocessed emails */
  triggerProcess: () => Promise<EmailProcessResult | null>
  /** Whether processing is currently in progress */
  isProcessing: boolean
  /** Last sync error message, if any */
  syncError: string | null
  /** Result from the last sync attempt */
  lastResult: EmailSyncResult | null
  /** Clear the error state */
  clearError: () => void
}

/**
 * Hook for triggering email sync operations.
 *
 * Provides:
 * - triggerSync: async function to initiate email sync
 * - isSyncing: loading state indicator
 * - syncError: error message from failed sync
 * - lastResult: result object from last sync attempt
 *
 * Usage:
 * ```tsx
 * const { triggerSync, isSyncing, syncError } = useEmailSync()
 *
 * const handleSyncNow = async () => {
 *   const result = await triggerSync()
 *   if (result?.success) {
 *     // Optionally refetch status counts
 *   }
 * }
 * ```
 */
export function useEmailSync(): UseEmailSyncResult {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<EmailSyncResult | null>(null)

  const triggerSync = useCallback(async (): Promise<EmailSyncResult | null> => {
    if (isSyncing) return null

    try {
      setIsSyncing(true)
      setSyncError(null)

      const response = await fetch('/api/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) throw new Error('Please log in to sync emails')
        if (response.status === 409) throw new Error('Sync already in progress')
        if (response.status === 503) throw new Error('Email integration not configured')
        throw new Error(data.error || `Sync failed with status ${response.status}`)
      }

      const result: EmailSyncResult = {
        success: data.success,
        synced: data.synced ?? 0,
        errors: data.errors ?? 0,
        lastUid: data.lastUid,
        message: data.message,
      }

      setLastResult(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync emails'
      setSyncError(message)
      setLastResult(null)
      return null
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing])

  const triggerProcess = useCallback(async (): Promise<EmailProcessResult | null> => {
    if (isProcessing) return null

    try {
      setIsProcessing(true)
      setSyncError(null)

      const response = await fetch('/api/emails/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) throw new Error('Please log in to process emails')
        if (response.status === 409) throw new Error('Processing already in progress')
        throw new Error(data.error || `Processing failed with status ${response.status}`)
      }

      return {
        success: data.success,
        processed: data.processed ?? 0,
        extracted: data.extracted ?? 0,
        failed: data.failed ?? 0,
        skipped: data.skipped ?? 0,
        message: data.message,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process emails'
      setSyncError(message)
      return null
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing])

  const clearError = useCallback(() => {
    setSyncError(null)
  }, [])

  return {
    triggerSync,
    isSyncing,
    triggerProcess,
    isProcessing,
    syncError,
    lastResult,
    clearError,
  }
}

export default useEmailSync
