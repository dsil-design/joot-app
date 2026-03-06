'use client'

import { useState, useEffect, useCallback } from 'react'

interface JournalEntry {
  id: string
  invocation_type: string
  from_address: string | null
  from_name: string | null
  subject: string | null
  email_date: string | null
  body_length: number | null
  regex_parser_attempted: string | null
  regex_extraction_success: boolean | null
  ai_classification: string | null
  ai_suggested_skip: boolean | null
  ai_reasoning: string | null
  ai_extracted_vendor: string | null
  ai_extracted_amount: number | null
  ai_extracted_currency: string | null
  ai_extracted_date: string | null
  ai_confidence: number | null
  final_parser_key: string | null
  final_confidence: number | null
  final_status: string | null
  duration_ms: number | null
  prompt_tokens: number | null
  response_tokens: number | null
  feedback_examples_used: number
  created_at: string
}

interface JournalStats {
  total_calls_30d: number
  estimated_cost_30d: number
  avg_response_ms: number
  active_insights: number
  last_analysis_at: string | null
  last_analysis_summary: Record<string, unknown> | null
  calls_by_type: Record<string, number>
  total_tokens: { prompt: number; response: number }
}

interface UseAiJournalOptions {
  page?: number
  limit?: number
  fromAddress?: string
  invocationType?: string
}

export function useAiJournal(options: UseAiJournalOptions = {}) {
  const { page = 1, limit = 50, fromAddress, invocationType } = options

  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (fromAddress) params.set('from_address', fromAddress)
      if (invocationType) params.set('invocation_type', invocationType)

      const res = await fetch(`/api/ai-journal?${params}`)
      if (!res.ok) throw new Error('Failed to fetch journal entries')

      const data = await res.json()
      setEntries(data.entries)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, fromAddress, invocationType])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return { entries, total, totalPages, isLoading, error, refetch: fetchEntries }
}

export function useAiJournalStats() {
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai-journal/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch AI journal stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, refetch: fetchStats }
}

export type { JournalEntry, JournalStats }
