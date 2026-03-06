'use client'

import { useState, useEffect, useCallback } from 'react'

interface AiInsight {
  id: string
  insight_type: string
  severity: string
  title: string
  description: string
  evidence: Record<string, unknown>
  target_sender: string | null
  email_count: number | null
  format_consistency_pct: number | null
  status: string
  dismissed_at: string | null
  implemented_at: string | null
  created_at: string
  updated_at: string
}

export function useAiInsights(status: string = 'active') {
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/ai-journal/insights?status=${status}`)
      if (!res.ok) throw new Error('Failed to fetch insights')

      const data = await res.json()
      setInsights(data.insights)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const updateInsight = useCallback(async (id: string, action: 'dismiss' | 'implement' | 'reactivate') => {
    try {
      const res = await fetch(`/api/ai-journal/insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Failed to update insight')

      // Refresh the list
      await fetchInsights()
      return true
    } catch (err) {
      console.error('Failed to update insight:', err)
      return false
    }
  }, [fetchInsights])

  const runAnalysis = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-journal/analyze', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to run analysis')

      const data = await res.json()
      // Refresh insights after analysis
      await fetchInsights()
      return data
    } catch (err) {
      console.error('Failed to run analysis:', err)
      return null
    }
  }, [fetchInsights])

  return { insights, isLoading, error, refetch: fetchInsights, updateInsight, runAnalysis }
}

export type { AiInsight }
