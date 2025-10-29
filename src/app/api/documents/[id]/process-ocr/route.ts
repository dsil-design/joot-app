/**
 * OCR Processing API Endpoint
 *
 * POST /api/documents/[id]/process-ocr
 *
 * Processes OCR for a specific document
 * - Downloads document from storage
 * - Runs OCR extraction
 * - Saves results to document_extractions table
 * - Updates document processing_status
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  extractTextFromDocument,
  preprocessOCRText,
  calculateOCRQuality,
  isOCRResultValid,
} from '@/lib/services/ocr-service'
import { getDocumentUrl } from '@/lib/services/storage-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for OCR processing

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/documents/[id]/process-ocr
 *
 * Process OCR for a document
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

    // Check if already processed
    const { data: existingExtraction } = await supabase
      .from('document_extractions')
      .select('id')
      .eq('document_id', documentId)
      .single()

    if (existingExtraction) {
      return NextResponse.json(
        { error: 'Document already processed' },
        { status: 400 }
      )
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId)

    try {
      // Download document from storage
      const signedUrl = await getDocumentUrl(document.storage_path)
      if (!signedUrl) {
        throw new Error('Failed to get document URL')
      }

      // Fetch document file
      const response = await fetch(signedUrl)
      if (!response.ok) {
        throw new Error('Failed to download document')
      }

      const arrayBuffer = await response.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)

      // Run OCR
      const ocrResult = await extractTextFromDocument(
        fileBuffer,
        document.mime_type
      )

      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'OCR extraction failed')
      }

      // Preprocess text
      const cleanedText = preprocessOCRText(ocrResult.text)

      // Calculate quality
      const quality = calculateOCRQuality(ocrResult)
      const isValid = isOCRResultValid(ocrResult)

      // Save extraction to database
      const { data: extraction, error: extractionError } = await supabase
        .from('document_extractions')
        .insert({
          document_id: documentId,
          raw_text: cleanedText,
          ocr_confidence: ocrResult.confidence,
          processing_time_ms: ocrResult.processingTime || 0,
          extracted_at: new Date().toISOString(),
          // AI extraction fields will be populated in Week 2 Days 3-4
          vendor_name: null,
          amount: null,
          currency: null,
          transaction_date: null,
          extraction_confidence: null,
          metadata: {
            ocr_language: ocrResult.language,
            ocr_quality: quality,
            is_valid: isValid,
            text_length: cleanedText.length,
          },
        })
        .select()
        .single()

      if (extractionError) {
        console.error('Failed to save extraction:', extractionError)
        throw new Error('Failed to save extraction results')
      }

      // Update document status
      await supabase
        .from('documents')
        .update({
          processing_status: isValid ? 'completed' : 'failed',
          ocr_confidence: ocrResult.confidence,
        })
        .eq('id', documentId)

      // Return success
      return NextResponse.json({
        success: true,
        extraction: {
          id: extraction.id,
          documentId: extraction.document_id,
          rawText: extraction.raw_text,
          ocrConfidence: extraction.ocr_confidence,
          processingTimeMs: extraction.processing_time_ms,
          metadata: extraction.metadata,
        },
        quality: {
          score: quality,
          isValid,
          confidence: ocrResult.confidence,
        },
      })
    } catch (processingError) {
      console.error('OCR processing error:', processingError)

      // Update status to failed
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          ocr_confidence: 0,
        })
        .eq('id', documentId)

      return NextResponse.json(
        {
          error: 'OCR processing failed',
          message:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error in OCR processing API:', error)
    return NextResponse.json(
      { error: 'Processing failed', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
