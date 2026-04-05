"use client"

import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import type { ReviewQueueFilters } from "@/components/page-specific/review-queue-filter-bar"

export interface PaymentSlip {
  id: string
  filename: string
  status: string
  review_status: string
  transaction_date: string | null
  amount: number | null
  currency: string | null
  sender_name: string | null
  recipient_name: string | null
  bank_detected: string | null
  memo: string | null
  detected_direction: string | null
  extraction_confidence: number | null
  extraction_error: string | null
  uploaded_at: string
}

async function fetchPaymentSlips(
  page: number,
  limit: number,
  filters: ReviewQueueFilters
): Promise<{
  items: PaymentSlip[]
  hasMore: boolean
  total: number
}> {
  const params = new URLSearchParams()
  params.set("page", page.toString())
  params.set("limit", limit.toString())

  if (filters.search) params.set("search", filters.search)
  if (filters.direction && filters.direction !== "all") params.set("direction", filters.direction)
  if (filters.processingStatus && filters.processingStatus !== "all") params.set("status", filters.processingStatus)
  if (filters.status !== "all") params.set("reviewStatus", filters.status)
  if (filters.bank && filters.bank !== "all") params.set("bank", filters.bank)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)
  if (filters.sortField) params.set("sortField", filters.sortField)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  if (filters.dateRange?.from) {
    const d = filters.dateRange.from
    params.set("dateFrom", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  if (filters.dateRange?.to) {
    const d = filters.dateRange.to
    params.set("dateTo", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }

  const response = await fetch(`/api/payment-slips?${params.toString()}`)
  if (!response.ok) {
    throw new Error("Failed to fetch payment slips")
  }

  const data = await response.json()

  return {
    items: data.slips || [],
    hasMore: data.hasMore,
    total: data.total,
  }
}

export function usePaymentSlips(filters: ReviewQueueFilters) {
  return useInfiniteScroll<PaymentSlip>({
    fetchFn: async (page, limit) => {
      return fetchPaymentSlips(page, limit, filters)
    },
    limit: 20,
    deps: [
      filters.search,
      filters.direction,
      filters.processingStatus,
      filters.status,
      filters.bank,
      filters.confidence,
      filters.sortField,
      filters.sortOrder,
      filters.dateRange?.from?.getTime(),
      filters.dateRange?.to?.getTime(),
    ],
    keyExtractor: (item) => item.id,
  })
}

export async function fetchAllFilteredSlipIds(
  filters: ReviewQueueFilters
): Promise<string[]> {
  const params = new URLSearchParams()
  params.set("fields", "ids")

  if (filters.search) params.set("search", filters.search)
  if (filters.direction && filters.direction !== "all") params.set("direction", filters.direction)
  if (filters.processingStatus && filters.processingStatus !== "all") params.set("status", filters.processingStatus)
  if (filters.status !== "all") params.set("reviewStatus", filters.status)
  if (filters.bank && filters.bank !== "all") params.set("bank", filters.bank)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)

  if (filters.dateRange?.from) {
    const d = filters.dateRange.from
    params.set("dateFrom", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  if (filters.dateRange?.to) {
    const d = filters.dateRange.to
    params.set("dateTo", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }

  const response = await fetch(`/api/payment-slips?${params.toString()}`)
  if (!response.ok) {
    throw new Error("Failed to fetch filtered IDs")
  }

  const data = await response.json()
  return data.ids || []
}
