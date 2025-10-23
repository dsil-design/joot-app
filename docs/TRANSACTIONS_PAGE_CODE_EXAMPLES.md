# All Transactions Page - Code Examples

This document provides ready-to-use code examples for implementing the progressive loading strategy.

## Table of Contents

1. [API Route Implementation](#api-route-implementation)
2. [React Query Hook](#react-query-hook)
3. [Main Page Component](#main-page-component)
4. [Skeleton Components](#skeleton-components)
5. [Utility Functions](#utility-functions)
6. [Database Migrations](#database-migrations)

---

## API Route Implementation

### `/src/app/api/transactions/list/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'

interface TransactionCursor {
  transaction_date: string
  id: string
}

interface TransactionListRequest {
  cursor?: string  // Base64 encoded cursor
  limit?: number
  filters?: {
    dateRange?: { from: string; to: string }
    datePreset?: string
    transactionType?: 'all' | 'expense' | 'income'
    searchKeyword?: string
    vendorIds?: string[]
    paymentMethodIds?: string[]
  }
  sort?: {
    field: 'date' | 'description' | 'vendor' | 'amount'
    direction: 'asc' | 'desc'
  }
}

interface TransactionListResponse {
  transactions: TransactionWithVendorAndPayment[]
  nextCursor?: string
  hasMore: boolean
  totalCount?: number
}

function encodeCursor(cursor: TransactionCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64')
}

function decodeCursor(encodedCursor: string): TransactionCursor {
  return JSON.parse(Buffer.from(encodedCursor, 'base64').toString())
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: TransactionListRequest = await request.json()
    const limit = Math.min(body.limit ?? 30, 100) // Max 100 per page

    // Start building query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        vendors (
          id,
          name
        ),
        payment_methods (
          id,
          name
        ),
        transaction_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `, {
        // Only count on first page (expensive operation)
        count: body.cursor ? undefined : 'exact'
      })
      .eq('user_id', user.id)

    // Apply cursor pagination
    if (body.cursor) {
      try {
        const cursor = decodeCursor(body.cursor)
        // Composite cursor: (date, id)
        // Get rows where date < cursor.date OR (date = cursor.date AND id < cursor.id)
        query = query.or(
          `transaction_date.lt.${cursor.transaction_date},` +
          `and(transaction_date.eq.${cursor.transaction_date},id.lt.${cursor.id})`
        )
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid cursor' },
          { status: 400 }
        )
      }
    }

    // Apply filters
    if (body.filters) {
      const { dateRange, transactionType, searchKeyword, vendorIds, paymentMethodIds } = body.filters

      // Date range filter
      if (dateRange?.from) {
        query = query.gte('transaction_date', dateRange.from)
      }
      if (dateRange?.to) {
        query = query.lte('transaction_date', dateRange.to)
      }

      // Transaction type filter
      if (transactionType && transactionType !== 'all') {
        query = query.eq('transaction_type', transactionType)
      }

      // Search keyword filter (case-insensitive)
      if (searchKeyword && searchKeyword.trim()) {
        query = query.ilike('description', `%${searchKeyword.trim()}%`)
      }

      // Vendor filter
      if (vendorIds && vendorIds.length > 0) {
        query = query.in('vendor_id', vendorIds)
      }

      // Payment method filter (including "none")
      if (paymentMethodIds && paymentMethodIds.length > 0) {
        const hasNone = paymentMethodIds.includes('none')
        const realIds = paymentMethodIds.filter(id => id !== 'none')

        if (hasNone && realIds.length > 0) {
          // Either null OR in the list
          query = query.or(
            `payment_method_id.is.null,payment_method_id.in.(${realIds.join(',')})`
          )
        } else if (hasNone) {
          // Only null
          query = query.is('payment_method_id', null)
        } else {
          // Only in the list
          query = query.in('payment_method_id', realIds)
        }
      }
    }

    // Apply sorting
    const sortField = body.sort?.field ?? 'date'
    const sortDirection = body.sort?.direction ?? 'desc'
    const ascending = sortDirection === 'asc'

    if (sortField === 'date') {
      query = query.order('transaction_date', { ascending })
    } else if (sortField === 'amount') {
      query = query.order('amount', { ascending })
    } else if (sortField === 'description') {
      query = query.order('description', { ascending, nullsFirst: false })
    }
    // Note: Sorting by vendor requires joining, handled client-side for now

    // Always add ID as secondary sort for consistency
    query = query.order('id', { ascending })

    // Fetch limit + 1 to check if there are more results
    query = query.limit(limit + 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Transform data
    const rawTransactions = data || []
    const hasMore = rawTransactions.length > limit
    const transactions = rawTransactions
      .slice(0, limit)
      .map((t: any) => ({
        ...t,
        tags: t.transaction_tags?.map((tt: any) => tt.tags).filter(Boolean) || []
      })) as TransactionWithVendorAndPayment[]

    // Generate next cursor
    const nextCursor = hasMore && transactions.length > 0
      ? encodeCursor({
          transaction_date: transactions[transactions.length - 1].transaction_date,
          id: transactions[transactions.length - 1].id
        })
      : undefined

    const response: TransactionListResponse = {
      transactions,
      nextCursor,
      hasMore,
      totalCount: count ?? undefined
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## React Query Hook

### `/src/hooks/use-paginated-transactions.ts`

```typescript
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/AuthProvider'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'

export interface TransactionFilters {
  dateRange?: { from: Date; to: Date }
  datePreset?: string
  searchKeyword?: string
  vendorIds?: string[]
  paymentMethodIds?: string[]
  transactionType?: 'all' | 'expense' | 'income'
}

export interface SortConfig {
  field: 'date' | 'description' | 'vendor' | 'amount'
  direction: 'asc' | 'desc'
}

interface TransactionListResponse {
  transactions: TransactionWithVendorAndPayment[]
  nextCursor?: string
  hasMore: boolean
  totalCount?: number
}

interface UsePaginatedTransactionsOptions {
  filters?: TransactionFilters
  sort?: SortConfig
  initialPageSize?: number
}

function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function usePaginatedTransactions({
  filters,
  sort = { field: 'date', direction: 'desc' },
  initialPageSize = 30
}: UsePaginatedTransactionsOptions = {}) {
  const { user } = useAuth()

  const query = useInfiniteQuery({
    queryKey: ['transactions', 'paginated', filters, sort],
    queryFn: async ({ pageParam }) => {
      // Build request body
      const requestBody = {
        cursor: pageParam,
        limit: initialPageSize,
        filters: filters ? {
          dateRange: filters.dateRange ? {
            from: formatDateForAPI(filters.dateRange.from),
            to: formatDateForAPI(filters.dateRange.to)
          } : undefined,
          datePreset: filters.datePreset,
          transactionType: filters.transactionType,
          searchKeyword: filters.searchKeyword,
          vendorIds: filters.vendorIds,
          paymentMethodIds: filters.paymentMethodIds
        } : undefined,
        sort
      }

      const response = await fetch('/api/transactions/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch transactions')
      }

      return response.json() as Promise<TransactionListResponse>
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2
  })

  return {
    ...query,
    // Flattened transactions array for convenience
    allTransactions: query.data?.pages.flatMap(page => page.transactions) ?? [],
    totalCount: query.data?.pages[0]?.totalCount
  }
}

// Hook for creating transactions with optimistic updates
export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to create transaction')
      }

      return response.json()
    },
    onMutate: async (newTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transactions', 'paginated'] })

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['transactions', 'paginated'])

      // Optimistically update cache
      queryClient.setQueryData(['transactions', 'paginated'], (old: any) => {
        if (!old) return old

        const newPages = [...old.pages]
        if (newPages[0]) {
          newPages[0] = {
            ...newPages[0],
            transactions: [newTransaction, ...newPages[0].transactions],
            totalCount: (newPages[0].totalCount ?? 0) + 1
          }
        }

        return { ...old, pages: newPages }
      })

      return { previousData }
    },
    onError: (err, newTransaction, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['transactions', 'paginated'], context.previousData)
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['transactions', 'paginated'] })
    }
  })
}

// Hook for deleting transactions
export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete transaction')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'paginated'] })
    }
  })
}
```

---

## Main Page Component

### `/src/app/transactions/components/PaginatedTransactionsContent.tsx`

```typescript
"use client"

import * as React from "react"
import { useInView } from "react-intersection-observer"
import { usePaginatedTransactions } from "@/hooks/use-paginated-transactions"
import { TransactionsTable } from "@/components/page-specific/transactions-table"
import { TransactionGroup } from "@/components/page-specific/transactions-list"
import { QuickFilterBar } from "@/components/page-specific/quick-filter-bar"
import { TransactionTableSkeleton } from "./TransactionTableSkeleton"
import { TransactionCardsSkeleton } from "./TransactionCardsSkeleton"
import type { TransactionFilters, SortConfig } from "@/hooks/use-paginated-transactions"
import { getPresetRange } from "@/lib/utils/date-filters"
import { Loader2 } from "lucide-react"

interface PaginatedTransactionsContentProps {
  layoutMode: 'cards' | 'table'
  isMobile: boolean
  viewMode: 'recorded' | 'all-usd' | 'all-thb'
}

export function PaginatedTransactionsContent({
  layoutMode,
  isMobile,
  viewMode
}: PaginatedTransactionsContentProps) {
  const [filters, setFilters] = React.useState<TransactionFilters>({
    dateRange: getPresetRange('this-month'),
    datePreset: 'this-month',
    searchKeyword: '',
    vendorIds: [],
    paymentMethodIds: [],
    transactionType: 'all'
  })

  const [sort, setSort] = React.useState<SortConfig>({
    field: 'date',
    direction: 'desc'
  })

  const {
    allTransactions,
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = usePaginatedTransactions({
    filters,
    sort,
    initialPageSize: 30
  })

  // Intersection observer for infinite scroll
  const { ref: sentinelRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px' // Start loading before user reaches bottom
  })

  // Auto-fetch next page when sentinel is visible
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Track scroll position for performance monitoring
  React.useEffect(() => {
    if (allTransactions.length > 0 && totalCount) {
      const percentLoaded = (allTransactions.length / totalCount) * 100
      console.log(`Loaded ${allTransactions.length} of ${totalCount} transactions (${percentLoaded.toFixed(1)}%)`)
    }
  }, [allTransactions.length, totalCount])

  // Handle filter changes
  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters)
    // React Query will automatically refetch with new queryKey
  }

  const handleSortChange = (field: SortConfig['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Loading state
  if (isLoading) {
    return layoutMode === 'table'
      ? <TransactionTableSkeleton rows={10} />
      : <TransactionCardsSkeleton groups={3} />
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Failed to load transactions'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  // Empty state
  if (!isLoading && allTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-zinc-500">
          No transactions found matching the filters.
        </p>
      </div>
    )
  }

  // Group transactions by date for card view
  const groupedTransactions = React.useMemo(() => {
    if (layoutMode !== 'cards') return []

    const groups: Record<string, typeof allTransactions> = {}
    allTransactions.forEach((transaction) => {
      const date = transaction.transaction_date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(transaction)
    })

    const sortedDates = Object.keys(groups).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    )

    return sortedDates.map(date => ({
      date,
      transactions: groups[date]
    }))
  }, [allTransactions, layoutMode])

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Progress indicator for "All Time" */}
      {filters.datePreset === 'all-time' && totalCount && (
        <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-900">
              Loaded {allTransactions.length.toLocaleString()} of {totalCount.toLocaleString()} transactions
            </span>
            <span className="text-blue-700">
              {((allTransactions.length / totalCount) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(allTransactions.length / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Transaction List/Table */}
      {layoutMode === 'cards' ? (
        <div className="flex flex-col gap-6">
          {groupedTransactions.map(({ date, transactions }) => (
            <TransactionGroup
              key={date}
              date={date}
              transactions={transactions}
              viewMode={viewMode}
              isMobile={isMobile}
            />
          ))}
        </div>
      ) : (
        <TransactionsTable
          transactions={allTransactions}
          viewMode={viewMode}
          sortField={sort.field}
          sortDirection={sort.direction}
          onSort={handleSortChange}
        />
      )}

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="py-8 flex justify-center items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          <span className="text-sm text-zinc-600">Loading more transactions...</span>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasNextPage && !isFetchingNextPage && (
        <div
          ref={sentinelRef}
          className="h-20 flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="text-xs text-zinc-400">Scroll to load more</div>
        </div>
      )}

      {/* End of results */}
      {!hasNextPage && allTransactions.length > 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-500">
            {totalCount
              ? `All ${totalCount.toLocaleString()} transactions loaded`
              : 'All transactions loaded'
            }
          </p>
        </div>
      )}
    </div>
  )
}
```

---

## Skeleton Components

### `/src/app/transactions/components/TransactionTableSkeleton.tsx`

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface TransactionTableSkeletonProps {
  rows?: number
}

export function TransactionTableSkeleton({ rows = 10 }: TransactionTableSkeletonProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
            <TableHead className="w-[40px]">
              <div className="h-4 w-4 bg-zinc-200 rounded animate-pulse" />
            </TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-4 bg-zinc-200 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <div className="h-8 w-8 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-zinc-200 rounded animate-pulse" />
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-16 bg-zinc-200 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-48 bg-zinc-200 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-28 bg-zinc-200 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <div className="h-5 w-12 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-5 w-12 bg-zinc-200 rounded animate-pulse" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### `/src/app/transactions/components/TransactionCardsSkeleton.tsx`

```typescript
interface TransactionCardsSkeletonProps {
  groups?: number
  cardsPerGroup?: number
}

export function TransactionCardsSkeleton({
  groups = 3,
  cardsPerGroup = 4
}: TransactionCardsSkeletonProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {Array.from({ length: groups }).map((_, groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-3">
          {/* Date header skeleton */}
          <div className="h-7 w-32 bg-zinc-200 rounded animate-pulse" />

          {/* Transaction cards skeleton */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: cardsPerGroup }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="bg-white border border-zinc-200 rounded-lg p-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-5 w-48 bg-zinc-200 rounded mb-2" />
                    <div className="h-4 w-32 bg-zinc-200 rounded" />
                  </div>
                  <div className="h-6 w-24 bg-zinc-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Utility Functions

### `/src/lib/utils/cursor-pagination.ts`

```typescript
export interface Cursor {
  transaction_date: string
  id: string
}

export function encodeCursor(cursor: Cursor): string {
  try {
    return Buffer.from(JSON.stringify(cursor)).toString('base64')
  } catch (error) {
    console.error('Failed to encode cursor:', error)
    throw new Error('Invalid cursor data')
  }
}

export function decodeCursor(encodedCursor: string): Cursor {
  try {
    return JSON.parse(Buffer.from(encodedCursor, 'base64').toString())
  } catch (error) {
    console.error('Failed to decode cursor:', error)
    throw new Error('Invalid cursor format')
  }
}

export function validateCursor(cursor: any): cursor is Cursor {
  return (
    typeof cursor === 'object' &&
    cursor !== null &&
    typeof cursor.transaction_date === 'string' &&
    typeof cursor.id === 'string'
  )
}
```

---

## Database Migrations

### Add Composite Index for Pagination

```sql
-- Migration: Add composite index for efficient cursor pagination
-- File: database/migrations/20251024000000_add_pagination_indexes.sql

-- Composite index for user + date queries (most common)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_id
ON public.transactions(user_id, transaction_date DESC, id DESC);

-- Composite index for filtered queries (type + date)
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date
ON public.transactions(user_id, transaction_type, transaction_date DESC);

-- Index for search queries (description)
CREATE INDEX IF NOT EXISTS idx_transactions_description_trgm
ON public.transactions USING gin (description gin_trgm_ops);

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Analyze tables to update query planner statistics
ANALYZE public.transactions;
```

---

## Performance Monitoring

### `/src/lib/utils/performance-monitoring.ts`

```typescript
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private marks: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  mark(name: string): void {
    this.marks.set(name, performance.now())
    if (typeof window !== 'undefined') {
      performance.mark(name)
    }
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark)
    if (!start) {
      console.warn(`Start mark "${startMark}" not found`)
      return 0
    }

    const end = endMark ? this.marks.get(endMark) : performance.now()
    if (!end) {
      console.warn(`End mark "${endMark}" not found`)
      return 0
    }

    const duration = end - start

    if (typeof window !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark)
      } catch (error) {
        console.warn('Failed to create performance measure:', error)
      }
    }

    return duration
  }

  async trackPageLoad<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startMark = `${operationName}-start`
    const endMark = `${operationName}-end`

    this.mark(startMark)

    try {
      const result = await operation()
      this.mark(endMark)

      const duration = this.measure(operationName, startMark, endMark)

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`)
      }

      // Send to analytics in production
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('performance-metric', {
          operation: operationName,
          duration,
          timestamp: Date.now()
        })
      }

      return result
    } catch (error) {
      this.mark(endMark)
      throw error
    }
  }

  getMetrics(): PerformanceEntry[] {
    if (typeof window === 'undefined') return []

    return performance.getEntriesByType('measure')
  }

  clearMetrics(): void {
    this.marks.clear()
    if (typeof window !== 'undefined') {
      performance.clearMarks()
      performance.clearMeasures()
    }
  }
}

// Usage example
export async function trackTransactionLoad(
  operation: () => Promise<any>
): Promise<any> {
  const monitor = PerformanceMonitor.getInstance()
  return monitor.trackPageLoad('transactions-list-load', operation)
}
```

---

## Testing

### Performance Test Script

```typescript
// __tests__/performance/transactions-pagination.test.ts

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePaginatedTransactions } from '@/hooks/use-paginated-transactions'

describe('Transactions Pagination Performance', () => {
  it('should load first page within 500ms', async () => {
    const startTime = performance.now()

    const { result } = renderHook(() =>
      usePaginatedTransactions({ initialPageSize: 30 })
    )

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 1000 }
    )

    const duration = performance.now() - startTime
    expect(duration).toBeLessThan(500)
  })

  it('should fetch exactly 30 transactions on first load', async () => {
    const { result } = renderHook(() =>
      usePaginatedTransactions({ initialPageSize: 30 })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.allTransactions).toHaveLength(30)
  })

  it('should handle infinite scroll efficiently', async () => {
    const { result } = renderHook(() =>
      usePaginatedTransactions({ initialPageSize: 30 })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const initialCount = result.current.allTransactions.length

    // Trigger next page
    await result.current.fetchNextPage()

    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))

    expect(result.current.allTransactions.length).toBe(initialCount + 30)
  })
})
```

---

## Summary

This implementation provides:

1. **Cursor-based pagination** - Consistent performance regardless of dataset size
2. **Server-side filtering** - Reduces data transfer and client-side processing
3. **Infinite scroll** - Natural UX with automatic loading
4. **Optimistic updates** - Instant feedback for user actions
5. **Skeleton states** - Professional loading experience
6. **Performance monitoring** - Track and optimize load times
7. **Proper indexing** - Database queries remain fast at scale

**Next Steps:**
1. Copy these code examples to your project
2. Run the database migration
3. Test with different data sizes
4. Monitor performance metrics
5. Iterate based on real-world usage
