'use client'

import { useState, useEffect, useCallback } from 'react'
import { type ImportActivity } from '@/lib/types/email-imports'

export type RecentActivity = ImportActivity

export interface UseRecentActivitiesResult {
  activities: RecentActivity[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching recent import activities.
 *
 * @param limit - Maximum number of activities to fetch (default: 5)
 * @returns Recent activities, loading state, error, and refetch function
 */
export function useRecentActivities(limit: number = 5): UseRecentActivitiesResult {
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/imports/recent-activities?limit=${limit}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      const data = await response.json()
      setActivities(data.activities ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recent activities'
      setError(message)
      setActivities([])
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    activities,
    isLoading,
    error,
    refetch: fetchData,
  }
}
