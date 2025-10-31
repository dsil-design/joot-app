'use client'

/**
 * Documents List Page
 *
 * View and manage uploaded documents
 * - List all documents with status
 * - Filter by type and status
 * - Navigate to upload page
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatFileSize, getFileTypeLabel } from '@/lib/utils/file-validation'
import type { Document } from '@/lib/supabase/types'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'all' | 'failed'>('active')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/documents')

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err) {
      console.error('Failed to load documents:', err)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  // Filter documents based on active tab
  const filteredDocuments = documents.filter((doc) => {
    if (activeTab === 'active') {
      // Show completed, processing, and pending (hide failed)
      return ['completed', 'processing', 'pending'].includes(doc.processing_status)
    } else if (activeTab === 'failed') {
      return doc.processing_status === 'failed'
    }
    // 'all' tab - show everything
    return true
  })

  // Handle delete document
  const handleDelete = async (documentId: string, event: React.MouseEvent) => {
    event.preventDefault() // Prevent navigation
    event.stopPropagation()

    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeletingId(documentId)

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      // Remove from local state
      setDocuments(documents.filter((doc) => doc.id !== documentId))
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete document. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // Get visual styling based on status
  const getCardBorderClass = (status: string) => {
    switch (status) {
      case 'processing':
        return 'border-l-4 border-l-blue-500'
      case 'failed':
        return 'border-l-4 border-l-red-500'
      case 'pending':
        return 'border-l-4 border-l-yellow-500'
      default:
        return ''
    }
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
                <BreadcrumbPage>Documents</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Documents
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage receipts, invoices, and attachments
              </p>
            </div>
            <Link
              href="/documents/upload?from=documents"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Upload Document
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Active
              <span className="ml-2 py-0.5 px-2 rounded-full bg-gray-100 dark:bg-gray-800 text-xs">
                {documents.filter((d) => ['completed', 'processing', 'pending'].includes(d.processing_status)).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All Documents
              <span className="ml-2 py-0.5 px-2 rounded-full bg-gray-100 dark:bg-gray-800 text-xs">
                {documents.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'failed'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Failed
              <span className="ml-2 py-0.5 px-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs">
                {documents.filter((d) => d.processing_status === 'failed').length}
              </span>
            </button>
          </nav>
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
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredDocuments.length === 0 && documents.length === 0 && (
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
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No documents yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Upload your first receipt, invoice, or email attachment to get started
            </p>
            <Link
              href="/documents/upload?from=documents"
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
              Upload Your First Document
            </Link>
          </div>
        )}

        {/* No documents in current filter */}
        {!loading && !error && filteredDocuments.length === 0 && documents.length > 0 && (
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
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No {activeTab} documents
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeTab === 'failed'
                ? 'No failed documents. All your uploads have been successful!'
                : 'Try switching to a different tab to see more documents.'}
            </p>
          </div>
        )}

        {/* Documents list */}
        {!loading && !error && filteredDocuments.length > 0 && (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg ${getCardBorderClass(doc.processing_status)}`}
              >
                <Link
                  href={`/documents/${doc.id}?from=documents`}
                  className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                <div className="flex items-start gap-4">
                  {/* Thumbnail or icon */}
                  <div className="flex-shrink-0 w-16 h-16 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {doc.thumbnail_path ? (
                      <img
                        src={doc.thumbnail_path}
                        alt={doc.file_name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <svg
                        className="w-8 h-8 text-gray-400 dark:text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Document info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {doc.file_name}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                            {getFileTypeLabel(doc.mime_type)}
                          </span>
                          <span>{formatFileSize(doc.file_size_bytes)}</span>
                          <span>
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            doc.processing_status
                          )}`}
                        >
                          {getStatusLabel(doc.processing_status)}
                        </span>
                        {doc.processing_status === 'failed' && (
                          <button
                            onClick={(e) => handleDelete(doc.id, e)}
                            disabled={deletingId === doc.id}
                            className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            title="Delete failed document"
                          >
                            {deletingId === doc.id ? (
                              <svg
                                className="animate-spin h-5 w-5"
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
                            ) : (
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
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
                  </div>
                </div>
              </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
