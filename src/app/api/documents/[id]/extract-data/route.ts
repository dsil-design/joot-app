/**
 * Data Extraction API Endpoint
 *
 * POST /api/documents/[id]/extract-data
 *
 * Extracts structured data from OCR text using Google Gemini AI
 * - Retrieves OCR text from document_extractions
 * - Runs AI extraction for vendor, amount, currency, date
 * - Updates document_extractions with structured data
 * - Updates document processing_status
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  extractDataFromText,
  calculateExtractionQuality,
  isExtractionValid,
} from '@/lib/services/ai-extraction-service'
import { enqueueJob, JOB_TYPES } from '@/lib/services/job-queue-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for AI processing

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/documents/[id]/extract-data
 *
 * Extract structured data from document using AI
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await context.params

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id) // Ensure user owns document
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get existing extraction (must have OCR results first)
    const { data: extraction, error: extractionError } = await supabase
      .from('document_extractions')
      .select('*')
      .eq('document_id', documentId)
      .single()

    if (extractionError || !extraction) {
      return NextResponse.json(
        { error: 'OCR extraction not found. Run OCR first.' },
        { status: 404 }
      )
    }

    // Check if already extracted
    if (extraction.vendor_name || extraction.amount) {
      return NextResponse.json(
        { error: 'Data already extracted for this document' },
        { status: 400 }
      )
    }

    // Check if OCR text is valid
    if (!extraction.raw_text || extraction.raw_text.trim().length < 10) {
      return NextResponse.json(
        { error: 'OCR text too short or empty' },
        { status: 400 }
      )
    }

    try {
      // Run AI extraction
      const extractionResult = await extractDataFromText(extraction.raw_text)

      if (!extractionResult.success || !extractionResult.data) {
        throw new Error(extractionResult.error || 'AI extraction failed')
      }

      const extractedData = extractionResult.data

      // Calculate overall quality
      const quality = calculateExtractionQuality(extractedData)
      const isValid = isExtractionValid(extractedData)

      // Update extraction record with AI results
      const { data: updatedExtraction, error: updateError } = await supabase
        .from('document_extractions')
        .update({
          vendor_name: extractedData.vendor_name,
          amount: extractedData.amount,
          currency: extractedData.currency,
          transaction_date: extractedData.transaction_date,
          extraction_confidence: extractedData.extraction_confidence,
          metadata: {
            ...extraction.metadata,
            ...extractedData.metadata,
            extraction_quality: quality,
            is_extraction_valid: isValid,
          },
        })
        .eq('id', extraction.id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update extraction:', updateError)
        throw new Error('Failed to save extraction results')
      }

      // Update document status to processing (matching will update to completed)
      const newStatus = isValid ? 'processing' : 'failed'
      await supabase
        .from('documents')
        .update({
          processing_status: newStatus,
        })
        .eq('id', documentId)

      // Enqueue transaction matching job if extraction was successful
      if (isValid) {
        try {
          await enqueueJob(JOB_TYPES.MATCH_TRANSACTION, {
            documentId: documentId,
            userId: user.id,
          })
          console.log(`Enqueued matching job for document: ${documentId}`)
        } catch (error) {
          // Don't fail extraction if job enqueueing fails
          console.error('Failed to enqueue matching job:', error)
        }
      }

      // Return success
      return NextResponse.json({
        success: true,
        extraction: {
          id: updatedExtraction.id,
          documentId: updatedExtraction.document_id,
          vendorName: updatedExtraction.vendor_name,
          amount: updatedExtraction.amount,
          currency: updatedExtraction.currency,
          transactionDate: updatedExtraction.transaction_date,
          extractionConfidence: updatedExtraction.extraction_confidence,
          ocrConfidence: updatedExtraction.ocr_confidence,
          metadata: updatedExtraction.metadata,
        },
        quality: {
          score: quality,
          isValid,
          ocrConfidence: extraction.ocr_confidence,
          aiConfidence: extractedData.extraction_confidence,
        },
      })
    } catch (processingError) {
      console.error('AI extraction error:', processingError)

      // Update status to failed
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
        })
        .eq('id', documentId)

      return NextResponse.json(
        {
          error: 'AI extraction failed',
          message:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error in AI extraction API:', error)
    return NextResponse.json(
      { error: 'Extraction failed', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
