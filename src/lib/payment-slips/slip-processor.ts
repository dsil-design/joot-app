/**
 * Payment Slip Processor
 *
 * Processes uploaded payment slip images end-to-end:
 * 1. Downloads image from Supabase Storage
 * 2. Sends to Claude Vision API for extraction
 * 3. Validates extracted data
 * 4. Detects payment direction (income/expense)
 * 5. Matches against existing transactions
 * 6. Saves results to database
 */

import { createClient } from '@supabase/supabase-js'
import { extractFromPaymentSlip } from './vision-extractor'
import { validateExtraction } from './extraction-validator'
import { detectDirection } from './direction-detector'
import type { PaymentSlipExtraction, SlipProcessingResult } from './types'

type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'

/**
 * Map file extension / MIME type to Claude Vision-compatible media type.
 */
function resolveMediaType(fileType: string | null, filePath: string): ImageMediaType {
  const type = fileType?.toLowerCase()
  if (type === 'image/png') return 'image/png'
  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg'
  if (type === 'image/webp') return 'image/webp'
  if (type === 'image/heic') return 'image/jpeg' // HEIC gets converted by Supabase transform

  // Fallback to extension
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'

  return 'image/jpeg' // default
}

/**
 * Process a single payment slip upload.
 */
export async function processPaymentSlip(uploadId: string): Promise<SlipProcessingResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase environment variables not configured')
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Fetch the upload record
  const { data: upload, error: fetchError } = await supabase
    .from('payment_slip_uploads')
    .select('*')
    .eq('id', uploadId)
    .single()

  if (fetchError || !upload) {
    throw new Error(`Payment slip upload not found: ${uploadId}`)
  }

  // Update status to processing
  await supabase
    .from('payment_slip_uploads')
    .update({
      status: 'processing',
      extraction_started_at: new Date().toISOString(),
      extraction_error: null,
    })
    .eq('id', uploadId)

  try {
    // 1. Download image from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('statement-uploads')
      .download(upload.file_path)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download image: ${downloadError?.message}`)
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mediaType = resolveMediaType(upload.file_type, upload.file_path)

    // 2. Extract data via Claude Vision
    const visionResult = await extractFromPaymentSlip(base64, mediaType)
    const extraction = visionResult.extraction

    // 3. Validate extraction
    const validation = validateExtraction(extraction)

    if (!validation.isValid) {
      const errorMsg = `Extraction validation failed: ${validation.errors.join(', ')}`
      await updateFailed(supabase, uploadId, errorMsg, visionResult)
      return {
        success: false,
        extraction,
        confidence: validation.confidence,
        direction: null,
        matchedTransactionId: null,
        matchConfidence: null,
        error: errorMsg,
        tokenUsage: { promptTokens: visionResult.promptTokens, responseTokens: visionResult.responseTokens },
        durationMs: visionResult.durationMs,
      }
    }

    // 4. Detect direction
    const directionResult = await detectDirection(supabase, upload.user_id, extraction)

    // 5. Match against existing transactions
    const matchResult = await findMatchingTransaction(supabase, upload.user_id, extraction)

    // 6. Save results
    await supabase
      .from('payment_slip_uploads')
      .update({
        status: 'ready_for_review',
        extraction_completed_at: new Date().toISOString(),
        extraction_data: extraction as unknown as Record<string, unknown>,
        extraction_confidence: validation.confidence,
        extraction_log: {
          warnings: validation.warnings,
          direction_detection: {
            result: directionResult.direction,
            confidence: directionResult.confidence,
            matchedAccountId: directionResult.matchedAccount?.id ?? null,
            paymentMethodId: directionResult.paymentMethodId ?? null,
          },
        } as unknown as Record<string, unknown>,
        payment_method_id: directionResult.paymentMethodId,
        // Flattened fields
        transaction_date: extraction.date,
        transaction_time: extraction.time,
        amount: extraction.amount,
        fee: extraction.fee,
        currency: extraction.currency,
        sender_name: extraction.sender_name,
        sender_bank: extraction.sender_bank,
        sender_account: extraction.sender_account,
        recipient_name: extraction.recipient_name,
        recipient_bank: extraction.recipient_bank,
        recipient_account: extraction.recipient_account,
        transaction_reference: extraction.transaction_reference,
        bank_reference: extraction.bank_reference,
        memo: extraction.memo,
        bank_detected: extraction.bank_detected,
        transfer_type: extraction.transfer_type,
        detected_direction: directionResult.direction,
        matched_transaction_id: matchResult.transactionId,
        match_confidence: matchResult.confidence,
        ai_prompt_tokens: visionResult.promptTokens,
        ai_response_tokens: visionResult.responseTokens,
        ai_duration_ms: visionResult.durationMs,
      })
      .eq('id', uploadId)

    // Log activity
    await supabase
      .from('import_activities')
      .insert({
        user_id: upload.user_id,
        activity_type: 'slip_processed',
        payment_slip_upload_id: uploadId,
        description: `Processed payment slip: ${extraction.amount} THB from ${extraction.sender_name || 'unknown'}`,
        transactions_affected: matchResult.transactionId ? 1 : 0,
        total_amount: extraction.amount,
        currency: 'THB',
      })

    return {
      success: true,
      extraction,
      confidence: validation.confidence,
      direction: directionResult.direction,
      matchedTransactionId: matchResult.transactionId,
      matchConfidence: matchResult.confidence,
      error: null,
      tokenUsage: { promptTokens: visionResult.promptTokens, responseTokens: visionResult.responseTokens },
      durationMs: visionResult.durationMs,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown processing error'
    await updateFailed(supabase, uploadId, errorMsg)
    throw error
  }
}

async function updateFailed(
  supabase: ReturnType<typeof createClient>,
  uploadId: string,
  error: string,
  visionResult?: { promptTokens: number; responseTokens: number; durationMs: number }
) {
  await supabase
    .from('payment_slip_uploads')
    .update({
      status: 'failed',
      extraction_completed_at: new Date().toISOString(),
      extraction_error: error,
      ...(visionResult && {
        ai_prompt_tokens: visionResult.promptTokens,
        ai_response_tokens: visionResult.responseTokens,
        ai_duration_ms: visionResult.durationMs,
      }),
    })
    .eq('id', uploadId)
}

/**
 * Find an existing transaction that matches this payment slip.
 * Simple matching by amount + date (±1 day).
 */
async function findMatchingTransaction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  extraction: PaymentSlipExtraction
): Promise<{ transactionId: string | null; confidence: number | null }> {
  if (!extraction.amount || !extraction.date) {
    return { transactionId: null, confidence: null }
  }

  const txDate = new Date(extraction.date)
  const dayBefore = new Date(txDate)
  dayBefore.setDate(dayBefore.getDate() - 1)
  const dayAfter = new Date(txDate)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const { data: candidates } = await supabase
    .from('transactions')
    .select('id, amount, transaction_date, original_currency')
    .eq('user_id', userId)
    .eq('original_currency', 'THB')
    .gte('transaction_date', formatDate(dayBefore))
    .lte('transaction_date', formatDate(dayAfter))

  if (!candidates || candidates.length === 0) {
    return { transactionId: null, confidence: null }
  }

  // Find exact or near amount match
  for (const tx of candidates) {
    const diff = Math.abs(Number(tx.amount) - extraction.amount)
    if (diff < 0.01) {
      // Exact match
      const dateExact = tx.transaction_date === extraction.date
      return {
        transactionId: tx.id,
        confidence: dateExact ? 95 : 85,
      }
    }
  }

  return { transactionId: null, confidence: null }
}
