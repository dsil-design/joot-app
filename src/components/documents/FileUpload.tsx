'use client'

/**
 * FileUpload Component
 *
 * Drag-and-drop file upload component with validation and preview
 * Supports PDF, JPEG, PNG, and EML files up to 10MB
 */

import React, { useState, useCallback, useRef } from 'react'
import {
  validateFile,
  formatFileSize,
  getFileTypeLabel,
  getAcceptedExtensions,
  isImageFile,
  type FileValidationResult,
} from '@/lib/utils/file-validation'

export interface FileUploadProps {
  onFileSelect: (file: File) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

export function FileUpload({
  onFileSelect,
  onError,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection (from input or drop)
  const handleFile = useCallback(
    (file: File) => {
      // Validate file
      const validation: FileValidationResult = validateFile(file)

      if (!validation.valid) {
        const errorMessage = validation.error?.message || 'Invalid file'
        setValidationError(errorMessage)
        if (onError) {
          onError(errorMessage)
        }
        setSelectedFile(null)
        setPreviewUrl(null)
        return
      }

      // Clear any previous errors
      setValidationError(null)

      // Set selected file
      setSelectedFile(file)

      // Generate preview for images
      if (isImageFile(file.type)) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }

      // Notify parent
      onFileSelect(file)
    },
    [onFileSelect, onError]
  )

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [disabled, handleFile]
  )

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  // Handle clear/remove file
  const handleClear = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setValidationError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedExtensions()}
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
        aria-label="File upload input"
      />

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative
          rounded-lg
          border-2
          border-dashed
          transition-all
          duration-200
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-gray-300 dark:border-gray-700'
          }
          ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }
          ${validationError ? 'border-red-500' : ''}
        `}
      >
        {/* Content */}
        <div className="p-8 text-center">
          {selectedFile ? (
            // File selected state
            <div className="space-y-4">
              {/* Preview (for images) */}
              {previewUrl && (
                <div className="mx-auto w-32 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* File icon (for non-images) */}
              {!previewUrl && (
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
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
              )}

              {/* File info */}
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {selectedFile.name}
                </p>
                <div className="mt-1 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                    {getFileTypeLabel(selectedFile.type)}
                  </span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
              </div>

              {/* Clear button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Remove file
                </button>
              )}
            </div>
          ) : (
            // Empty state
            <div className="space-y-2">
              {/* Upload icon */}
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg
                  className="w-6 h-6 text-gray-600 dark:text-gray-400"
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
              </div>

              {/* Instructions */}
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  PDF, JPEG, PNG, or EML up to 10MB
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="mt-2 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{validationError}</span>
        </div>
      )}
    </div>
  )
}
