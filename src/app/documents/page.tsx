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

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Create API endpoint to fetch documents in Week 1 Day 4
      // For now, show empty state
      setDocuments([])
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              href="/documents/upload"
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
        {!loading && !error && documents.length === 0 && (
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
              href="/documents/upload"
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

        {/* Documents list */}
        {!loading && !error && documents.length > 0 && (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
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
                      <span
                        className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          doc.processing_status
                        )}`}
                      >
                        {getStatusLabel(doc.processing_status)}
                      </span>
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
