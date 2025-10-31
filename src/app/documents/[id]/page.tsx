'use client'

/**
 * Document Detail Page
 *
 * Displays document details based on processing status:
 * - pending: Show file info with manual trigger option
 * - processing: Show progress with real-time updates
 * - completed: Show extracted data, matched transactions, and file viewer
 * - failed: Show error details with retry/delete options
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatFileSize, getFileTypeLabel } from '@/lib/utils/file-validation'
import type { Document, DocumentExtraction, TransactionDocumentMatch, Transaction, Vendor, PaymentMethod } from '@/lib/supabase/types'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Extended types for the API response
interface ExtendedMatch extends TransactionDocumentMatch {
  transaction?: Transaction & {
    vendor?: Vendor | null
    payment_method?: PaymentMethod | null
  }
}

interface DocumentDetailResponse {
  document: Document & {
    file_url?: string
    thumbnail_url?: string | null
    extraction?: DocumentExtraction | null
    matches?: ExtendedMatch[]
  }
}

type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface DocumentDetailProps {
  params: Promise<{
    id: string
  }>
}

export default function DocumentDetailPage({ params }: DocumentDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPage = searchParams.get('from') || 'documents'

  const [documentId, setDocumentId] = useState<string | null>(null)
  const [document, setDocument] = useState<DocumentDetailResponse['document'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setDocumentId(p.id))
  }, [params])

  // Load document data
  const loadDocument = useCallback(async () => {
    if (!documentId) return

    try {
      setError(null)

      const response = await fetch(`/api/documents/${documentId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found')
        }
        throw new Error('Failed to load document')
      }

      const data: DocumentDetailResponse = await response.json()
      setDocument(data.document)
    } catch (err) {
      console.error('Failed to load document:', err)
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  // Initial load
  useEffect(() => {
    if (documentId) {
      loadDocument()
    }
  }, [documentId, loadDocument])

  // Poll for updates if document is processing
  useEffect(() => {
    if (!document || document.processing_status !== 'processing') {
      return
    }

    const pollInterval = setInterval(() => {
      loadDocument()
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [document, loadDocument])

  // Handle manual processing trigger
  const handleTriggerProcessing = async () => {
    try {
      setProcessing(true)
      setError(null)

      const response = await fetch(`/api/documents/${documentId}/process-complete`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to start processing')
      }

      // Start polling for updates
      loadDocument()
    } catch (err) {
      console.error('Failed to trigger processing:', err)
      setError('Failed to start processing')
    } finally {
      setProcessing(false)
    }
  }

  // Handle document deletion
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      setError(null)

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      // Redirect back to documents list
      router.push(`/${fromPage}`)
    } catch (err) {
      console.error('Failed to delete document:', err)
      setError('Failed to delete document')
      setDeleting(false)
    }
  }

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
      case 'processing':
        return 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
      case 'pending':
        return 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
      case 'failed':
        return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
    }
  }

  const getStatusLabel = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed':
        return 'Processed'
      case 'processing':
        return 'Processing'
      case 'pending':
        return 'Pending'
      case 'failed':
        return 'Failed'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !document) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href={`/${fromPage}`}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to {fromPage}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!document) {
    return null
  }

  const status = document.processing_status as ProcessingStatus

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
                <BreadcrumbLink href="/documents">Documents</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{document.file_name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                {document.file_name}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                  {getFileTypeLabel(document.mime_type)}
                </span>
                <span>{formatFileSize(document.file_size_bytes)}</span>
                <span>{new Date(document.created_at!).toLocaleString()}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                  {getStatusLabel(status)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {status === 'failed' && (
                <>
                  <button
                    onClick={handleTriggerProcessing}
                    disabled={processing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    {processing ? 'Retrying...' : 'Retry Processing'}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              )}
              {status === 'pending' && (
                <button
                  onClick={handleTriggerProcessing}
                  disabled={processing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {processing ? 'Processing...' : 'Process Now'}
                </button>
              )}
              {status === 'completed' && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Document preview */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Document Preview
                </h2>
                {document.file_url && (
                  <a
                    href={document.file_url}
                    download={document.file_name}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </a>
                )}
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                {document.file_url ? (
                  <>
                    {/* PDF Preview */}
                    {document.mime_type === 'application/pdf' && (
                      <iframe
                        src={document.file_url}
                        className="w-full h-96 md:h-[600px]"
                        title={document.file_name}
                      />
                    )}

                    {/* Image Preview */}
                    {document.mime_type.startsWith('image/') && (
                      <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                        <img
                          src={document.file_url}
                          alt={document.file_name}
                          className="max-w-full max-h-[600px] object-contain"
                        />
                      </div>
                    )}

                    {/* Email files (.eml) - Show placeholder with download option */}
                    {document.mime_type === 'message/rfc822' && (
                      <div className="flex items-center justify-center h-96 md:h-[600px]">
                        <div className="text-center p-6">
                          <svg
                            className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-gray-900 dark:text-gray-100 text-lg font-medium mb-2">
                            Email Message
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                            Email files cannot be previewed in the browser
                          </p>
                          <a
                            href={document.file_url}
                            download={document.file_name}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                            Download to View
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Other file types - Generic preview */}
                    {document.mime_type !== 'application/pdf' &&
                      !document.mime_type.startsWith('image/') &&
                      document.mime_type !== 'message/rfc822' && (
                        <div className="flex items-center justify-center h-96 md:h-[600px]">
                          <div className="text-center p-6">
                            <svg
                              className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <p className="text-gray-900 dark:text-gray-100 text-lg font-medium mb-2">
                              {getFileTypeLabel(document.mime_type)}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                              Preview not available for this file type
                            </p>
                            <a
                              href={document.file_url}
                              download={document.file_name}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                              Download File
                            </a>
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-96 md:h-[600px]">
                    <div className="text-center p-6">
                      <svg
                        className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Document preview unavailable
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                        The file could not be loaded from storage
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column - Status-based content */}
          <div className="space-y-6">
            {/* Pending State */}
            {status === 'pending' && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Awaiting Processing
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This document is queued for processing. OCR and data extraction will begin automatically.
                </p>
                <button
                  onClick={handleTriggerProcessing}
                  disabled={processing}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {processing ? 'Processing...' : 'Process Now'}
                </button>
              </div>
            )}

            {/* Processing State */}
            {status === 'processing' && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Processing Document
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Running OCR and data extraction...
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This may take a few moments. The page will update automatically when complete.
                  </p>
                </div>
              </div>
            )}

            {/* Completed State */}
            {status === 'completed' && document.extraction && (
              <>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Extracted Data
                  </h2>
                  <dl className="space-y-3">
                    {document.extraction.merchant_name && (
                      <div>
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Merchant</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                          {document.extraction.merchant_name}
                        </dd>
                      </div>
                    )}
                    {document.extraction.amount && (
                      <div>
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Amount</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                          {document.extraction.currency || 'USD'} {document.extraction.amount.toFixed(2)}
                        </dd>
                      </div>
                    )}
                    {document.extraction.transaction_date && (
                      <div>
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Date</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                          {new Date(document.extraction.transaction_date).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {document.ocr_confidence && (
                      <div>
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">OCR Confidence</dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                          {document.ocr_confidence.toFixed(0)}%
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Matched Transactions */}
                {document.matches && document.matches.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Matched Transactions ({document.matches.length})
                    </h2>
                    <div className="space-y-3">
                      {document.matches.map((match) => (
                        <Link
                          key={match.id}
                          href={`/transactions?highlight=${match.transaction_id}`}
                          className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {match.transaction?.description || 'No description'}
                              </p>
                              {match.transaction?.vendor && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {match.transaction.vendor.name}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {match.transaction?.transaction_date &&
                                  new Date(match.transaction.transaction_date).toLocaleDateString()}
                                {match.transaction?.payment_method && (
                                  <> • {match.transaction.payment_method.name}</>
                                )}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {match.transaction?.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(match.confidence_score || match.match_confidence || 0).toFixed(0)}% match
                              </p>
                              {match.approved ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  ✓ Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  ⏳ Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No matches */}
                {(!document.matches || document.matches.length === 0) && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No Matches Found
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      No matching transactions were found for this document. You may need to create a transaction manually.
                    </p>
                    <button
                      onClick={handleTriggerProcessing}
                      disabled={processing}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Reprocessing...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Rerun Processing
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Failed State */}
            {status === 'failed' && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800 p-6">
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
                  Processing Failed
                </h2>
                {document.processing_error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                      {document.processing_error}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  The document could not be processed. You can try processing it again or delete it.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleTriggerProcessing}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    {processing ? 'Retrying...' : 'Retry'}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}

            {/* File Info */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                File Information
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">File Name</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1 break-all">
                    {document.file_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">File Type</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {getFileTypeLabel(document.mime_type)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">File Size</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {formatFileSize(document.file_size_bytes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Uploaded</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {new Date(document.created_at!).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
