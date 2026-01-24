/**
 * Supabase Storage utilities for statement file uploads
 *
 * This module provides functions for uploading files to the `statement-uploads` bucket
 * with progress tracking support.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'
import { getFileExtension } from '@/lib/utils/file-validation'

// ============================================================================
// Constants
// ============================================================================

/** The name of the storage bucket for statement uploads */
export const STATEMENT_UPLOADS_BUCKET = 'statement-uploads'

// ============================================================================
// Types
// ============================================================================

export interface UploadProgress {
  /** Percentage of upload completed (0-100) */
  percentage: number
  /** Bytes uploaded so far */
  bytesUploaded: number
  /** Total bytes to upload */
  totalBytes: number
}

export interface UploadResult {
  /** Whether the upload was successful */
  success: boolean
  /** The storage path of the uploaded file (on success) */
  path?: string
  /** Error message (on failure) */
  error?: string
  /** File metadata */
  metadata?: {
    /** Original filename */
    originalName: string
    /** File size in bytes */
    size: number
    /** MIME type */
    mimeType: string
  }
}

export type UploadProgressCallback = (progress: UploadProgress) => void

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate the storage path for a statement upload
 *
 * Path format: {user_id}/{upload_id}.{ext}
 *
 * @param userId - The user's UUID
 * @param uploadId - The upload's UUID
 * @param filename - The original filename (used to extract extension)
 * @returns The storage path
 */
export function getStatementUploadPath(
  userId: string,
  uploadId: string,
  filename: string
): string {
  const extension = getFileExtension(filename).replace('.', '') || 'pdf'
  return `${userId}/${uploadId}.${extension}`
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a statement file to Supabase Storage
 *
 * This function uploads a file to the `statement-uploads` bucket with progress
 * tracking. The file is stored at `{user_id}/{upload_id}.{ext}`.
 *
 * @param supabase - Supabase client instance
 * @param file - The file to upload
 * @param userId - The user's UUID (for path generation)
 * @param uploadId - The upload's UUID (for path generation)
 * @param onProgress - Optional callback for progress updates
 * @returns Upload result with path and metadata on success, error on failure
 *
 * @example
 * ```ts
 * const result = await uploadStatementFile(
 *   supabase,
 *   file,
 *   userId,
 *   uploadId,
 *   (progress) => setUploadProgress(progress.percentage)
 * )
 *
 * if (result.success) {
 *   console.log('Uploaded to:', result.path)
 * } else {
 *   console.error('Upload failed:', result.error)
 * }
 * ```
 */
export async function uploadStatementFile(
  supabase: SupabaseClient<Database>,
  file: File,
  userId: string,
  uploadId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const path = getStatementUploadPath(userId, uploadId, file.name)

  try {
    // Use XMLHttpRequest for progress tracking since Supabase JS v2
    // doesn't natively support upload progress
    const result = await uploadWithProgress(
      supabase,
      STATEMENT_UPLOADS_BUCKET,
      path,
      file,
      onProgress
    )

    if (result.error) {
      return {
        success: false,
        error: result.error,
      }
    }

    return {
      success: true,
      path,
      metadata: {
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      },
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown upload error'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Upload a file with progress tracking using XMLHttpRequest
 *
 * This is necessary because the Supabase JS client doesn't provide native
 * upload progress tracking. We construct the upload URL and headers manually.
 */
async function uploadWithProgress(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ error: string | null }> {
  return new Promise((resolve) => {
    // Get the Supabase URL and session for authenticated upload
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      resolve({ error: 'Supabase URL not configured' })
      return
    }

    // Get the current session token
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError || !session) {
        resolve({ error: 'Not authenticated. Please sign in to upload files.' })
        return
      }

      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentage = Math.round((event.loaded / event.total) * 100)
          onProgress({
            percentage,
            bytesUploaded: event.loaded,
            totalBytes: event.total,
          })
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Ensure progress shows 100% on success
          if (onProgress) {
            onProgress({
              percentage: 100,
              bytesUploaded: file.size,
              totalBytes: file.size,
            })
          }
          resolve({ error: null })
        } else {
          // Try to parse error from response
          let errorMessage = `Upload failed with status ${xhr.status}`
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.error || response.message) {
              errorMessage = response.error || response.message
            }
          } catch {
            // Use default error message
          }
          resolve({ error: errorMessage })
        }
      })

      // Handle network errors
      xhr.addEventListener('error', () => {
        resolve({ error: 'Network error during upload. Please check your connection and try again.' })
      })

      // Handle abort
      xhr.addEventListener('abort', () => {
        resolve({ error: 'Upload was cancelled.' })
      })

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        resolve({ error: 'Upload timed out. Please try again.' })
      })

      // Configure and send request
      xhr.open('POST', uploadUrl)
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.setRequestHeader('x-upsert', 'true') // Allow overwriting existing file
      xhr.timeout = 300000 // 5 minute timeout

      // Send the file
      xhr.send(file)
    })
  })
}

/**
 * Delete a statement file from Supabase Storage
 *
 * @param supabase - Supabase client instance
 * @param path - The storage path of the file to delete
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteStatementFile(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<boolean> {
  const { error } = await supabase.storage
    .from(STATEMENT_UPLOADS_BUCKET)
    .remove([path])

  if (error) {
    console.error('Failed to delete statement file:', error.message)
    return false
  }

  return true
}

/**
 * Get a signed URL for downloading a statement file
 *
 * @param supabase - Supabase client instance
 * @param path - The storage path of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if failed
 */
export async function getStatementFileUrl(
  supabase: SupabaseClient<Database>,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STATEMENT_UPLOADS_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error('Failed to create signed URL:', error.message)
    return null
  }

  return data.signedUrl
}
