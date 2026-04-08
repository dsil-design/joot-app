"use client"

import * as React from "react"
import type { EmailHubFilters } from "@/hooks/use-email-hub-filters"

export interface FilteredEmailStats {
  total: number
  status_counts: Record<string, number>
}

/**
 * Fetches email counts that reflect the active filters (search, date, currency,
 * classification, confidence). The `status` filter is intentionally ignored so
 * the stat cards can still act as status sub-filters for the current search.
 */
export function useFilteredEmailStats(filters: EmailHubFilters) {
  const [stats, setStats] = React.useState<FilteredEmailStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const search = filters.search
  const classification = filters.classification
  const currency = filters.currency
  const confidence = filters.confidence
  const fromTime = filters.dateRange?.from?.getTime()
  const toTime = filters.dateRange?.to?.getTime()

  React.useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    params.set("fields", "stats")
    if (classification !== "all") params.set("classification", classification)
    if (currency !== "all") params.set("currency", currency)
    if (confidence !== "all") params.set("confidence", confidence)
    if (search) params.set("search", search)
    if (filters.dateRange?.from) {
      const d = filters.dateRange.from
      params.set("dateFrom", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
    }
    if (filters.dateRange?.to) {
      const d = filters.dateRange.to
      params.set("dateTo", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
    }

    setIsLoading(true)
    fetch(`/api/emails/transactions?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to fetch stats"))))
      .then((data) => {
        if (!cancelled) {
          setStats({ total: data.total || 0, status_counts: data.status_counts || {} })
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats({ total: 0, status_counts: {} })
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, classification, currency, confidence, fromTime, toTime])

  return { stats, isLoading }
}
