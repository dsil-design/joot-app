"use client"

import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import type { PaymentSlipFilters } from "@/hooks/use-payment-slips-filters"

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

function buildQueryParams(filters: PaymentSlipFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) params.set("search", filters.search)
  if (filters.direction !== "all") params.set("direction", filters.direction)
  if (filters.slipState !== "all") params.set("slipState", filters.slipState)
  if (filters.bank !== "all") params.set("bank", filters.bank)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)
  params.set("sortField", filters.sortField)
  params.set("sortOrder", filters.sortOrder)

  if (filters.dateRange?.from) {
    const d = filters.dateRange.from
    params.set("dateFrom", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  if (filters.dateRange?.to) {
    const d = filters.dateRange.to
    params.set("dateTo", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }

  return params
}

async function fetchPaymentSlips(
  page: number,
  limit: number,
  filters: PaymentSlipFilters
): Promise<{
  items: PaymentSlip[]
  hasMore: boolean
  total: number
}> {
  const params = buildQueryParams(filters)
  params.set("page", page.toString())
  params.set("limit", limit.toString())

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

export function usePaymentSlips(filters: PaymentSlipFilters) {
  return useInfiniteScroll<PaymentSlip>({
    fetchFn: async (page, limit) => {
      return fetchPaymentSlips(page, limit, filters)
    },
    limit: 20,
    deps: [
      filters.search,
      filters.direction,
      filters.slipState,
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
  filters: PaymentSlipFilters
): Promise<string[]> {
  const params = buildQueryParams(filters)
  params.set("fields", "ids")

  const response = await fetch(`/api/payment-slips?${params.toString()}`)
  if (!response.ok) {
    throw new Error("Failed to fetch filtered IDs")
  }

  const data = await response.json()
  return data.ids || []
}
