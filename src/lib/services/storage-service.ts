/**
 * Storage Service
 *
 * Handles file uploads/downloads to Supabase Storage
 * Integrates with image compression utilities
 */

import { createClient } from '@/lib/supabase/client'
import { compressImage, generateThumbnail, getImageMetadata } from '@/lib/utils/image-compression'

export interface UploadDocumentOptions {
  file: File
  userId: string
  documentId: string
  compress?: boolean // Default true for images
}

export interface UploadResult {
  success: boolean
  storagePath?: string
  thumbnailPath?: string
  error?: string
  metadata?: {
    originalSize: number
    compressedSize: number
    percentSaved: number
  }
}

/**
 * Upload a document to Supabase Storage
 *
 * Automatically:
 * - Compresses images
 * - Generates thumbnails
 * - Stores in user-specific folder
 *
 * @param options - Upload options
 * @returns Upload result with storage paths
 *
 * @example
 * const result = await uploadDocument({
 *   file: selectedFile,
 *   userId: user.id,
 *   documentId: newDocId,
 *   compress: true
 * })
 */
export async function uploadDocument(
  options: UploadDocumentOptions
): Promise<UploadResult> {
  const { file, userId, documentId, compress = true } = options
  const supabase = createClient()

  try {
    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    let fileBuffer = Buffer.from(arrayBuffer)
    const originalSize = file.size
    let compressedSize = file.size

    // Get file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'

    // Compress if it's an image and compression is enabled
    const isImage = file.type.startsWith('image/')
    if (isImage && compress) {
      try {
        fileBuffer = await compressImage(fileBuffer, {
          quality: 80,
          maxWidth: 1200,
          maxHeight: 1200,
          format: fileExt === 'png' ? 'png' : 'jpeg'
        })
        compressedSize = fileBuffer.length
      } catch (error) {
        console.warn('Image compression failed, using original:', error)
      }
    }

    // Generate storage path: {userId}/{documentId}.{ext}
    const storagePath = `${userId}/${documentId}.${fileExt}`

    // Upload main file to documents bucket
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      }
    }

    // Generate and upload thumbnail for images
    let thumbnailPath: string | undefined

    if (isImage) {
      try {
        const thumbnailBuffer = await generateThumbnail(fileBuffer, {
          width: 200,
          height: 200,
          fit: 'cover',
          quality: 60
        })

        const thumbnailStoragePath = `${userId}/${documentId}.jpg`

        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailStoragePath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          })

        if (!thumbError) {
          thumbnailPath = thumbnailStoragePath
        }
      } catch (error) {
        console.warn('Thumbnail generation failed:', error)
        // Non-fatal error, continue
      }
    }

    return {
      success: true,
      storagePath,
      thumbnailPath,
      metadata: {
        originalSize,
        compressedSize,
        percentSaved: Math.round(((originalSize - compressedSize) / originalSize) * 100)
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get signed URL for a private document
 *
 * @param storagePath - Path to document in storage
 * @param expiresIn - Expiry time in seconds (default 3600 = 1 hour)
 * @returns Signed URL or null if error
 */
export async function getDocumentUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, expiresIn)

  if (error) {
    console.error('Error creating signed URL:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Get public URL for a thumbnail
 *
 * @param thumbnailPath - Path to thumbnail in storage
 * @returns Public URL
 */
export function getThumbnailUrl(thumbnailPath: string): string {
  const supabase = createClient()

  const { data } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(thumbnailPath)

  return data.publicUrl
}

/**
 * Get public URL for a vendor logo
 *
 * @param logoPath - Path to logo in storage
 * @returns Public URL
 */
export function getVendorLogoUrl(logoPath: string): string {
  const supabase = createClient()

  const { data } = supabase.storage
    .from('vendor-logos')
    .getPublicUrl(logoPath)

  return data.publicUrl
}

/**
 * Delete a document and its thumbnail
 *
 * @param storagePath - Path to document
 * @param thumbnailPath - Path to thumbnail (optional)
 * @returns Success status
 */
export async function deleteDocument(
  storagePath: string,
  thumbnailPath?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Delete main document
  const { error: docError } = await supabase.storage
    .from('documents')
    .remove([storagePath])

  if (docError) {
    return {
      success: false,
      error: `Failed to delete document: ${docError.message}`
    }
  }

  // Delete thumbnail if exists
  if (thumbnailPath) {
    await supabase.storage
      .from('thumbnails')
      .remove([thumbnailPath])
    // Don't fail if thumbnail deletion fails
  }

  return { success: true }
}

/**
 * Upload a vendor logo
 *
 * @param file - Logo file
 * @param vendorId - Vendor ID
 * @returns Upload result
 */
export async function uploadVendorLogo(
  file: File,
  vendorId: string
): Promise<UploadResult> {
  const supabase = createClient()

  try {
    const arrayBuffer = await file.arrayBuffer()
    let logoBuffer = Buffer.from(arrayBuffer)

    // Compress logo (vendor logos should be small)
    if (file.type.startsWith('image/')) {
      try {
        logoBuffer = await compressImage(logoBuffer, {
          quality: 85,
          maxWidth: 256,
          maxHeight: 256,
          format: 'png'
        })
      } catch (error) {
        console.warn('Logo compression failed, using original:', error)
      }
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const storagePath = `vendors/${vendorId}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('vendor-logos')
      .upload(storagePath, logoBuffer, {
        contentType: file.type,
        upsert: true // Allow overwriting
      })

    if (uploadError) {
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      }
    }

    return {
      success: true,
      storagePath
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get storage usage statistics for a user
 *
 * @param userId - User ID
 * @returns Storage usage info
 */
export async function getStorageUsage(userId: string) {
  const supabase = createClient()

  // List all files in user's folder
  const { data: files, error } = await supabase.storage
    .from('documents')
    .list(userId)

  if (error) {
    return { totalBytes: 0, fileCount: 0, error: error.message }
  }

  const totalBytes = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
  const fileCount = files?.length || 0

  return {
    totalBytes,
    fileCount,
    totalMB: Math.round((totalBytes / (1024 * 1024)) * 100) / 100
  }
}
