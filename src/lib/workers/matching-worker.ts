/**
 * Transaction Matching Worker
 *
 * Background worker that processes transaction matching jobs
 * Matches documents to transactions and enriches vendor data
 */

import {
  registerJobHandler,
  JOB_TYPES,
} from '@/lib/services/job-queue-service'

interface MatchTransactionJobData {
  documentId: string
  userId: string
}

/**
 * Initialize transaction matching worker
 *
 * Registers handlers for matching jobs
 * Call this once during application startup
 */
export async function initializeMatchingWorker(): Promise<void> {
  console.log('Initializing transaction matching worker...')

  // Register handler for transaction matching jobs
  await registerJobHandler<MatchTransactionJobData>(
    JOB_TYPES.MATCH_TRANSACTION,
    async (job) => {
      const { documentId, userId } = job.data

      console.log(`Processing transaction matching for document: ${documentId}`)

      try {
        // Call the matching API endpoint
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const response = await fetch(
          `${baseUrl}/api/documents/${documentId}/match-transactions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Transaction matching failed')
        }

        const result = await response.json()
        console.log(`Matching completed for document ${documentId}:`, {
          matchCount: result.matching?.matchCount,
          bestMatchConfidence: result.matching?.bestMatch?.confidence,
          needsReview: result.matching?.needsReview,
        })
      } catch (error) {
        console.error(`Matching job failed for document ${documentId}:`, error)
        throw error // Let pg-boss handle retries
      }
    }
  )

  console.log('Transaction matching worker initialized successfully')
}
