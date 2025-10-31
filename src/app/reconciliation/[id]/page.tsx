'use client'

/**
 * Reconciliation Review Detail Page
 *
 * Review individual documents and approve/reject transaction matches
 * - Shows document preview
 * - Displays extracted data
 * - Lists suggested matches with confidence scores
 * - Allows manual transaction selection
 * - Approve/reject actions
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface DocumentData {
  id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  file_url: string
  created_at: string
}

interface ExtractionData {
  vendor_name: string | null
  amount: number | null
  currency: string | null
  transaction_date: string | null
  extraction_confidence: number | null
}

interface TransactionMatch {
  id: string
  transaction_id: string
  confidence_score: number
  match_type: 'automatic' | 'suggested' | 'manual'
  metadata: {
    scores: {
      vendor: number
      amount: number
      date: number
      overall: number
    }
    match_reasons: string[]
  }
  transaction: {
    id: string
    description: string
    amount: number
    currency: string
    date: string
    category: string | null
    vendor?: {
      id: string
      name: string
    } | null
    payment_method?: {
      id: string
      name: string
    } | null
  }
}

interface QueueItemDetail {
  id: string
  document_id: string
  priority: 'low' | 'normal' | 'high'
  status: 'pending_review' | 'in_progress' | 'completed' | 'rejected'
  created_at: string
  document: DocumentData
  extraction: ExtractionData
  matches: TransactionMatch[]
  metadata: {
    match_count?: number
    best_match_confidence?: number
  }
}

interface ReconciliationDetailProps {
  params: Promise<{
    id: string
  }>
}

export default function ReconciliationDetailPage({
  params,
}: ReconciliationDetailProps) {
  const router = useRouter()
  const [queueId, setQueueId] = useState<string | null>(null)
  const [item, setItem] = useState<QueueItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setQueueId(p.id))
  }, [params])

  // Load queue item detail
  useEffect(() => {
    if (queueId) {
      loadQueueItem()
    }
  }, [queueId])

  // Auto-select best match if available
  useEffect(() => {
    if (item && item.matches.length > 0 && !selectedMatchId) {
      setSelectedMatchId(item.matches[0].transaction_id)
    }
  }, [item])

  const loadQueueItem = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/reconciliation/queue/${queueId}`)

      if (!response.ok) {
        throw new Error('Failed to load queue item')
      }

      const data = await response.json()
      setItem(data.item)

      // Mark as in_progress if pending
      if (data.item.status === 'pending_review') {
        await updateStatus('in_progress')
      }
    } catch (err) {
      console.error('Failed to load queue item:', err)
      setError('Failed to load queue item')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    try {
      await fetch(`/api/reconciliation/queue/${queueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleApprove = async () => {
    if (!selectedMatchId) {
      alert('Please select a transaction to match')
      return
    }

    try {
      setProcessing(true)

      const response = await fetch(`/api/reconciliation/queue/${queueId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: selectedMatchId }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve match')
      }

      // Navigate back to queue
      router.push('/reconciliation')
    } catch (err) {
      console.error('Failed to approve match:', err)
      alert('Failed to approve match. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    try {
      setProcessing(true)

      const response = await fetch(`/api/reconciliation/queue/${queueId}/reject`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to reject matches')
      }

      // Navigate back to queue
      router.push('/reconciliation')
    } catch (err) {
      console.error('Failed to reject matches:', err)
      alert('Failed to reject matches. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    if (confidence >= 75) return 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    if (confidence >= 60) return 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) return 'Excellent'
    if (confidence >= 75) return 'Good'
    if (confidence >= 60) return 'Fair'
    return 'Weak'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Item not found'}</p>
          <Link
            href="/reconciliation"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Back to Queue
          </Link>
        </div>
      </div>
    )
  }

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
                <BreadcrumbLink href="/reconciliation">Reconciliation</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Review</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/reconciliation"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Review Document
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review extracted data and approve or reject transaction matches
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column: Document info */}
          <div>
            {/* Document card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Document
              </h2>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    File Name
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {item.document.file_name}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    File Type
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {item.document.file_type}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    File Size
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {formatFileSize(item.document.file_size_bytes)}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Preview
                  </div>
                  <a
                    href={item.document.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Document
                  </a>
                </div>
              </div>
            </div>

            {/* Extracted data card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Extracted Data
              </h2>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Vendor
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {item.extraction.vendor_name || 'Not detected'}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Amount
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {item.extraction.amount && item.extraction.currency
                      ? `${item.extraction.amount} ${item.extraction.currency}`
                      : 'Not detected'}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Date
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {item.extraction.transaction_date
                      ? new Date(item.extraction.transaction_date).toLocaleDateString()
                      : 'Not detected'}
                  </div>
                </div>

                {item.extraction.extraction_confidence && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Extraction Confidence
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {item.extraction.extraction_confidence}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Transaction matches */}
          <div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Suggested Matches ({item.matches.length})
              </h2>

              {item.matches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No matching transactions found
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {item.matches.map((match) => (
                    <button
                      key={match.transaction_id}
                      onClick={() => setSelectedMatchId(match.transaction_id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedMatchId === match.transaction_id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {match.transaction.description}
                          </div>
                          {match.transaction.vendor && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {match.transaction.vendor.name}
                            </div>
                          )}
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(match.transaction.date).toLocaleDateString()} •{' '}
                            {match.transaction.amount} {match.transaction.currency}
                            {match.transaction.payment_method && (
                              <> • {match.transaction.payment_method.name}</>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getConfidenceColor(
                            match.confidence_score
                          )}`}
                        >
                          {match.confidence_score}% {getConfidenceLabel(match.confidence_score)}
                        </span>
                      </div>

                      {match.metadata.match_reasons && match.metadata.match_reasons.length > 0 && (
                        <div className="space-y-1">
                          {match.metadata.match_reasons.map((reason, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleApprove}
                  disabled={processing || !selectedMatchId}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {processing ? 'Processing...' : 'Approve Match'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
