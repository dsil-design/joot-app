"use client"

import * as React from "react"

/**
 * Infinite scroll pagination state
 */
export interface InfiniteScrollState<T> {
  /** Current items */
  items: T[]
  /** Whether currently loading */
  isLoading: boolean
  /** Whether initial load */
  isInitialLoading: boolean
  /** Whether there are more items to load */
  hasMore: boolean
  /** Current page */
  page: number
  /** Error if any */
  error: string | null
}

/**
 * Fetch function signature for infinite scroll
 */
export type FetchFunction<T> = (
  page: number,
  limit: number
) => Promise<{
  items: T[]
  hasMore: boolean
  total?: number
}>

/**
 * Options for useInfiniteScroll hook
 */
export interface UseInfiniteScrollOptions<T> {
  /**
   * Function to fetch more items
   */
  fetchFn: FetchFunction<T>

  /**
   * Number of items per page
   * @default 20
   */
  limit?: number

  /**
   * Threshold in pixels from bottom to trigger load
   * @default 200
   */
  threshold?: number

  /**
   * Whether to auto-fetch on mount
   * @default true
   */
  fetchOnMount?: boolean

  /**
   * Dependency array to reset and refetch
   */
  deps?: React.DependencyList

  /**
   * Key extractor for items (for scroll restoration)
   */
  keyExtractor?: (item: T) => string
}

/**
 * useInfiniteScroll Hook
 *
 * Provides infinite scroll pagination functionality with:
 * - Automatic loading when scrolling near bottom
 * - Scroll position preservation on navigation
 * - Manual refresh and reset capabilities
 * - Loading and error states
 */
export function useInfiniteScroll<T>({
  fetchFn,
  limit = 20,
  threshold = 200,
  fetchOnMount = true,
  deps = [],
  keyExtractor,
}: UseInfiniteScrollOptions<T>) {
  const [state, setState] = React.useState<InfiniteScrollState<T>>({
    items: [],
    isLoading: false,
    isInitialLoading: fetchOnMount,
    hasMore: true,
    page: 1, // Start at page 1 (1-based pagination)
    error: null,
  })

  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)
  const scrollPositionRef = React.useRef<number>(0)
  const isFetchingRef = React.useRef(false)

  /**
   * Fetch next page of items
   */
  const loadMore = React.useCallback(async () => {
    if (isFetchingRef.current || !state.hasMore) return

    isFetchingRef.current = true
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await fetchFn(state.page, limit)

      setState(prev => ({
        ...prev,
        items: [...prev.items, ...result.items],
        hasMore: result.hasMore,
        page: prev.page + 1,
        isLoading: false,
        isInitialLoading: false,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isInitialLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load items',
      }))
    } finally {
      isFetchingRef.current = false
    }
  }, [fetchFn, limit, state.hasMore, state.page])

  /**
   * Reset and refetch from start
   */
  const reset = React.useCallback(async () => {
    isFetchingRef.current = false
    setState({
      items: [],
      isLoading: true,
      isInitialLoading: true,
      hasMore: true,
      page: 1, // Start at page 1 (1-based pagination)
      error: null,
    })

    try {
      const result = await fetchFn(1, limit)

      setState({
        items: result.items,
        hasMore: result.hasMore,
        page: 2, // Next page to fetch
        isLoading: false,
        isInitialLoading: false,
        error: null,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isInitialLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load items',
      }))
    }
  }, [fetchFn, limit])

  /**
   * Refresh without resetting (reload current items)
   */
  const refresh = React.useCallback(async () => {
    if (state.items.length === 0) {
      return reset()
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Refetch all current pages (state.page tracks the NEXT page to fetch, so current items = (page-1) pages)
      const totalItems = (state.page - 1) * limit
      const result = await fetchFn(1, Math.max(totalItems, limit))

      setState(prev => ({
        ...prev,
        items: result.items,
        hasMore: result.hasMore,
        isLoading: false,
        error: null,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh items',
      }))
    }
  }, [fetchFn, limit, reset, state.items.length, state.page])

  /**
   * Save scroll position
   */
  const saveScrollPosition = React.useCallback(() => {
    scrollPositionRef.current = window.scrollY
  }, [])

  /**
   * Restore scroll position
   */
  const restoreScrollPosition = React.useCallback(() => {
    if (scrollPositionRef.current > 0) {
      window.scrollTo(0, scrollPositionRef.current)
    }
  }, [])

  // Set up Intersection Observer for load more trigger
  React.useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingRef.current && state.hasMore) {
          loadMore()
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMore, state.hasMore, threshold])

  // Initial fetch on mount
  React.useEffect(() => {
    if (fetchOnMount && state.items.length === 0 && state.isInitialLoading) {
      loadMore()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset when deps change
  React.useEffect(() => {
    if (deps.length > 0) {
      reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Update item at index
  const updateItem = React.useCallback((index: number, updater: (item: T) => T) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? updater(item) : item)),
    }))
  }, [])

  // Update item by key
  const updateItemByKey = React.useCallback(
    (key: string, updater: (item: T) => T) => {
      if (!keyExtractor) return

      setState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          keyExtractor(item) === key ? updater(item) : item
        ),
      }))
    },
    [keyExtractor]
  )

  // Remove item at index
  const removeItem = React.useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }, [])

  // Remove item by key
  const removeItemByKey = React.useCallback(
    (key: string) => {
      if (!keyExtractor) return

      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => keyExtractor(item) !== key),
      }))
    },
    [keyExtractor]
  )

  return {
    // State
    ...state,

    // Refs
    loadMoreRef,

    // Actions
    loadMore,
    reset,
    refresh,
    updateItem,
    updateItemByKey,
    removeItem,
    removeItemByKey,

    // Scroll position
    saveScrollPosition,
    restoreScrollPosition,
  }
}

/**
 * LoadMoreTrigger Component
 *
 * Invisible element that triggers loading when scrolled into view
 */
export function LoadMoreTrigger({
  loadMoreRef,
  isLoading,
  hasMore,
}: {
  loadMoreRef: React.RefObject<HTMLDivElement | null>
  isLoading: boolean
  hasMore: boolean
}) {
  if (!hasMore) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No more items to load
      </div>
    )
  }

  return (
    <div ref={loadMoreRef} className="py-8 text-center">
      {isLoading && (
        <div className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading more...</span>
        </div>
      )}
    </div>
  )
}
