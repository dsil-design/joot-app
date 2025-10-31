'use client'

/**
 * Document Upload Page
 *
 * Upload documents (receipts, invoices, emails) for processing
 * - Drag and drop file upload
 * - Client-side validation
 * - Progress tracking
 * - Automatic compression for images
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/documents/FileUpload'
import { UploadProgress } from '@/components/documents/UploadProgress'

interface UploadState {
  file: File | null
  uploading: boolean
  progress: number
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  error: string | null
  compressionInfo?: {
    originalSize: number
    compressedSize: number
    percentSaved: number
  }
  documentId?: string
  processingStep?: string
  processingMessage?: string
  extractedData?: {
    vendor?: string
    amount?: number
    currency?: string
    date?: string
  }
  matchCount?: number
}

export default function DocumentUploadPage() {
  const router = useRouter()
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    status: 'idle',
    error: null,
  })

  // Handle file selection from FileUpload component
  const handleFileSelect = (file: File) => {
    setUploadState({
      file,
      uploading: false,
      progress: 0,
      status: 'idle',
      error: null,
    })
  }

  // Handle validation errors from FileUpload component
  const handleValidationError = (error: string) => {
    setUploadState((prev) => ({
      ...prev,
      error,
      status: 'error',
    }))
  }

  // Upload file to API
  const handleUpload = async () => {
    if (!uploadState.file) return

    setUploadState((prev) => ({
      ...prev,
      uploading: true,
      status: 'uploading',
      progress: 0,
      error: null,
    }))

    try {
      // ============================================
      // STEP 1: Upload file to storage
      // ============================================
      const formData = new FormData()
      formData.append('file', uploadState.file)

      setUploadState((prev) => ({
        ...prev,
        processingStep: 'upload',
        processingMessage: 'Uploading file...',
        progress: 10,
      }))

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      const uploadData = await uploadResponse.json()
      const documentId = uploadData.document.id

      setUploadState((prev) => ({
        ...prev,
        documentId,
        compressionInfo: uploadData.uploadMetadata,
        progress: 20,
      }))

      // ============================================
      // STEP 2: Process document (OCR + AI + Matching)
      // ============================================
      setUploadState((prev) => ({
        ...prev,
        status: 'processing',
        processingStep: 'processing',
        processingMessage: 'Starting document processing...',
        progress: 25,
      }))

      // Call streaming endpoint
      const processResponse = await fetch(`/api/documents/${documentId}/process-complete`, {
        method: 'POST',
      })

      if (!processResponse.ok) {
        throw new Error('Processing failed')
      }

      // Read streaming response
      const reader = processResponse.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream')
      }

      let extractedData: any = {}
      let matchCount = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((line) => line.trim())

        for (const line of lines) {
          try {
            const update = JSON.parse(line)

            if (update.error) {
              throw new Error(update.error)
            }

            // Update progress based on step
            let progress = 25
            if (update.step === 'ocr') progress = 40
            else if (update.step === 'ai_extraction') progress = 60
            else if (update.step === 'matching') progress = 80
            else if (update.step === 'vendor_enrichment') progress = 90
            else if (update.step === 'completed') progress = 100

            setUploadState((prev) => ({
              ...prev,
              processingStep: update.step,
              processingMessage: update.message || '',
              progress,
            }))

            // Capture extracted data
            if (update.data) {
              extractedData = update.data
            }

            // Capture match count
            if (update.matchCount !== undefined) {
              matchCount = update.matchCount
            }
          } catch (e) {
            // Ignore JSON parse errors (partial chunks)
          }
        }
      }

      // Success state
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        status: 'success',
        progress: 100,
        extractedData,
        matchCount,
        processingMessage: 'Document processed successfully!',
      }))

      // Redirect to documents list after 2 seconds
      setTimeout(() => {
        router.push('/documents')
      }, 2000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      }))
    }
  }

  // Handle retry upload
  const handleRetry = () => {
    handleUpload()
  }

  // Handle cancel upload
  const handleCancel = () => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      status: 'idle',
      error: null,
    })
  }

  // Handle going back to documents list
  const handleGoBack = () => {
    router.push('/documents')
  }

  const canUpload = uploadState.file && !uploadState.uploading && uploadState.status !== 'success'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              aria-label="Go back"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Upload Document
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Upload receipts, invoices, or email attachments for processing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* File upload area */}
          {!uploadState.file && (
            <FileUpload
              onFileSelect={handleFileSelect}
              onError={handleValidationError}
              disabled={uploadState.uploading}
            />
          )}

          {/* Upload progress */}
          {uploadState.file && (
            <div className="space-y-4">
              <UploadProgress
                file={uploadState.file}
                progress={uploadState.progress}
                status={uploadState.status}
                error={uploadState.error || undefined}
                compressionInfo={uploadState.compressionInfo}
                processingStep={uploadState.processingStep}
                processingMessage={uploadState.processingMessage}
                extractedData={uploadState.extractedData}
                matchCount={uploadState.matchCount}
                onCancel={uploadState.status === 'uploading' ? handleCancel : undefined}
                onRetry={uploadState.status === 'error' ? handleRetry : undefined}
              />

              {/* Upload button (shown when file selected but not uploaded) */}
              {canUpload && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Upload Document
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info cards */}
          {!uploadState.file && (
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              {/* Supported formats */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                    <svg
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
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
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Supported Formats
                  </h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  PDF, JPEG, PNG, and EML files up to 10MB
                </p>
              </div>

              {/* Auto processing */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded bg-green-100 dark:bg-green-900/30">
                    <svg
                      className="w-4 h-4 text-green-600 dark:text-green-400"
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
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Auto Processing
                  </h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatic OCR and data extraction
                </p>
              </div>

              {/* Smart matching */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded bg-purple-100 dark:bg-purple-900/30">
                    <svg
                      className="w-4 h-4 text-purple-600 dark:text-purple-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Smart Matching
                  </h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatic transaction matching
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
