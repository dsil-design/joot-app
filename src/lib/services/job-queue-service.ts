/**
 * Job Queue Service
 *
 * Background job processing using pg-boss
 * Handles asynchronous tasks like OCR processing and AI extraction
 */

import PgBoss from 'pg-boss'

// Job queue instance (singleton)
let bossInstance: PgBoss | null = null

/**
 * Job types supported by the queue
 */
export const JOB_TYPES = {
  PROCESS_OCR: 'process-ocr',
  EXTRACT_DATA: 'extract-data', // Week 2 Days 3-4
  MATCH_TRANSACTION: 'match-transaction', // Week 3
  ENRICH_VENDOR: 'enrich-vendor', // Week 3
} as const

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES]

/**
 * Job data interfaces
 */
export interface ProcessOCRJobData {
  documentId: string
  userId: string
}

export interface ExtractDataJobData {
  documentId: string
  userId: string
  extractionId: string
}

export type JobData = ProcessOCRJobData | ExtractDataJobData

/**
 * Get or create pg-boss instance
 *
 * Connects to the same Supabase PostgreSQL database
 */
async function getBoss(): Promise<PgBoss> {
  if (!bossInstance) {
    // Get connection string from environment
    const connectionString = process.env.SUPABASE_DB_URL || buildConnectionString()

    bossInstance = new PgBoss({
      connectionString,
      schema: 'pgboss', // Use separate schema for pg-boss tables
      max: 2, // Small connection pool
      noScheduling: false, // Enable scheduled jobs
    })

    await bossInstance.start()

    console.log('pg-boss started successfully')
  }

  return bossInstance
}

/**
 * Build Supabase connection string from environment variables
 */
function buildConnectionString(): string {
  const host = 'db.uwjmgjqongcrsamprvjr.supabase.co'
  const port = '5432'
  const database = 'postgres'
  const user = 'postgres'
  const password = process.env.SUPABASE_DB_PASSWORD

  if (!password) {
    throw new Error('SUPABASE_DB_PASSWORD environment variable is required')
  }

  return `postgresql://${user}:${password}@${host}:${port}/${database}`
}

/**
 * Stop pg-boss instance
 *
 * Should be called during application shutdown
 */
export async function stopJobQueue(): Promise<void> {
  if (bossInstance) {
    await bossInstance.stop()
    bossInstance = null
    console.log('pg-boss stopped')
  }
}

/**
 * Enqueue a job for background processing
 *
 * @param jobType - Type of job to enqueue
 * @param data - Job-specific data
 * @param options - Additional job options (priority, retry, etc.)
 * @returns Job ID
 *
 * @example
 * const jobId = await enqueueJob('process-ocr', { documentId: '123', userId: 'abc' })
 */
export async function enqueueJob<T extends JobData>(
  jobType: JobType,
  data: T,
  options: {
    priority?: number // Higher = more priority (default: 0)
    retryLimit?: number // Max retries (default: 3)
    retryDelay?: number // Delay between retries in seconds (default: 60)
    startAfter?: number | string | Date // Delay start
  } = {}
): Promise<string | null> {
  try {
    const boss = await getBoss()

    const jobId = await boss.send(jobType, data, {
      priority: options.priority || 0,
      retryLimit: options.retryLimit ?? 3,
      retryDelay: options.retryDelay || 60,
      startAfter: options.startAfter,
    })

    console.log(`Enqueued job: ${jobType} (ID: ${jobId})`)
    return jobId
  } catch (error) {
    console.error(`Failed to enqueue job ${jobType}:`, error)
    return null
  }
}

/**
 * Register a job handler
 *
 * Defines what happens when a job of a specific type is processed
 *
 * @param jobType - Type of job to handle
 * @param handler - Async function that processes the job
 *
 * @example
 * registerJobHandler('process-ocr', async (job) => {
 *   const { documentId } = job.data
 *   await processOCR(documentId)
 * })
 */
export async function registerJobHandler<T extends JobData>(
  jobType: JobType,
  handler: (job: PgBoss.Job<T>) => Promise<void>
): Promise<void> {
  const boss = await getBoss()

  await boss.work(
    jobType,
    {
      teamSize: 2, // Process up to 2 jobs concurrently
      teamConcurrency: 1, // Each worker processes 1 job at a time
    },
    async (job) => {
      console.log(`Processing job: ${jobType} (ID: ${job.id})`)
      try {
        await handler(job as PgBoss.Job<T>)
        console.log(`Completed job: ${jobType} (ID: ${job.id})`)
      } catch (error) {
        console.error(`Job failed: ${jobType} (ID: ${job.id})`, error)
        throw error // pg-boss will handle retries
      }
    }
  )

  console.log(`Registered handler for job type: ${jobType}`)
}

/**
 * Get job status
 *
 * @param jobId - Job ID
 * @returns Job details or null if not found
 */
export async function getJobStatus(jobId: string): Promise<PgBoss.JobWithMetadata | null> {
  try {
    const boss = await getBoss()
    const job = await boss.getJobById(jobId)
    return job
  } catch (error) {
    console.error(`Failed to get job status for ${jobId}:`, error)
    return null
  }
}

/**
 * Cancel a job
 *
 * @param jobId - Job ID to cancel
 * @returns True if cancelled successfully
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const boss = await getBoss()
    await boss.cancel(jobId)
    console.log(`Cancelled job: ${jobId}`)
    return true
  } catch (error) {
    console.error(`Failed to cancel job ${jobId}:`, error)
    return false
  }
}

/**
 * Get queue statistics
 *
 * @returns Queue stats (active, completed, failed jobs)
 */
export async function getQueueStats() {
  try {
    const boss = await getBoss()

    // Get counts for each job type
    const stats: Record<string, { active: number; completed: number; failed: number }> = {}

    for (const jobType of Object.values(JOB_TYPES)) {
      const queues = await boss.getQueues()
      const queue = queues.find((q) => q.name === jobType)

      stats[jobType] = {
        active: queue?.size || 0,
        completed: 0, // pg-boss doesn't track this easily
        failed: 0,
      }
    }

    return stats
  } catch (error) {
    console.error('Failed to get queue stats:', error)
    return {}
  }
}
