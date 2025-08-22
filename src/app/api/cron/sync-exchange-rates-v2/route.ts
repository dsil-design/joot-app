import { NextRequest, NextResponse } from 'next/server';
import { ecbFullSyncService } from '@/lib/services/ecb-full-sync-service';
import { createClient } from '@/lib/supabase/server';

/**
 * Vercel Cron Job Handler for Daily ECB Exchange Rate Sync
 * 
 * This endpoint is called automatically by Vercel Cron based on the schedule
 * defined in vercel.json. It downloads the complete ECB XML file and syncs
 * any new or changed exchange rates.
 * 
 * Schedule: Daily at 17:00 UTC (configurable via database)
 */
export async function GET(request: NextRequest) {
  // Verify this is a Vercel cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🚀 Starting scheduled ECB sync job...');

    // Check if auto-sync is enabled (fallback for when sync tables don't exist yet)
    const supabase = await createClient();
    let autoSyncEnabled = true; // Default to enabled
    
    try {
      const { data: config } = await supabase
        .rpc('get_sync_configuration' as any);

      if (config?.[0]?.auto_sync_enabled === false) {
        console.log('⏸️  Auto-sync is disabled, skipping scheduled sync');
        return NextResponse.json({
          success: true,
          message: 'Auto-sync disabled',
          skipped: true
        });
      }
    } catch (error) {
      // Sync tables don't exist yet, proceed with sync
      console.log('Sync configuration not available yet, proceeding with sync...');
    }

    // Check if sync is already running (fallback for when sync tables don't exist yet)
    try {
      const { data: latestSync } = await supabase
        .rpc('get_latest_sync_status' as any);

      if (latestSync?.[0]?.status === 'running') {
        // Check if it's been running too long (over 10 minutes is suspicious)
        const runningTime = Date.now() - new Date(latestSync[0].started_at).getTime();
        if (runningTime > 10 * 60 * 1000) {
          console.warn('⚠️  Previous sync has been running for over 10 minutes, may be stuck');
          // Continue with new sync - the stuck one will likely fail
        } else {
          console.log('⏳ Sync already in progress, skipping scheduled sync');
          return NextResponse.json({
            success: true,
            message: 'Sync already in progress',
            skipped: true
          });
        }
      }
    } catch (error) {
      // Sync tables don't exist yet, proceed with sync
      console.log('Sync history not available yet, proceeding...');
    }

    // Execute the sync
    const startTime = Date.now();
    const result = await ecbFullSyncService.executeSync('scheduled');
    const duration = Date.now() - startTime;

    console.log('✅ Scheduled sync completed successfully:', {
      duration: `${(duration / 1000).toFixed(1)}s`,
      newRates: result.statistics.newRatesInserted,
      updatedRates: result.statistics.ratesUpdated,
      unchangedRates: result.statistics.ratesUnchanged,
      deletedRates: result.statistics.ratesDeleted
    });

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      syncId: result.syncId,
      duration,
      statistics: result.statistics
    });

  } catch (error) {
    console.error('💥 Scheduled sync failed:', error);
    
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}