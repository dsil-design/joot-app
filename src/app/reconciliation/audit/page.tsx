'use client'

/**
 * Reconciliation Audit Log Page
 *
 * Shows history of all reconciliation actions
 * - Approvals
 * - Rejections
 * - Status changes
 * - User actions
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AuditLogEntry {
  id: string
  queue_item_id: string
  document_id: string
  transaction_id: string | null
  action: 'approved' | 'rejected' | 'status_changed'
  performed_by: string
  created_at: string
  metadata: {
    previous_status?: string
    new_status?: string
    reason?: string
  }
  document: {
    file_name: string
  }
  user: {
    email: string
  }
  transaction?: {
    description: string
    amount: number
    currency: string
  } | null
}

export default function ReconciliationAuditPage() {
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    loadAuditLog()
  }, [filter])

  const loadAuditLog = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('action', filter)
      }

      const response = await fetch(`/api/reconciliation/audit?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch audit log')
      }

      const data = await response.json()
      setAuditLog(data.entries || [])
    } catch (err) {
      console.error('Failed to load audit log:', err)
      setError('Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approved':
        return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
      case 'rejected':
        return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      case 'status_changed':
        return 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return (
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'rejected':
        return (
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const filteredLog = auditLog.filter((entry) => {
    if (filter === 'all') return true
    return entry.action === filter
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Audit Log
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                History of all reconciliation actions
              </p>
            </div>
            <Link
              href="/reconciliation"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Back to Queue
            </Link>
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
              All ({auditLog.length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Approved ({auditLog.filter((e) => e.action === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'rejected'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Rejected ({auditLog.filter((e) => e.action === 'rejected').length})
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
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredLog.length === 0 && (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No audit entries
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No reconciliation actions have been performed yet
            </p>
          </div>
        )}

        {/* Audit log timeline */}
        {!loading && !error && filteredLog.length > 0 && (
          <div className="space-y-4">
            {filteredLog.map((entry, idx) => (
              <div
                key={entry.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">{getActionIcon(entry.action)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(
                          entry.action
                        )}`}
                      >
                        {entry.action.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-medium">Document:</span> {entry.document.file_name}
                      </div>

                      {entry.transaction && (
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          <span className="font-medium">Transaction:</span>{' '}
                          {entry.transaction.description} ({entry.transaction.amount}{' '}
                          {entry.transaction.currency})
                        </div>
                      )}

                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Performed by:</span> {entry.user.email}
                      </div>

                      {entry.metadata.reason && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Reason:</span> {entry.metadata.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
