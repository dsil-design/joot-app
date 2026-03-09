"use client"

import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import type { EmailHubFilters } from "@/hooks/use-email-hub-filters"

/**
 * Email transaction row type (from API)
 */
export interface EmailTransactionRow {
  id: string
  message_id: string
  uid: number
  folder: string
  subject: string | null
  from_address: string | null
  from_name: string | null
  email_date: string | null
  seen: boolean
  has_attachments: boolean
  vendor_id: string | null
  vendor_name_raw: string | null
  amount: number | null
  currency: string | null
  transaction_date: string | null
  description: string | null
  order_id: string | null
  payment_card_last_four: string | null
  payment_card_type: string | null
  matched_transaction_id: string | null
  match_confidence: number | null
  match_method: string | null
  status: string
  classification: string | null
  extraction_confidence: number | null
  extraction_notes: string | null
  ai_reasoning: string | null
  ai_classification: string | null
  ai_suggested_skip: boolean
  parser_key: string | null
  synced_at: string
  processed_at: string | null
  matched_at: string | null
  created_at: string
  updated_at: string | null
  is_processed: boolean
  email_transaction_id: string | null
  effective_date: string | null
}

/**
 * Fetch email transactions with filters
 */
async function fetchEmailTransactions(
  page: number,
  limit: number,
  filters: EmailHubFilters
): Promise<{
  items: EmailTransactionRow[]
  hasMore: boolean
  total: number
}> {
  const params = new URLSearchParams()
  params.set("page", page.toString())
  params.set("limit", limit.toString())

  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.classification !== "all") params.set("classification", filters.classification)
  if (filters.currency !== "all") params.set("currency", filters.currency)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)
  if (filters.search) params.set("search", filters.search)
  if (filters.sort !== "email_date_desc") params.set("sort", filters.sort)
  if (filters.dateRange?.from) {
    const d = filters.dateRange.from
    params.set("dateFrom", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  if (filters.dateRange?.to) {
    const d = filters.dateRange.to
    params.set("dateTo", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }

  const response = await fetch(`/api/emails/transactions?${params.toString()}`)
  if (!response.ok) {
    throw new Error("Failed to fetch email transactions")
  }

  const data = await response.json()

  return {
    items: data.emails || [],
    hasMore: data.hasMore,
    total: data.total,
  }
}

/**
 * Hook for email transactions with infinite scroll and filtering
 */
export function useEmailTransactions(filters: EmailHubFilters) {
  return useInfiniteScroll<EmailTransactionRow>({
    fetchFn: async (page, limit) => {
      return fetchEmailTransactions(page, limit, filters)
    },
    limit: 20,
    deps: [
      filters.status,
      filters.classification,
      filters.currency,
      filters.confidence,
      filters.search,
      filters.sort,
      filters.dateRange?.from?.getTime(),
      filters.dateRange?.to?.getTime(),
    ],
    keyExtractor: (item) => item.id,
  })
}

/**
 * Fetch all IDs matching current filters (for select-all)
 */
export async function fetchAllFilteredIds(
  filters: EmailHubFilters
): Promise<string[]> {
  const params = new URLSearchParams()
  params.set("fields", "ids")

  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.classification !== "all") params.set("classification", filters.classification)
  if (filters.currency !== "all") params.set("currency", filters.currency)
  if (filters.confidence !== "all") params.set("confidence", filters.confidence)
  if (filters.search) params.set("search", filters.search)
  if (filters.dateRange?.from) {
    const d = filters.dateRange.from
    params.set("dateFrom", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  if (filters.dateRange?.to) {
    const d = filters.dateRange.to
    params.set("dateTo", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }

  const response = await fetch(`/api/emails/transactions?${params.toString()}`)
  if (!response.ok) {
    throw new Error("Failed to fetch filtered IDs")
  }

  const data = await response.json()
  return data.ids || []
}
