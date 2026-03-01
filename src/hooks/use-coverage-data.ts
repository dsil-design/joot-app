'use client'

import { useState, useEffect, useCallback } from 'react'

type CellStatus = 'missing' | 'processing' | 'pending_review' | 'done'

export interface CellData {
  status: CellStatus
  count?: number
  statementId?: string
}

export interface CoverageData {
  paymentMethods: Array<{ id: string; name: string }>
  months: string[]
  cells: Record<string, Record<string, CellData>>
  pendingTotal: number
  highConfidenceCount: number
}

export interface UseCoverageDataResult {
  data: CoverageData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCoverageData(): UseCoverageDataResult {
  const [data, setData] = useState<CoverageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/imports/coverage')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch coverage data'
      setError(message)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
