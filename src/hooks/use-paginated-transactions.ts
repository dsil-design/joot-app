import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"

interface TransactionFilters {
  datePreset?: string
  dateFrom?: string
  dateTo?: string
  searchKeyword?: string
  vendorIds?: string[]
  paymentMethodIds?: string[]
  transactionType?: "all" | "expense" | "income"
}

interface PaginatedResponse {
  items: TransactionWithVendorAndPayment[]
  nextCursor: string | null
  hasNextPage: boolean
  totalCount: number
  pageSize: number
}

interface UsePaginatedTransactionsOptions {
  filters?: TransactionFilters
  pageSize?: number
  enabled?: boolean
  sortField?: string
  sortDirection?: string
}

export function usePaginatedTransactions({
  filters = {},
  pageSize = 30,
  enabled = true,
  sortField = "date",
  sortDirection = "desc",
}: UsePaginatedTransactionsOptions = {}) {
  const query = useInfiniteQuery<PaginatedResponse>({
    queryKey: ["transactions", "paginated", filters, pageSize, sortField, sortDirection],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()

      // Add pagination params
      params.set("pageSize", pageSize.toString())
      if (pageParam) {
        params.set("cursor", pageParam as string)
      }

      // Add sorting params
      params.set("sortField", sortField)
      params.set("sortDirection", sortDirection)

      // Add filters
      if (filters.datePreset) params.set("datePreset", filters.datePreset)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.set("dateTo", filters.dateTo)
      if (filters.searchKeyword) params.set("searchKeyword", filters.searchKeyword)
      if (filters.vendorIds?.length) params.set("vendorIds", filters.vendorIds.join(","))
      if (filters.paymentMethodIds?.length) params.set("paymentMethodIds", filters.paymentMethodIds.join(","))
      if (filters.transactionType) params.set("transactionType", filters.transactionType)

      const response = await fetch(`/api/transactions?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch transactions")
      }

      return response.json()
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (replaces cacheTime)
  })

  // Flatten all pages into a single array
  const allTransactions = useMemo(() => {
    return query.data?.pages.flatMap(page => page.items) ?? []
  }, [query.data?.pages])

  // Get total count from first page
  const totalCount = query.data?.pages[0]?.totalCount ?? 0

  return {
    // Data
    allTransactions,
    totalCount,

    // Pagination
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,

    // Status
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Refetch
    refetch: query.refetch,
  }
}
