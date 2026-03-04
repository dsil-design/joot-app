'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type CellStatus = 'missing' | 'processing' | 'pending_review' | 'done' | 'future'

export interface TooltipCounts {
  extracted: number
  matched: number
  newCount: number
}

export interface CellData {
  status: CellStatus
  count?: number
  statementId?: string
  tooltipCounts?: TooltipCounts
}

export interface PaymentMethodAggregates {
  extracted: number
  matched: number
  newCount: number
  statementsCount: number
}

export interface CoveragePaymentMethod {
  id: string
  name: string
  preferred_currency: string | null
  billing_cycle_start_day: number | null
  inferredBillingCycleDay: number
  coveragePercent: number
  aggregates: PaymentMethodAggregates
}

export interface PendingUpload {
  id: string
  filename: string
  status: string
  paymentMethodName: string
  createdAt: string
}

export interface CoverageData {
  paymentMethods: CoveragePaymentMethod[]
  months: string[]
  cells: Record<string, Record<string, CellData>>
  pendingTotal: number
  highConfidenceCount: number
  overallCoveragePercent: number
  lastEmailSync: string | null
  emailsPendingReview: number
  pendingUploads: PendingUpload[]
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true)
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
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  // Poll every 10s when any cell has status === 'processing'
  useEffect(() => {
    if (!data) return

    const hasProcessing = Object.values(data.cells).some(pmCells =>
      Object.values(pmCells).some(cell => cell.status === 'processing')
    )
    const hasPendingUploads = (data.pendingUploads?.length ?? 0) > 0

    if (hasProcessing || hasPendingUploads) {
      pollingRef.current = setInterval(() => {
        fetchData()
      }, 10000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [data, fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
