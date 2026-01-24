import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Types for duplicate detection results
 */
export type DuplicateType = 'file_hash' | 'period_overlap'

export interface DuplicateMatch {
  type: DuplicateType
  existingUpload: {
    id: string
    filename: string
    uploaded_at: string
    statement_period_start: string | null
    statement_period_end: string | null
    status: string
    transactions_extracted: number
    transactions_matched: number
  }
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean
  duplicates: DuplicateMatch[]
  canProceed: boolean // true if user can force upload anyway
}

/**
 * Calculates SHA256 hash of file contents
 * Works in both browser and Node.js environments
 */
export async function calculateFileHash(file: File | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer

  if (file instanceof File) {
    buffer = await file.arrayBuffer()
  } else {
    buffer = file
  }

  // Use Web Crypto API (available in both browser and Node 18+)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Checks for duplicate statement uploads
 *
 * @param supabase - Supabase client
 * @param userId - User ID to check against
 * @param fileHash - SHA256 hash of the file
 * @param paymentMethodId - Payment method ID (optional, for period overlap check)
 * @param periodStart - Statement period start date (optional)
 * @param periodEnd - Statement period end date (optional)
 * @returns DuplicateCheckResult with duplicate info
 */
export async function checkForDuplicates(
  supabase: SupabaseClient,
  userId: string,
  fileHash: string,
  paymentMethodId?: string,
  periodStart?: string,
  periodEnd?: string
): Promise<DuplicateCheckResult> {
  const duplicates: DuplicateMatch[] = []

  // Check 1: Exact file hash match (same file uploaded before)
  const { data: hashMatch, error: hashError } = await supabase
    .from('statement_uploads')
    .select(
      `
      id,
      filename,
      uploaded_at,
      statement_period_start,
      statement_period_end,
      status,
      transactions_extracted,
      transactions_matched
    `
    )
    .eq('user_id', userId)
    .eq('file_hash', fileHash)
    .limit(1)
    .single()

  if (!hashError && hashMatch) {
    duplicates.push({
      type: 'file_hash',
      existingUpload: {
        id: hashMatch.id,
        filename: hashMatch.filename,
        uploaded_at: hashMatch.uploaded_at,
        statement_period_start: hashMatch.statement_period_start,
        statement_period_end: hashMatch.statement_period_end,
        status: hashMatch.status,
        transactions_extracted: hashMatch.transactions_extracted ?? 0,
        transactions_matched: hashMatch.transactions_matched ?? 0,
      },
    })
  }

  // Check 2: Same payment method + overlapping period
  // Only check if we have payment method and period info
  if (paymentMethodId && periodStart && periodEnd) {
    // Find uploads for the same payment method with overlapping periods
    // Overlap occurs when: existingStart <= newEnd AND existingEnd >= newStart
    const { data: periodMatches, error: periodError } = await supabase
      .from('statement_uploads')
      .select(
        `
        id,
        filename,
        uploaded_at,
        statement_period_start,
        statement_period_end,
        status,
        transactions_extracted,
        transactions_matched
      `
      )
      .eq('user_id', userId)
      .eq('payment_method_id', paymentMethodId)
      .not('statement_period_start', 'is', null)
      .not('statement_period_end', 'is', null)
      .lte('statement_period_start', periodEnd)
      .gte('statement_period_end', periodStart)
      .neq('file_hash', fileHash) // Exclude the exact same file (already caught above)

    if (!periodError && periodMatches && periodMatches.length > 0) {
      for (const match of periodMatches) {
        // Skip if already in duplicates list (same upload ID)
        if (duplicates.some((d) => d.existingUpload.id === match.id)) {
          continue
        }

        duplicates.push({
          type: 'period_overlap',
          existingUpload: {
            id: match.id,
            filename: match.filename,
            uploaded_at: match.uploaded_at,
            statement_period_start: match.statement_period_start,
            statement_period_end: match.statement_period_end,
            status: match.status,
            transactions_extracted: match.transactions_extracted ?? 0,
            transactions_matched: match.transactions_matched ?? 0,
          },
        })
      }
    }
  }

  // Determine if user can proceed
  // - File hash duplicates: can proceed with force flag (for re-processing)
  // - Period overlap: can proceed (different file for same period is valid)
  const hasFileHashDuplicate = duplicates.some((d) => d.type === 'file_hash')
  const canProceed = !hasFileHashDuplicate || duplicates.length === 0

  return {
    hasDuplicate: duplicates.length > 0,
    duplicates,
    canProceed,
  }
}

/**
 * Returns a user-friendly message for duplicate detection results
 */
export function getDuplicateMessage(result: DuplicateCheckResult): string | null {
  if (!result.hasDuplicate) {
    return null
  }

  const fileHashDup = result.duplicates.find((d) => d.type === 'file_hash')
  if (fileHashDup) {
    return `This file has already been uploaded on ${formatDate(fileHashDup.existingUpload.uploaded_at)}`
  }

  const periodDup = result.duplicates.find((d) => d.type === 'period_overlap')
  if (periodDup) {
    const start = periodDup.existingUpload.statement_period_start
    const end = periodDup.existingUpload.statement_period_end
    return `You already uploaded a statement for this period (${formatDate(start)} - ${formatDate(end)})`
  }

  return 'A similar statement already exists'
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown date'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
