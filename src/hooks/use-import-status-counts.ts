'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ImportStatusCounts {
  pending: number
  waiting: number
  matched: number
}

export interface ImportSyncStats {
  lastSyncedAt: string | null
  folder: string
  totalSynced: number
}

export interface UseImportStatusCountsResult {
  counts: ImportStatusCounts | null
  sync: ImportSyncStats | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching import dashboard status counts and sync stats.
 *
 * Returns:
 * - counts: pending review, waiting for statement, matched (30 days)
 * - sync: last sync time, folder name, total synced emails
 * - isLoading: true while fetching
 * - error: error message if fetch failed
 * - refetch: function to manually refresh data
 */
export function useImportStatusCounts(): UseImportStatusCountsResult {
  const [counts, setCounts] = useState<ImportStatusCounts | null>(null)
  const [sync, setSync] = useState<ImportSyncStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/imports/status-counts')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      const data = await response.json()

      setCounts(data.counts)
      setSync(data.sync)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch import status'
      setError(message)
      setCounts(null)
      setSync(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    counts,
    sync,
    isLoading,
    error,
    refetch: fetchData,
  }
}
