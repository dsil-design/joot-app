/**
 * AI Extraction Worker
 *
 * Background worker that processes AI data extraction jobs from the queue
 * Extracts vendor, amount, currency, and date from OCR text
 */

import {
  registerJobHandler,
  JOB_TYPES,
  type ExtractDataJobData,
} from '@/lib/services/job-queue-service'

/**
 * Initialize AI extraction worker
 *
 * Registers handlers for AI extraction jobs
 * Call this once during application startup
 */
export async function initializeAIExtractionWorker(): Promise<void> {
  console.log('Initializing AI extraction worker...')

  // Register handler for AI extraction jobs
  await registerJobHandler<ExtractDataJobData>(
    JOB_TYPES.EXTRACT_DATA,
    async (job) => {
      const { documentId, userId } = job.data

      console.log(`Processing AI extraction for document: ${documentId}`)

      try {
        // Call the AI extraction API endpoint
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const response = await fetch(
          `${baseUrl}/api/documents/${documentId}/extract-data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'AI extraction failed')
        }

        const result = await response.json()
        console.log(`AI extraction completed for document ${documentId}:`, {
          vendor: result.extraction?.vendorName,
          amount: result.extraction?.amount,
          currency: result.extraction?.currency,
          confidence: result.quality?.aiConfidence,
        })
      } catch (error) {
        console.error(`AI extraction job failed for document ${documentId}:`, error)
        throw error // Let pg-boss handle retries
      }
    }
  )

  console.log('AI extraction worker initialized successfully')
}
