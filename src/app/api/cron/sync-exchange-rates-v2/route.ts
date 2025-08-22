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

    // Check if auto-sync is enabled
    const supabase = await createClient();
    const { data: config, error: configError } = await supabase
      .from('sync_configuration')
      .select('auto_sync_enabled')
      .single();

    if (configError) {
      console.error('Failed to load sync configuration:', configError);
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    if (!config?.auto_sync_enabled) {
      console.log('⏸️  Auto-sync is disabled, skipping scheduled sync');
      return NextResponse.json({
        success: true,
        message: 'Auto-sync disabled',
        skipped: true
      });
    }

    // Check if sync is already running
    const { data: latestSync } = await supabase
      .from('sync_history')
      .select('status, started_at')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (latestSync?.status === 'running') {
      // Check if it's been running too long (over 10 minutes is suspicious)
      const runningTime = Date.now() - new Date(latestSync.started_at).getTime();
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