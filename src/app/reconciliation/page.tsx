'use client'

/**
 * Reconciliation Queue Page
 *
 * Lists all documents awaiting manual review
 * - Pending matches that need approval
 * - Documents with no matches
 * - Sorted by priority and date
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatFileSize } from '@/lib/utils/file-validation'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface QueueItem {
  id: string
  document_id: string
  priority: 'low' | 'normal' | 'high'
  status: 'pending_review' | 'in_progress' | 'completed' | 'rejected'
  created_at: string
  document: {
    id: string
    file_name: string
    file_type: string
    file_size_bytes: number
    created_at: string
  }
  extraction: {
    vendor_name: string | null
    amount: number | null
    currency: string | null
    transaction_date: string | null
  }
  metadata: {
    match_count?: number
    best_match_confidence?: number
  }
}

export default function ReconciliationQueuePage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('pending')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQueue()
  }, [filter])

  const loadQueue = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      if (filter !== 'all') {
        let status = 'pending_review'
        if (filter === 'in_progress') status = 'in_progress'
        if (filter === 'completed') status = 'completed'
        params.set('status', status)
      }

      // Fetch queue items
      const response = await fetch(`/api/reconciliation/queue?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch queue')
      }

      const data = await response.json()
      setQueueItems(data.items || [])
    } catch (err) {
      console.error('Failed to load reconciliation queue:', err)
      setError('Failed to load queue')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      case 'normal':
        return 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
      case 'low':
        return 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
      case 'in_progress':
        return 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
      case 'completed':
        return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
      case 'rejected':
        return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
    }
  }

  const filteredItems = queueItems.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'pending') return item.status === 'pending_review'
    if (filter === 'in_progress') return item.status === 'in_progress'
    if (filter === 'completed') return item.status === 'completed'
    return true
  })

  const pendingCount = queueItems.filter((i) => i.status === 'pending_review').length
  const inProgressCount = queueItems.filter((i) => i.status === 'in_progress').length
  const completedCount = queueItems.filter((i) => i.status === 'completed').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumbs */}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/home">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Reconciliation</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Reconciliation Queue
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review and approve document matches
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {pendingCount}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  pending
                </span>
              </div>
              {inProgressCount > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {inProgressCount}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    in progress
                  </span>
                </div>
              )}
              <Link
                href="/reconciliation/audit"
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                View Audit Log
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All ({queueItems.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Pending Review ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'in_progress'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {error}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <svg
                className="w-12 h-12 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No items in queue
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              All documents have been reviewed or there are no pending items
            </p>
            <Link
              href="/documents/upload?from=reconciliation"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload Document
            </Link>
          </div>
        )}

        {/* Queue items list */}
        {!loading && !error && filteredItems.length > 0 && (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/reconciliation/${item.id}`}
                className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left side: Document info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                          item.priority
                        )}`}
                      >
                        {item.priority.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                      {item.document.file_name}
                    </h3>

                    {item.extraction && (
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        {item.extraction.vendor_name && (
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            {item.extraction.vendor_name}
                          </span>
                        )}
                        {item.extraction.amount && item.extraction.currency && (
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {item.extraction.amount} {item.extraction.currency}
                          </span>
                        )}
                        {item.extraction.transaction_date && (
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {new Date(item.extraction.transaction_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right side: Match info */}
                  <div className="flex items-center gap-4">
                    {item.metadata.match_count !== undefined && (
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {item.metadata.match_count}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.metadata.match_count === 1 ? 'match' : 'matches'}
                        </div>
                      </div>
                    )}

                    {item.metadata.best_match_confidence !== undefined &&
                      item.metadata.best_match_confidence > 0 && (
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {item.metadata.best_match_confidence}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            confidence
                          </div>
                        </div>
                      )}

                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
