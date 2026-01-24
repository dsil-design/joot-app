'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  uploadStatementFile,
  type UploadProgress,
  type UploadResult,
} from '@/lib/supabase/storage'
import { validateFile } from '@/lib/utils/file-validation'
import type { UploadState } from '@/components/page-specific/statement-upload-zone'

// ============================================================================
// Types
// ============================================================================

export interface StatementUploadState {
  /** Current upload state */
  state: UploadState
  /** Upload progress percentage (0-100) */
  progress: number
  /** Error message if upload failed */
  error: string | null
  /** Successfully uploaded file info */
  uploadedFile: {
    name: string
    size: number
    path: string
  } | null
}

export interface UseStatementUploadResult {
  /** Current upload state and progress */
  uploadState: StatementUploadState
  /** Start uploading a file */
  uploadFile: (file: File, uploadId: string) => Promise<UploadResult>
  /** Reset the upload state back to idle */
  reset: () => void
  /** Whether an upload is currently in progress */
  isUploading: boolean
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: StatementUploadState = {
  state: 'idle',
  progress: 0,
  error: null,
  uploadedFile: null,
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing statement file uploads to Supabase Storage
 *
 * Provides:
 * - uploadFile: async function to upload a file with progress tracking
 * - uploadState: current state including progress and error
 * - reset: function to reset state back to idle
 * - isUploading: boolean for easy loading checks
 *
 * @example
 * ```tsx
 * const { uploadState, uploadFile, reset, isUploading } = useStatementUpload()
 *
 * const handleFileAccepted = async (file: File) => {
 *   const uploadId = crypto.randomUUID()
 *   const result = await uploadFile(file, uploadId)
 *
 *   if (result.success) {
 *     // Continue to next step (e.g., call API to create statement record)
 *   }
 * }
 *
 * return (
 *   <StatementUploadZone
 *     onFileAccepted={handleFileAccepted}
 *     uploadState={uploadState.state}
 *     uploadProgress={uploadState.progress}
 *     errorMessage={uploadState.error ?? undefined}
 *     successFileName={uploadState.uploadedFile?.name}
 *     successFileSize={uploadState.uploadedFile?.size}
 *     onReset={reset}
 *   />
 * )
 * ```
 */
export function useStatementUpload(): UseStatementUploadResult {
  const [uploadState, setUploadState] = useState<StatementUploadState>(initialState)
  const abortRef = useRef(false)

  const reset = useCallback(() => {
    abortRef.current = true
    setUploadState(initialState)
  }, [])

  const uploadFile = useCallback(async (file: File, uploadId: string): Promise<UploadResult> => {
    // Reset abort flag
    abortRef.current = false

    // Validate file before starting upload
    const validation = validateFile(file)
    if (!validation.valid) {
      const error = validation.error?.message ?? 'File validation failed'
      setUploadState({
        state: 'error',
        progress: 0,
        error,
        uploadedFile: null,
      })
      return { success: false, error }
    }

    // Get Supabase client and user
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      const error = 'Not authenticated. Please sign in to upload files.'
      setUploadState({
        state: 'error',
        progress: 0,
        error,
        uploadedFile: null,
      })
      return { success: false, error }
    }

    // Start upload
    setUploadState({
      state: 'uploading',
      progress: 0,
      error: null,
      uploadedFile: null,
    })

    // Progress callback
    const onProgress = (progress: UploadProgress) => {
      // Check if upload was aborted
      if (abortRef.current) return

      setUploadState((prev) => ({
        ...prev,
        progress: progress.percentage,
      }))
    }

    // Perform upload
    const result = await uploadStatementFile(
      supabase,
      file,
      user.id,
      uploadId,
      onProgress
    )

    // Check if upload was aborted
    if (abortRef.current) {
      return { success: false, error: 'Upload cancelled' }
    }

    if (result.success) {
      setUploadState({
        state: 'success',
        progress: 100,
        error: null,
        uploadedFile: {
          name: file.name,
          size: file.size,
          path: result.path!,
        },
      })
    } else {
      setUploadState({
        state: 'error',
        progress: 0,
        error: result.error ?? 'Upload failed',
        uploadedFile: null,
      })
    }

    return result
  }, [])

  return {
    uploadState,
    uploadFile,
    reset,
    isUploading: uploadState.state === 'uploading',
  }
}

export default useStatementUpload
