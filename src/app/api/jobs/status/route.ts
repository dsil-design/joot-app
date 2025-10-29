/**
 * Job Status API Endpoint
 *
 * GET /api/jobs/status?jobId=xxx
 *
 * Check the status of a background job
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getJobStatus, getQueueStats } from '@/lib/services/job-queue-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/jobs/status?jobId=xxx
 *
 * Get job status by ID, or get overall queue statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    // If jobId provided, return specific job status
    if (jobId) {
      const job = await getJobStatus(jobId)

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          name: job.name,
          state: job.state,
          data: job.data,
          retryCount: job.retrycount,
          createdOn: job.createdon,
          startedOn: job.startedon,
          completedOn: job.completedon,
        },
      })
    }

    // Otherwise, return queue statistics
    const stats = await getQueueStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error fetching job status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}
