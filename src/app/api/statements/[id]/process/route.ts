import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { processStatement, getProcessingStatus } from '@/lib/statements/statement-processor'

/**
 * POST /api/statements/[id]/process
 *
 * Triggers processing of an uploaded statement file.
 * This will:
 * 1. Download the file from Supabase Storage
 * 2. Extract text from the PDF
 * 3. Parse transactions using the appropriate parser
 * 4. Run matching algorithm against existing transactions
 * 5. Save results for review
 *
 * Request params:
 * - id: Statement upload UUID
 *
 * Request body (optional):
 * - parser: string - Force specific parser (chase, amex, bangkok-bank, kasikorn)
 * - skipMatching: boolean - Skip the matching step (just extract and parse)
 *
 * Returns:
 * - 202: Processing started successfully (async operation)
 * - 400: Invalid request or statement not in valid state
 * - 401: Unauthorized
 * - 404: Statement upload not found
 * - 409: Statement is already being processed
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: statementId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(statementId)) {
      return NextResponse.json(
        { error: 'Invalid statement ID format' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify statement exists and belongs to user
    const { data: statement, error: fetchError } = await supabase
      .from('statement_uploads')
      .select('id, user_id, status, filename')
      .eq('id', statementId)
      .single()

    if (fetchError || !statement) {
      return NextResponse.json(
        { error: 'Statement upload not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (statement.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this statement' },
        { status: 401 }
      )
    }

    // Check if already processing
    if (statement.status === 'processing') {
      // Get current progress
      const status = await getProcessingStatus(statementId)

      return NextResponse.json(
        {
          error: 'Statement is already being processed',
          status: 'processing',
          progress: status?.progress,
        },
        { status: 409 }
      )
    }

    // Check if already completed (allow re-processing)
    // Users can re-process completed statements to update matching

    // Parse optional body
    const options = await parseRequestOptions(request)

    // Start processing asynchronously
    // For MVP, we process synchronously but return immediately
    // In production, this would queue a background job

    // Use service role client for processing (needs storage access)
    const serviceClient = createServiceRoleClient()

    // Record processing start in import_activities
    await serviceClient
      .from('import_activities')
      .insert({
        user_id: user.id,
        activity_type: 'statement_processed',
        statement_upload_id: statementId,
        description: `Started processing statement: ${statement.filename}`,
        metadata: { options },
      })

    // Calculate estimated time based on file type
    const estimatedSeconds = 10 // Base estimate for PDF processing

    // Return 202 Accepted immediately
    const response = NextResponse.json(
      {
        success: true,
        message: 'Processing started',
        job_id: statementId, // Use statement ID as job ID for MVP
        statement_id: statementId,
        status: 'processing',
        estimated_time_seconds: estimatedSeconds,
        status_url: `/api/statements/${statementId}/status`,
        results_url: `/api/statements/${statementId}/matches`,
      },
      { status: 202 }
    )

    // Process in background (fire-and-forget for MVP)
    // In production, use a proper job queue (Inngest, BullMQ, etc.)
    processStatementAsync(statementId, options, user.id, statement.filename)

    return response

  } catch (error) {
    console.error('Statement process API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/statements/[id]/process
 *
 * Gets the current processing status of a statement.
 *
 * Returns:
 * - 200: Current status
 * - 401: Unauthorized
 * - 404: Statement not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: statementId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(statementId)) {
      return NextResponse.json(
        { error: 'Invalid statement ID format' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify statement exists and belongs to user
    const { data: statement, error: fetchError } = await supabase
      .from('statement_uploads')
      .select(`
        id,
        user_id,
        filename,
        status,
        transactions_extracted,
        transactions_matched,
        transactions_new,
        extraction_started_at,
        extraction_completed_at,
        extraction_error,
        extraction_log
      `)
      .eq('id', statementId)
      .single()

    if (fetchError || !statement) {
      return NextResponse.json(
        { error: 'Statement upload not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (statement.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract progress from extraction_log if available
    const extractionLog = statement.extraction_log as { log?: Array<{ step: string; percent: number; message: string }> } | null
    const progressLog = extractionLog?.log || []
    const currentProgress = progressLog.length > 0
      ? progressLog[progressLog.length - 1]
      : null

    return NextResponse.json({
      statement_id: statementId,
      filename: statement.filename,
      status: statement.status,
      progress: currentProgress ? {
        step: currentProgress.step,
        percent: currentProgress.percent,
        message: currentProgress.message,
      } : null,
      results: statement.status === 'completed' ? {
        transactions_extracted: statement.transactions_extracted,
        transactions_matched: statement.transactions_matched,
        transactions_new: statement.transactions_new,
      } : null,
      error: statement.extraction_error,
      started_at: statement.extraction_started_at,
      completed_at: statement.extraction_completed_at,
    })

  } catch (error) {
    console.error('Statement process status API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process statement asynchronously (fire-and-forget)
 * In production, this would be replaced with a proper job queue
 */
async function processStatementAsync(
  statementId: string,
  options: { parser?: string; skipMatching?: boolean },
  userId: string,
  filename: string
): Promise<void> {
  try {
    const result = await processStatement(statementId, options)

    // Log completion
    const serviceClient = createServiceRoleClient()

    if (result.success) {
      await serviceClient
        .from('import_activities')
        .insert({
          user_id: userId,
          activity_type: 'statement_processed',
          statement_upload_id: statementId,
          description: `Completed processing statement: ${filename}`,
          transactions_affected: result.transactionsExtracted,
          metadata: {
            transactions_extracted: result.transactionsExtracted,
            transactions_matched: result.transactionsMatched,
            transactions_new: result.transactionsNew,
          },
        })
    } else {
      await serviceClient
        .from('import_activities')
        .insert({
          user_id: userId,
          activity_type: 'extraction_error',
          statement_upload_id: statementId,
          description: `Failed to process statement: ${filename}`,
          metadata: {
            error: result.error,
          },
        })
    }
  } catch (error) {
    console.error('Async statement processing error:', error)

    // Try to log the error
    try {
      const serviceClient = createServiceRoleClient()
      await serviceClient
        .from('import_activities')
        .insert({
          user_id: userId,
          activity_type: 'extraction_error',
          statement_upload_id: statementId,
          description: `Processing failed for statement: ${filename}`,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
    } catch {
      // Ignore error logging failure
    }
  }
}

/**
 * Parse optional request body for processing options
 */
async function parseRequestOptions(
  request: NextRequest
): Promise<{ parser?: string; skipMatching?: boolean }> {
  try {
    const body = await request.json()
    const options: { parser?: string; skipMatching?: boolean } = {}

    if (body.parser && typeof body.parser === 'string') {
      options.parser = body.parser
    }
    if (typeof body.skipMatching === 'boolean') {
      options.skipMatching = body.skipMatching
    }

    return options
  } catch {
    // No body provided or invalid JSON - use defaults
    return {}
  }
}
