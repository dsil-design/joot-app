"use client"

import * as React from "react"

export interface EmailHubStats {
  total: number
  total_synced_emails: number
  not_extracted: number
  status_counts: Record<string, number>
  classification_counts: Record<string, number>
  confidence_buckets: { high: number; medium: number; low: number }
  monthly_trend: Array<{ month: string; received: number; extracted: number; matched: number; imported: number }>
  sync: { last_sync_at: string; folder: string } | null
  waiting_summary: { count: number; total_amount: number; primary_currency: string | null }
}

export interface UseEmailHubStatsResult {
  stats: EmailHubStats | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const emptyStats: EmailHubStats = {
  total: 0,
  total_synced_emails: 0,
  not_extracted: 0,
  status_counts: {},
  classification_counts: {},
  confidence_buckets: { high: 0, medium: 0, low: 0 },
  monthly_trend: [],
  sync: null,
  waiting_summary: { count: 0, total_amount: 0, primary_currency: null },
}

/**
 * Hook to fetch email hub statistics
 */
export function useEmailHubStats(period: string = "30d"): UseEmailHubStatsResult {
  const [stats, setStats] = React.useState<EmailHubStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchStats = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/emails/stats?period=${period}`)
      if (!response.ok) {
        throw new Error("Failed to fetch email statistics")
      }
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setStats(emptyStats)
    } finally {
      setIsLoading(false)
    }
  }, [period])

  React.useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, error, refetch: fetchStats }
}
