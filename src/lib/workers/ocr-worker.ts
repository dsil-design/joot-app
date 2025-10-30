/**
 * OCR Worker
 *
 * Background worker that processes OCR jobs from the queue
 * Can be run as a separate process or integrated into the app
 */

import {
  registerJobHandler,
  JOB_TYPES,
  type ProcessOCRJobData,
} from '@/lib/services/job-queue-service'

/**
 * Initialize OCR worker
 *
 * Registers handlers for OCR-related jobs
 * Call this once during application startup
 */
export async function initializeOCRWorker(): Promise<void> {
  console.log('Initializing OCR worker...')

  // Register handler for OCR processing jobs
  await registerJobHandler<ProcessOCRJobData>(
    JOB_TYPES.PROCESS_OCR,
    async (job) => {
      const { documentId, userId } = job.data

      console.log(`Processing OCR for document: ${documentId}`)

      try {
        // Call the OCR processing API endpoint
        // In a real production setup, you might call the service directly
        // For now, we'll use the API endpoint approach
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const response = await fetch(
          `${baseUrl}/api/documents/${documentId}/process-ocr`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // In production, you'd use a service account token
              // For now, we rely on the API's internal auth
            },
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'OCR processing failed')
        }

        const result = await response.json()
        console.log(`OCR completed for document ${documentId}:`, {
          confidence: result.quality?.confidence,
          quality: result.quality?.score,
        })
      } catch (error) {
        console.error(`OCR job failed for document ${documentId}:`, error)
        throw error // Let pg-boss handle retries
      }
    }
  )

  console.log('OCR worker initialized successfully')
}

/**
 * Start OCR worker as standalone process
 *
 * This can be run in a separate Node.js process for dedicated job processing
 * Now also includes AI extraction worker
 *
 * Usage:
 * ```bash
 * npm run worker:ocr
 * ```
 */
export async function startOCRWorker(): Promise<void> {
  console.log('Starting document processing workers...')

  try {
    // Initialize OCR worker
    await initializeOCRWorker()

    // Initialize AI extraction worker
    const { initializeAIExtractionWorker } = await import('./ai-extraction-worker')
    await initializeAIExtractionWorker()

    console.log('All workers running. Press Ctrl+C to stop.')

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('Shutting down OCR worker...')
      const { stopJobQueue } = await import('@/lib/services/job-queue-service')
      await stopJobQueue()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log('Shutting down OCR worker...')
      const { stopJobQueue } = await import('@/lib/services/job-queue-service')
      await stopJobQueue()
      process.exit(0)
    })
  } catch (error) {
    console.error('Failed to start OCR worker:', error)
    process.exit(1)
  }
}

// If run directly as a script
if (require.main === module) {
  startOCRWorker().catch((error) => {
    console.error('OCR worker crashed:', error)
    process.exit(1)
  })
}
