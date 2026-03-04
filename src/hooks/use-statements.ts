'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

export interface StatementUpload {
  id: string
  filename: string
  file_size: number | null
  payment_method_id: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  statement_period_start: string | null
  statement_period_end: string | null
  transactions_extracted: number | null
  transactions_matched: number | null
  transactions_new: number | null
  uploaded_at: string
  extraction_error: string | null
  payment_methods: { id: string; name: string } | null
}

export interface StatementsStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  averageMatchRate: number
}

export interface PaymentMethodGroup {
  paymentMethodId: string
  paymentMethodName: string
  statements: StatementUpload[]
}

export function useStatements() {
  const [statements, setStatements] = useState<StatementUpload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true)
      setError(null)

      const response = await fetch('/api/statements')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      const result = await response.json()
      setStatements(result.statements)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch statements'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  // Poll every 5s when any statement is processing
  useEffect(() => {
    const hasProcessing = statements.some(s => s.status === 'processing')

    if (hasProcessing) {
      pollingRef.current = setInterval(() => {
        fetchData()
      }, 5000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [statements, fetchData])

  const groups = useMemo((): PaymentMethodGroup[] => {
    const groupMap = new Map<string, PaymentMethodGroup>()

    for (const stmt of statements) {
      const pmId = stmt.payment_method_id ?? 'unknown'
      const pmName = stmt.payment_methods?.name ?? 'Unknown'

      if (!groupMap.has(pmId)) {
        groupMap.set(pmId, {
          paymentMethodId: pmId,
          paymentMethodName: pmName,
          statements: [],
        })
      }
      groupMap.get(pmId)!.statements.push(stmt)
    }

    // Sort groups alphabetically
    const sorted = Array.from(groupMap.values()).sort((a, b) =>
      a.paymentMethodName.localeCompare(b.paymentMethodName)
    )

    // Sort statements within each group by period_end DESC, fallback to uploaded_at
    for (const group of sorted) {
      group.statements.sort((a, b) => {
        const aDate = a.statement_period_end ?? a.uploaded_at
        const bDate = b.statement_period_end ?? b.uploaded_at
        return bDate.localeCompare(aDate)
      })
    }

    return sorted
  }, [statements])

  const stats = useMemo((): StatementsStats => {
    const total = statements.length
    const pending = statements.filter(s => s.status === 'pending').length
    const processing = statements.filter(s => s.status === 'processing').length
    const completed = statements.filter(s => s.status === 'completed').length
    const failed = statements.filter(s => s.status === 'failed').length

    const completedStatements = statements.filter(s => s.status === 'completed')
    let averageMatchRate = 0
    if (completedStatements.length > 0) {
      const totalRate = completedStatements.reduce((sum, s) => {
        const extracted = s.transactions_extracted ?? 0
        if (extracted === 0) return sum
        return sum + ((s.transactions_matched ?? 0) / extracted) * 100
      }, 0)
      averageMatchRate = Math.round(totalRate / completedStatements.length)
    }

    return { total, pending, processing, completed, failed, averageMatchRate }
  }, [statements])

  const triggerProcessing = useCallback(async (id: string) => {
    // Optimistic update
    setStatements(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'processing' as const } : s)
    )

    try {
      const response = await fetch(`/api/statements/${id}/process`, { method: 'POST' })
      if (!response.ok) {
        // Revert on failure
        await fetchData()
      }
    } catch {
      await fetchData()
    }
  }, [fetchData])

  return { statements, groups, stats, isLoading, error, refetch: fetchData, triggerProcessing }
}
