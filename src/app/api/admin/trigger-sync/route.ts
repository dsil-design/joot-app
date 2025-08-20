import { NextRequest, NextResponse } from 'next/server';
import { dailySyncService } from '@/lib/services/daily-sync-service';
import { backfillService } from '@/lib/services/backfill-service';
import { dateHelpers } from '@/lib/utils/date-helpers';
import { createAdminClient, isAdminAvailable } from '@/lib/supabase/admin';

/**
 * Manual trigger endpoint for exchange rate synchronization
 * POST /api/admin/trigger-sync
 * 
 * Supports both single date sync and backfill operations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  console.log(`🎯 Manual sync triggered at ${new Date().toISOString()}`);
  
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
    const { type = 'fiat', date, startDate, endDate } = body;
    
    console.log(`📊 Manual sync request:`, { type, date, startDate, endDate });
    
    // 2. Skip authentication for development/testing
    // In production, you would add proper authentication here
    const isDevelopment = process.env.NODE_ENV === 'development' || request.headers.get('host')?.includes('localhost');
    if (!isDevelopment) {
      const authHeader = request.headers.get('authorization');
      const adminToken = process.env.ADMIN_TOKEN || process.env.CRON_SECRET;
      
      if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
        console.error('❌ Unauthorized manual sync request');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Unauthorized - Admin token required',
            timestamp: new Date().toISOString()
          }, 
          { status: 401 }
        );
      }
    }
    
    // 3. Handle different sync types
    let result;
    
    if (type === 'backfill' && startDate && endDate) {
      // Backfill mode
      console.log(`🔄 Executing backfill from ${startDate} to ${endDate}`);
      
      // Validate dates
      if (!dateHelpers.isValidDateString(startDate) || !dateHelpers.isValidDateString(endDate)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
      
      if (!dateHelpers.validateDateRange(startDate, endDate)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Start date must be before end date',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
      
      // Execute backfill
      const backfillResult = await backfillService.executeBackfill({
        startDate,
        endDate,
        batchSize: 100,
        skipExisting: true,
        dryRun: false
      });
      
      result = {
        success: true,
        type: 'backfill',
        message: `Backfill completed: ${backfillResult.insertedRecords} rates inserted`,
        data: {
          startDate,
          endDate,
          processedRecords: backfillResult.processedRecords,
          insertedRecords: backfillResult.insertedRecords,
          skippedRecords: backfillResult.skippedRecords,
          errorCount: backfillResult.errorCount,
          duration: Math.round(backfillResult.duration / 1000)
        }
      };
      
    } else {
      // Single date sync mode
      const targetDate = date || dateHelpers.getCurrentUTCDate();
      
      console.log(`📅 Syncing rates for ${targetDate}`);
      
      // Validate date
      if (!dateHelpers.isValidDateString(targetDate)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
      
      // Execute sync for specific date
      const syncResult = await dailySyncService.executeDailySync({
        targetDate,
        fillGaps: false
      });
      
      result = {
        success: syncResult.success,
        type: 'single',
        message: syncResult.success 
          ? `Successfully synced ${syncResult.ratesInserted} rates for ${targetDate}`
          : `Sync failed for ${targetDate}`,
        data: {
          targetDate: syncResult.targetDate,
          ratesInserted: syncResult.ratesInserted,
          gapsFilled: syncResult.gapsFilled,
          errorCount: syncResult.errors.length,
          skippedReason: syncResult.skippedReason
        },
        errors: syncResult.errors.map(error => ({
          type: error.type,
          message: error.message,
          currency: error.currency,
          date: error.date,
          retryable: error.retryable
        }))
      };
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Manual sync completed in ${Math.round(duration / 1000)}s`);
    
    return NextResponse.json({
      ...result,
      duration: Math.round(duration / 1000),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('💥 Manual sync failed:', errorMessage);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: Math.round(duration / 1000),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for information and testing
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
  
  return NextResponse.json({
    endpoint: 'Manual Exchange Rate Sync Trigger',
    method: 'POST',
    authentication: 'Bearer token required (ADMIN_TOKEN) - disabled for localhost',
    description: 'Manually trigger exchange rate synchronization',
    supportedTypes: {
      single: 'Sync rates for a single date',
      backfill: 'Backfill rates for a date range'
    },
    examples: {
      singleDate: {
        body: {
          type: 'fiat',
          date: '2024-08-16'
        },
        description: 'Sync rates for August 16, 2024'
      },
      currentDate: {
        body: {
          type: 'fiat'
        },
        description: 'Sync rates for today'
      },
      backfill: {
        body: {
          type: 'backfill',
          startDate: '2024-08-01',
          endDate: '2024-08-02'
        },
        description: 'Backfill rates from Aug 1-2, 2024'
      }
    },
    timestamp: new Date().toISOString()
  });
}