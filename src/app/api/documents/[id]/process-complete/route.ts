/**
 * Complete Document Processing API Endpoint
 *
 * POST /api/documents/[id]/process-complete
 *
 * Processes document through entire pipeline:
 * 1. OCR (Tesseract)
 * 2. AI Data Extraction (Gemini)
 * 3. Transaction Matching
 * 4. Vendor Enrichment
 *
 * Returns streaming response with progress updates
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { extractTextFromDocument } from '@/lib/services/ocr-service'
import { extractDataFromText, isExtractionValid } from '@/lib/services/ai-extraction-service'
import { findMatchingTransactions } from '@/lib/services/matching-service'
import { enrichVendor } from '@/lib/services/vendor-enrichment-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for complete processing

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/documents/[id]/process-complete
 *
 * Process document through complete pipeline with progress updates
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const encoder = new TextEncoder()
  const { id: documentId } = await context.params

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }

      try {
        const supabase = await createClient()

        // Auth check
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          send({ error: 'Unauthorized', step: 'auth' })
          controller.close()
          return
        }

        // Get document
        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .eq('user_id', user.id)
          .single()

        if (docError || !document) {
          send({ error: 'Document not found', step: 'fetch' })
          controller.close()
          return
        }

        // Clear existing matches and extraction if reprocessing
        // This prevents duplicate matches when rerunning processing
        await supabase
          .from('transaction_document_matches')
          .delete()
          .eq('document_id', documentId)

        await supabase
          .from('reconciliation_queue')
          .delete()
          .eq('document_id', documentId)

        // Update status to processing
        await supabase
          .from('documents')
          .update({
            processing_status: 'processing',
            processing_error: null
          })
          .eq('id', documentId)

        send({ step: 'started', message: 'Starting document processing...' })

        // ============================================
        // STEP 1: OCR Processing
        // ============================================
        send({ step: 'ocr', progress: 0, message: 'Running OCR...' })

        try {
          // Generate signed URL and fetch file
          const serviceRoleClient = createServiceRoleClient()
          const { data: urlData, error: urlError } = await serviceRoleClient.storage
            .from('documents')
            .createSignedUrl(document.storage_path, 60)

          if (urlError || !urlData?.signedUrl) {
            throw new Error('Failed to generate file URL')
          }

          // Fetch the file content
          const fileResponse = await fetch(urlData.signedUrl)
          if (!fileResponse.ok) {
            throw new Error('Failed to download file for processing')
          }

          const arrayBuffer = await fileResponse.arrayBuffer()
          const fileBuffer = Buffer.from(arrayBuffer)

          // Run OCR
          const ocrResult = await extractTextFromDocument(
            fileBuffer,
            document.mime_type
          )

          if (!ocrResult.success || !ocrResult.text) {
            throw new Error(ocrResult.error || 'OCR failed')
          }

          // Save OCR results
          // Use onConflict to specify which field to use for upsert conflict resolution
          const { error: ocrSaveError } = await supabase
            .from('document_extractions')
            .upsert({
              document_id: documentId,
              user_id: user.id,
              raw_text: ocrResult.text,
              ocr_confidence: ocrResult.confidence || 0,
              metadata: {
                ocr_language: ocrResult.language,
                processing_time: ocrResult.processingTime,
              },
            }, {
              onConflict: 'document_id'
            })

          if (ocrSaveError) {
            console.error('OCR save error:', ocrSaveError)
            throw new Error(`Failed to save OCR results: ${ocrSaveError.message}`)
          }

          send({
            step: 'ocr',
            progress: 100,
            message: 'OCR complete',
            confidence: ocrResult.confidence,
          })
        } catch (error) {
          send({
            step: 'ocr',
            error: error instanceof Error ? error.message : 'OCR failed',
          })
          await supabase
            .from('documents')
            .update({
              processing_status: 'failed',
              processing_error: error instanceof Error ? error.message : 'OCR failed'
            })
            .eq('id', documentId)
          controller.close()
          return
        }

        // ============================================
        // STEP 2: AI Data Extraction
        // ============================================
        send({ step: 'ai_extraction', progress: 0, message: 'Extracting data with AI...' })

        try {
          // Get OCR text
          const { data: extraction } = await supabase
            .from('document_extractions')
            .select('raw_text')
            .eq('document_id', documentId)
            .single()

          if (!extraction?.raw_text) {
            throw new Error('No OCR text found')
          }

          // Run AI extraction
          const extractionResult = await extractDataFromText(extraction.raw_text)

          if (!extractionResult.success || !extractionResult.data) {
            throw new Error(extractionResult.error || 'AI extraction failed')
          }

          const extractedData = extractionResult.data
          const isValid = isExtractionValid(extractedData)

          // Update extraction record
          // Note: document_extractions table uses 'merchant_name' not 'vendor_name'
          await supabase
            .from('document_extractions')
            .update({
              merchant_name: extractedData.vendor_name || extractedData.merchant_name,
              amount: extractedData.amount,
              currency: extractedData.currency,
              transaction_date: extractedData.transaction_date,
              extraction_confidence: extractedData.extraction_confidence,
              metadata: {
                ...extractedData.metadata,
                is_extraction_valid: isValid,
              },
            })
            .eq('document_id', documentId)

          send({
            step: 'ai_extraction',
            progress: 100,
            message: 'Data extraction complete',
            data: {
              vendor: extractedData.vendor_name,
              amount: extractedData.amount,
              currency: extractedData.currency,
              date: extractedData.transaction_date,
            },
            confidence: extractedData.extraction_confidence,
          })

          if (!isValid) {
            throw new Error('Extracted data quality too low')
          }
        } catch (error) {
          send({
            step: 'ai_extraction',
            error: error instanceof Error ? error.message : 'AI extraction failed',
          })
          await supabase
            .from('documents')
            .update({
              processing_status: 'failed',
              processing_error: error instanceof Error ? error.message : 'AI extraction failed'
            })
            .eq('id', documentId)
          controller.close()
          return
        }

        // ============================================
        // STEP 3: Transaction Matching
        // ============================================
        send({ step: 'matching', progress: 0, message: 'Finding matching transactions...' })

        try {
          // Get extracted data
          const { data: extraction } = await supabase
            .from('document_extractions')
            .select('*')
            .eq('document_id', documentId)
            .single()

          if (!extraction) {
            throw new Error('No extraction data found')
          }

          console.log('[PROCESS] Starting matching with extraction data:', {
            merchant: extraction.merchant_name,
            amount: extraction.amount,
            currency: extraction.currency,
            date: extraction.transaction_date
          })

          // Run matching - pass supabase client to avoid cookies() issues
          const matchResult = await findMatchingTransactions(
            {
              vendorName: extraction.merchant_name || '',
              amount: extraction.amount || 0,
              currency: extraction.currency || 'USD',
              transactionDate: extraction.transaction_date || undefined,
            },
            user.id,
            50, // Min confidence
            5, // Max results
            supabase // Pass the existing supabase client
          )

          console.log('[PROCESS] Matching complete:', {
            success: matchResult.success,
            matchCount: matchResult.matches.length,
            error: matchResult.error
          })

          // Save match records
          if (matchResult.matches.length > 0) {
            const matchRecords = matchResult.matches.map((match) => ({
              document_id: documentId,
              transaction_id: match.transaction.id,
              confidence_score: match.confidence,
              match_type: match.isAutoMatch ? 'automatic' : 'suggested',
              matched_at: new Date().toISOString(),
              matched_by: 'system',
              metadata: {
                scores: match.scores,
                match_reasons: match.matchReasons,
              },
            }))

            await supabase.from('transaction_document_matches').insert(matchRecords)
          }

          send({
            step: 'matching',
            progress: 100,
            message: `Found ${matchResult.matches.length} matching transactions`,
            matchCount: matchResult.matches.length,
            bestMatch: matchResult.bestMatch
              ? {
                  confidence: matchResult.bestMatch.confidence,
                  isAutoMatch: matchResult.bestMatch.isAutoMatch,
                }
              : null,
          })

          // Determine if needs manual review
          const needsReview = !matchResult.bestMatch?.isAutoMatch

          // Add to reconciliation queue if needed
          if (needsReview && matchResult.matches.length > 0) {
            await supabase.from('reconciliation_queue').insert({
              document_id: documentId,
              priority: 'normal',
              status: 'pending_review',
              metadata: {
                match_count: matchResult.matches.length,
                best_match_confidence: matchResult.bestMatch?.confidence || 0,
              },
            })
          }
        } catch (error) {
          // Matching errors are non-fatal - document is still processed
          send({
            step: 'matching',
            progress: 100,
            message: 'Matching skipped (no transactions found)',
            matchCount: 0,
          })
        }

        // ============================================
        // STEP 4: Vendor Enrichment
        // ============================================
        send({ step: 'vendor_enrichment', progress: 0, message: 'Enriching vendor data...' })

        try {
          const { data: extraction } = await supabase
            .from('document_extractions')
            .select('merchant_name')
            .eq('document_id', documentId)
            .single()

          if (extraction?.merchant_name) {
            const enrichmentResult = await enrichVendor(extraction.merchant_name, user.id)

            send({
              step: 'vendor_enrichment',
              progress: 100,
              message: 'Vendor enrichment complete',
              vendor: {
                name: enrichmentResult.normalizedName,
                logo: enrichmentResult.logoUrl,
              },
            })
          } else {
            send({
              step: 'vendor_enrichment',
              progress: 100,
              message: 'Vendor enrichment skipped',
            })
          }
        } catch (error) {
          // Enrichment errors are non-fatal
          send({
            step: 'vendor_enrichment',
            progress: 100,
            message: 'Vendor enrichment skipped',
          })
        }

        // ============================================
        // COMPLETE
        // ============================================
        await supabase
          .from('documents')
          .update({ processing_status: 'completed' })
          .eq('id', documentId)

        send({
          step: 'completed',
          progress: 100,
          message: 'Document processing complete!',
        })

        controller.close()
      } catch (error) {
        console.error('Processing error:', error)
        send({
          step: 'error',
          error: error instanceof Error ? error.message : 'Processing failed',
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
