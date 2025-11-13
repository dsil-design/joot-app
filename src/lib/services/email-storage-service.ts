/**
 * Email Storage Service
 *
 * Handles storing email files (.eml) and attachments in Supabase Storage
 * Provides efficient storage with deduplication and retrieval
 */

import { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export interface StoreEmailOptions {
  userId: string
  emailAccountId: string
  messageUid: string
  emlContent: Buffer
  supabaseClient: SupabaseClient
}

export interface StoreEmailResult {
  success: boolean
  storagePath?: string
  emailHash?: string
  error?: string
}

export interface RetrieveEmailOptions {
  userId: string
  storagePath: string
  supabaseClient: SupabaseClient
}

export interface RetrieveEmailResult {
  success: boolean
  content?: Buffer
  error?: string
}

/**
 * Calculate SHA-256 hash of email content for deduplication
 *
 * @param content - Email content buffer
 * @returns Hex-encoded hash string
 */
export function calculateEmailHash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Store an email (.eml file) in Supabase Storage
 *
 * @param options - Storage options
 * @returns Storage result with path and hash
 *
 * @example
 * const result = await storeEmail({
 *   userId: user.id,
 *   emailAccountId: account.id,
 *   messageUid: '12345',
 *   emlContent: emailBuffer,
 *   supabaseClient: supabase
 * })
 */
export async function storeEmail(
  options: StoreEmailOptions
): Promise<StoreEmailResult> {
  const { userId, emailAccountId, messageUid, emlContent, supabaseClient } = options

  try {
    // Calculate email hash for deduplication
    const emailHash = calculateEmailHash(emlContent)

    // Generate storage path: {userId}/{emailAccountId}/{messageUid}.eml
    const storagePath = `${userId}/${emailAccountId}/${messageUid}.eml`

    // Upload to email-receipts bucket
    const { error: uploadError } = await supabaseClient.storage
      .from('email-receipts')
      .upload(storagePath, emlContent, {
        contentType: 'message/rfc822',
        upsert: false // Don't overwrite if exists
      })

    if (uploadError) {
      // Check if file already exists (not necessarily an error)
      if (uploadError.message.includes('already exists')) {
        return {
          success: true,
          storagePath,
          emailHash
        }
      }

      return {
        success: false,
        error: `Storage upload failed: ${uploadError.message}`
      }
    }

    return {
      success: true,
      storagePath,
      emailHash
    }
  } catch (error) {
    return {
      success: false,
      error: `Storage error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Retrieve an email from Supabase Storage
 *
 * @param options - Retrieval options
 * @returns Email content buffer
 *
 * @example
 * const result = await retrieveEmail({
 *   userId: user.id,
 *   storagePath: 'user-id/account-id/12345.eml',
 *   supabaseClient: supabase
 * })
 */
export async function retrieveEmail(
  options: RetrieveEmailOptions
): Promise<RetrieveEmailResult> {
  const { userId, storagePath, supabaseClient } = options

  try {
    // Verify the path belongs to this user (security check)
    if (!storagePath.startsWith(userId)) {
      return {
        success: false,
        error: 'Unauthorized: Cannot access email from different user'
      }
    }

    // Download from email-receipts bucket
    const { data, error } = await supabaseClient.storage
      .from('email-receipts')
      .download(storagePath)

    if (error) {
      return {
        success: false,
        error: `Download failed: ${error.message}`
      }
    }

    if (!data) {
      return {
        success: false,
        error: 'No data returned from storage'
      }
    }

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return {
      success: true,
      content: buffer
    }
  } catch (error) {
    return {
      success: false,
      error: `Retrieval error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Delete an email from Supabase Storage
 *
 * @param options - Deletion options
 * @returns Success status
 */
export async function deleteEmail(options: {
  userId: string
  storagePath: string
  supabaseClient: SupabaseClient
}): Promise<{ success: boolean; error?: string }> {
  const { userId, storagePath, supabaseClient } = options

  try {
    // Verify the path belongs to this user (security check)
    if (!storagePath.startsWith(userId)) {
      return {
        success: false,
        error: 'Unauthorized: Cannot delete email from different user'
      }
    }

    // Delete from email-receipts bucket
    const { error } = await supabaseClient.storage
      .from('email-receipts')
      .remove([storagePath])

    if (error) {
      return {
        success: false,
        error: `Deletion failed: ${error.message}`
      }
    }

    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: `Deletion error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Check if an email exists in storage
 *
 * @param options - Check options
 * @returns Existence status
 */
export async function emailExists(options: {
  userId: string
  storagePath: string
  supabaseClient: SupabaseClient
}): Promise<{ exists: boolean; error?: string }> {
  const { userId, storagePath, supabaseClient } = options

  try {
    // Verify the path belongs to this user (security check)
    if (!storagePath.startsWith(userId)) {
      return {
        exists: false,
        error: 'Unauthorized: Cannot check email from different user'
      }
    }

    // Try to get file metadata (faster than downloading)
    const { data, error } = await supabaseClient.storage
      .from('email-receipts')
      .list(userId, {
        limit: 1,
        search: storagePath.split('/').pop() // Get filename
      })

    if (error) {
      return {
        exists: false,
        error: `Check failed: ${error.message}`
      }
    }

    return {
      exists: data.length > 0
    }
  } catch (error) {
    return {
      exists: false,
      error: `Check error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Get storage statistics for a user
 *
 * @param options - Stats options
 * @returns Storage statistics
 */
export async function getStorageStats(options: {
  userId: string
  supabaseClient: SupabaseClient
}): Promise<{
  success: boolean
  stats?: {
    totalFiles: number
    totalSize: number
  }
  error?: string
}> {
  const { userId, supabaseClient } = options

  try {
    // List all files for this user
    const { data, error } = await supabaseClient.storage
      .from('email-receipts')
      .list(userId, {
        limit: 1000 // Adjust as needed
      })

    if (error) {
      return {
        success: false,
        error: `Stats failed: ${error.message}`
      }
    }

    if (!data) {
      return {
        success: true,
        stats: {
          totalFiles: 0,
          totalSize: 0
        }
      }
    }

    const stats = {
      totalFiles: data.length,
      totalSize: data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
    }

    return {
      success: true,
      stats
    }
  } catch (error) {
    return {
      success: false,
      error: `Stats error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
