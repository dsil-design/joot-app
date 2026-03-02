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
  /** Total number of items (from last API response) */
  total: number | null
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
    total: null,
    error: null,
  })

  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)
  const scrollPositionRef = React.useRef<number>(0)
  const isFetchingRef = React.useRef(false)
  const fetchIdRef = React.useRef(0) // Track current fetch to ignore stale responses
  const initialFetchDoneRef = React.useRef(false) // Track if initial fetch has been done
  const mountedRef = React.useRef(true) // Track if component is mounted

  // Store keyExtractor in a ref to use in state updates
  const keyExtractorRef = React.useRef(keyExtractor)
  keyExtractorRef.current = keyExtractor

  /**
   * Fetch next page of items
   */
  const loadMore = React.useCallback(async () => {
    if (isFetchingRef.current || !state.hasMore) return

    isFetchingRef.current = true
    initialFetchDoneRef.current = true // Mark as done to prevent duplicate fetches
    const currentFetchId = ++fetchIdRef.current
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await fetchFn(state.page, limit)

      // Ignore stale responses
      if (currentFetchId !== fetchIdRef.current) {
        return
      }

      setState(prev => {
        // Deduplicate items using keyExtractor if available
        let newItems: T[]
        if (keyExtractorRef.current) {
          // First deduplicate within result.items
          const resultSeen = new Set<string>()
          const dedupedResult = result.items.filter(item => {
            const key = keyExtractorRef.current!(item)
            if (resultSeen.has(key)) return false
            resultSeen.add(key)
            return true
          })

          // Then filter out items that already exist
          const existingKeys = new Set(prev.items.map(keyExtractorRef.current))
          const uniqueNewItems = dedupedResult.filter(item => !existingKeys.has(keyExtractorRef.current!(item)))
          newItems = [...prev.items, ...uniqueNewItems]
        } else {
          newItems = [...prev.items, ...result.items]
        }

        return {
          ...prev,
          items: newItems,
          hasMore: result.hasMore,
          total: result.total ?? prev.total,
          page: prev.page + 1,
          isLoading: false,
          isInitialLoading: false,
        }
      })
    } catch (error) {
      // Ignore errors from stale requests
      if (currentFetchId !== fetchIdRef.current) {
        return
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        isInitialLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load items',
      }))
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        isFetchingRef.current = false
      }
    }
  }, [fetchFn, limit, state.hasMore, state.page])

  /**
   * Reset and refetch from start
   */
  const reset = React.useCallback(async () => {
    // Prevent concurrent resets
    if (isFetchingRef.current) return

    isFetchingRef.current = true
    initialFetchDoneRef.current = true // Mark as done to prevent duplicate fetches
    const currentFetchId = ++fetchIdRef.current
    setState({
      items: [],
      isLoading: true,
      isInitialLoading: true,
      hasMore: true,
      page: 1, // Start at page 1 (1-based pagination)
      total: null,
      error: null,
    })

    try {
      const result = await fetchFn(1, limit)

      // Ignore stale responses
      if (currentFetchId !== fetchIdRef.current) {
        return
      }

      // Deduplicate items within the result if keyExtractor is available
      let dedupedItems = result.items
      if (keyExtractorRef.current) {
        const seen = new Set<string>()
        dedupedItems = result.items.filter(item => {
          const key = keyExtractorRef.current!(item)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      }

      setState({
        items: dedupedItems,
        hasMore: result.hasMore,
        total: result.total ?? null,
        page: 2, // Next page to fetch
        isLoading: false,
        isInitialLoading: false,
        error: null,
      })
    } catch (error) {
      if (currentFetchId !== fetchIdRef.current) {
        return
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        isInitialLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load items',
      }))
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        isFetchingRef.current = false
      }
    }
  }, [fetchFn, limit])

  /**
   * Refresh without resetting (reload current items)
   */
  const refresh = React.useCallback(async () => {
    if (state.items.length === 0) {
      return reset()
    }

    // Prevent concurrent refreshes
    if (isFetchingRef.current) return

    isFetchingRef.current = true
    const currentFetchId = ++fetchIdRef.current
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Refetch all current pages (state.page tracks the NEXT page to fetch, so current items = (page-1) pages)
      const totalItems = (state.page - 1) * limit
      const result = await fetchFn(1, Math.max(totalItems, limit))

      // Ignore stale responses
      if (currentFetchId !== fetchIdRef.current) {
        return
      }

      // Deduplicate items within the result if keyExtractor is available
      let dedupedItems = result.items
      if (keyExtractorRef.current) {
        const seen = new Set<string>()
        dedupedItems = result.items.filter(item => {
          const key = keyExtractorRef.current!(item)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      }

      setState(prev => ({
        ...prev,
        items: dedupedItems,
        hasMore: result.hasMore,
        total: result.total ?? prev.total,
        isLoading: false,
        error: null,
      }))
    } catch (error) {
      if (currentFetchId !== fetchIdRef.current) {
        return
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh items',
      }))
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        isFetchingRef.current = false
      }
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

  // Track if this is the initial mount (must be declared before effects that use it)
  const isInitialMountRef = React.useRef(true)

  // Reset mounted state on unmount
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Initial fetch on mount - single source of truth for initial load
  React.useEffect(() => {
    if (fetchOnMount && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true
      loadMore()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set up Intersection Observer for load more trigger
  // IMPORTANT: Only observe after initial fetch is done to avoid race conditions
  React.useEffect(() => {
    // Don't set up observer until initial fetch is complete
    if (!initialFetchDoneRef.current || state.isInitialLoading) {
      return
    }

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingRef.current && state.hasMore && !state.isInitialLoading) {
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
  }, [loadMore, state.hasMore, state.isInitialLoading, threshold])

  // Reset when deps change (but not on initial mount)
  React.useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }
    if (deps.length > 0) {
      // Reset the initialFetchDone flag when deps change
      initialFetchDoneRef.current = false
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
