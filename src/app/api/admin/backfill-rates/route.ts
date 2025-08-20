import { NextRequest, NextResponse } from 'next/server';
import { backfillService, BackfillOptions, BackfillProgress } from '@/lib/services/backfill-service';
import { dateHelpers } from '@/lib/utils/date-helpers';
import { createAdminClient, isAdminAvailable } from '@/lib/supabase/admin';

// In-memory lock to prevent concurrent backfill operations
const BACKFILL_LOCKS = new Map<string, { timestamp: number; inProgress: boolean }>();
const LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes

/**
 * Admin endpoint for historical data backfill
 * POST /api/admin/backfill-rates
 * 
 * Supports both streaming and regular responses
 * Use ?stream=true for real-time progress updates
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const lockKey = 'backfill-in-progress';
  
  console.log(`🚀 Backfill request received at ${new Date().toISOString()}`);
  
  // Check if admin operations are available in this environment
  if (!isAdminAvailable()) {
    console.warn('⚠️ Admin operations not available - missing or dummy environment variables');
    return NextResponse.json(
      {
        success: false,
        error: 'Admin operations not available in this environment',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
  
  try {
    // 1. Parse request body
    const body = await request.json().catch(() => ({}));
    const options: Partial<BackfillOptions> = {
      startDate: body.startDate || '2015-01-01',
      endDate: body.endDate || dateHelpers.getCurrentUTCDate(),
      batchSize: body.batchSize || 500,
      skipExisting: body.skipExisting ?? true,
      dryRun: body.dryRun ?? false
    };
    
    console.log(`📊 Backfill options:`, options);
    
    // 2. Basic authentication check (in production, implement proper admin auth)
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env.ADMIN_TOKEN || process.env.CRON_SECRET; // Fallback to CRON_SECRET for testing
    
    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      console.error('❌ Unauthorized backfill request');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized - Admin token required',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      );
    }
    
    // 3. Check for concurrent executions
    if (await checkLock(lockKey)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Backfill already in progress',
          timestamp: new Date().toISOString()
        },
        { status: 429 }
      );
    }
    
    // 4. Validate options
    if (!dateHelpers.isValidDateString(options.startDate!)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid start date format: ${options.startDate}`,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    if (options.endDate && !dateHelpers.isValidDateString(options.endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid end date format: ${options.endDate}`,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    if (!dateHelpers.validateDateRange(options.startDate!, options.endDate!)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date must be before end date',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    // 5. Check if streaming is requested
    const isStreaming = request.nextUrl.searchParams.get('stream') === 'true';
    
    if (isStreaming) {
      return handleStreamingBackfill(options as BackfillOptions, lockKey);
    } else {
      return handleRegularBackfill(options as BackfillOptions, lockKey, startTime);
    }
    
  } catch (error) {
    await releaseLock(lockKey);
    
    console.error('💥 Backfill request failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Math.round((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Handle regular (non-streaming) backfill
 */
async function handleRegularBackfill(
  options: BackfillOptions,
  lockKey: string,
  startTime: number
): Promise<NextResponse> {
  
  try {
    await acquireLock(lockKey);
    
    console.log(`🚀 Starting regular backfill from ${options.startDate} to ${options.endDate}`);
    
    // Set timeout for Vercel function limits
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Backfill operation timed out'));
      }, 14 * 60 * 1000); // 14 minutes
    });
    
    const backfillPromise = backfillService.executeBackfill(options);
    const result = await Promise.race([backfillPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    
    console.log(`🎉 Backfill completed successfully in ${Math.round(duration / 1000)}s`);
    console.log(`📊 Processed: ${result.processedRecords} records`);
    console.log(`💾 Inserted: ${result.insertedRecords} records`);
    console.log(`⏭️  Skipped: ${result.skippedRecords} records`);
    console.log(`❌ Errors: ${result.errorCount}`);
    
    await releaseLock(lockKey);
    
    return NextResponse.json({
      success: true,
      message: `Backfill completed: ${result.insertedRecords} rates inserted`,
      data: {
        ...result,
        duration: Math.round(duration / 1000)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    await releaseLock(lockKey);
    throw error;
  }
}

/**
 * Handle streaming backfill with real-time progress updates
 */
async function handleStreamingBackfill(
  options: BackfillOptions,
  lockKey: string
): Promise<NextResponse> {
  
  // Create a streaming response
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  
  // Start the backfill process asynchronously
  (async () => {
    try {
      await acquireLock(lockKey);
      
      // Send initial message
      await writer.write(encoder.encode('data: {"type":"start","message":"Backfill started"}\n\n'));
      
      // Set up progress callback
      backfillService.setProgressCallback((progress: BackfillProgress) => {
        const progressData = {
          type: 'progress',
          ...progress,
          estimatedTimeRemainingMinutes: Math.round(progress.estimatedTimeRemaining / (1000 * 60))
        };
        
        writer.write(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)).catch(console.error);
      });
      
      // Execute backfill
      const result = await backfillService.executeBackfill(options);
      
      // Send completion message
      const completionData = {
        type: 'complete',
        success: true,
        ...result,
        duration: Math.round(result.duration / 1000)
      };
      
      await writer.write(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
      await writer.close();
      
    } catch (error) {
      // Send error message
      const errorData = {
        type: 'error',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
      
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
      await writer.close();
    } finally {
      await releaseLock(lockKey);
    }
  })();
  
  // Return streaming response
  return new NextResponse(stream.readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * GET endpoint for backfill status and information
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check if admin operations are available in this environment
  if (!isAdminAvailable()) {
    console.warn('⚠️ Admin operations not available - missing or dummy environment variables');
    return NextResponse.json(
      {
        success: false,
        error: 'Admin operations not available in this environment',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
  
  try {
    const lockKey = 'backfill-in-progress';
    const isInProgress = await checkLock(lockKey);
    
    const estimatedRecords = calculateEstimatedRecords('2015-01-01', dateHelpers.getCurrentUTCDate());
    
    return NextResponse.json({
      status: isInProgress ? 'in_progress' : 'ready',
      endpoint: 'Historical Data Backfill',
      method: 'POST',
      authentication: 'Bearer token required (ADMIN_TOKEN)',
      estimatedRecords,
      supportedOptions: {
        startDate: 'YYYY-MM-DD (default: 2015-01-01)',
        endDate: 'YYYY-MM-DD (default: today)',
        batchSize: 'number (default: 500, max: 2000)',
        skipExisting: 'boolean (default: true)',
        dryRun: 'boolean (default: false)'
      },
      streamingSupport: 'Add ?stream=true for real-time progress',
      examples: {
        basic: 'POST /api/admin/backfill-rates with {"startDate": "2020-01-01"}',
        streaming: 'POST /api/admin/backfill-rates?stream=true',
        dryRun: 'POST /api/admin/backfill-rates with {"dryRun": true}'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Check if a lock exists and is still valid
 */
async function checkLock(lockKey: string): Promise<boolean> {
  const lock = BACKFILL_LOCKS.get(lockKey);
  
  if (!lock) return false;
  
  // Check if lock has expired
  if (Date.now() - lock.timestamp > LOCK_TIMEOUT) {
    BACKFILL_LOCKS.delete(lockKey);
    return false;
  }
  
  return lock.inProgress;
}

/**
 * Acquire a lock
 */
async function acquireLock(lockKey: string): Promise<void> {
  if (await checkLock(lockKey)) {
    throw new Error('Lock already exists');
  }
  
  BACKFILL_LOCKS.set(lockKey, {
    timestamp: Date.now(),
    inProgress: true
  });
  
  console.log(`🔒 Acquired lock: ${lockKey}`);
}

/**
 * Release a lock
 */
async function releaseLock(lockKey: string): Promise<void> {
  BACKFILL_LOCKS.delete(lockKey);
  console.log(`🔓 Released lock: ${lockKey}`);
}

/**
 * Calculate estimated number of records for a date range
 */
function calculateEstimatedRecords(startDate: string, endDate: string): number {
  const businessDays = dateHelpers.getBusinessDayCount(startDate, endDate);
  const currencyPairs = 12; // Approximate number of currency pairs we generate
  return businessDays * currencyPairs;
}

/**
 * DELETE endpoint to force-release locks (admin emergency function)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // Check if admin operations are available in this environment
  if (!isAdminAvailable()) {
    console.warn('⚠️ Admin operations not available - missing or dummy environment variables');
    return NextResponse.json(
      {
        success: false,
        error: 'Admin operations not available in this environment',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
  
  try {
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env.ADMIN_TOKEN || process.env.CRON_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const lockKey = 'backfill-in-progress';
    const hadLock = BACKFILL_LOCKS.has(lockKey);
    
    BACKFILL_LOCKS.clear();
    
    console.log(`🚨 Emergency lock release triggered`);
    
    return NextResponse.json({
      success: true,
      message: hadLock ? 'Lock forcibly released' : 'No locks were active',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}