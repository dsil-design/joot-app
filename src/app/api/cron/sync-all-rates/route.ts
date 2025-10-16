import { NextRequest, NextResponse } from 'next/server';
import { ecbFullSyncService } from '@/lib/services/ecb-full-sync-service';
import { dailySyncService } from '@/lib/services/daily-sync-service';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Consolidated ECB Exchange Rates Sync
 * Combines both ECB full sync and daily sync services
 * Runs at 18:00 UTC daily
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    cleanup: { success: false, message: '', data: null as any },
    ecbFullSync: { success: false, message: '', data: null as any },
    dailySync: { success: false, message: '', data: null as any }
  };

  try {
    console.log('🚀 Starting ECB rates sync job at', new Date().toISOString());
    const isWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;

    // 0. Cleanup stuck syncs first (before starting new syncs)
    try {
      console.log('🧹 Cleaning up stuck syncs...');
      const supabase = createServiceRoleClient();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: stuckSyncs, error: findError } = await supabase
        .from('sync_history')
        .select('id, sync_type, started_at')
        .eq('status', 'running')
        .lt('started_at', tenMinutesAgo);

      if (!findError && stuckSyncs && stuckSyncs.length > 0) {
        console.log(`  Found ${stuckSyncs.length} stuck sync(s) to clean up`);
        let cleanedUp = 0;

        for (const sync of stuckSyncs) {
          const runningDuration = Date.now() - new Date(sync.started_at).getTime();
          await supabase
            .from('sync_history')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: 'Sync exceeded timeout limit and was automatically marked as failed',
              duration_ms: runningDuration
            })
            .eq('id', sync.id);
          cleanedUp++;
        }

        results.cleanup = {
          success: true,
          message: `Cleaned up ${cleanedUp} stuck sync(s)`,
          data: { cleanedUp, total: stuckSyncs.length }
        };
        console.log(`  ✅ Cleaned up ${cleanedUp} stuck syncs`);
      } else {
        results.cleanup = {
          success: true,
          message: 'No stuck syncs found',
          data: { cleanedUp: 0 }
        };
      }
    } catch (error) {
      console.error('⚠️  Cleanup failed (non-critical):', error);
      results.cleanup = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }

    // 1. Execute ECB Full Sync (runs daily)
    try {
      console.log('📊 Executing ECB full sync...');
      const supabase = createServiceRoleClient();

      // Check if auto-sync is enabled
      let autoSyncEnabled = true;
      try {
        const { data: config } = await supabase.rpc('get_sync_configuration' as any);
        if (config?.[0]?.auto_sync_enabled === false) {
          console.log('⏸️  ECB auto-sync is disabled');
          results.ecbFullSync = {
            success: true,
            message: 'Auto-sync disabled',
            data: { skipped: true }
          };
          autoSyncEnabled = false;
        }
      } catch (error) {
        console.log('Sync configuration not available, proceeding...');
      }

      if (autoSyncEnabled) {
        // Check if sync is already running
        try {
          const { data: latestSync } = await supabase.rpc('get_latest_sync_status' as any);
          if (latestSync?.[0]?.status === 'running') {
            const runningTime = Date.now() - new Date(latestSync[0].started_at).getTime();
            if (runningTime < 10 * 60 * 1000) {
              console.log('⏳ ECB sync already in progress');
              results.ecbFullSync = {
                success: true,
                message: 'Sync already in progress',
                data: { skipped: true }
              };
              autoSyncEnabled = false;
            }
          }
        } catch (error) {
          console.log('Sync history not available, proceeding...');
        }

        if (autoSyncEnabled) {
          const ecbResult = await ecbFullSyncService.executeSync('scheduled');
          results.ecbFullSync = {
            success: true,
            message: 'ECB full sync completed successfully',
            data: {
              syncId: ecbResult.syncId,
              statistics: ecbResult.statistics
            }
          };
          console.log('✅ ECB full sync completed:', ecbResult.statistics);
        }
      }
    } catch (error) {
      console.error('❌ ECB full sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      results.ecbFullSync = {
        success: false,
        message: errorMessage,
        data: {
          error: errorMessage,
          stack: errorStack,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        }
      };
      console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }

    // 2. Execute Daily Sync Service (weekdays only for gap filling)
    if (isWeekday) {
      try {
        console.log('📈 Executing daily sync service (gap filling)...');
        const dailyResult = await dailySyncService.executeDailySync({
          fillGaps: true,
          maxGapDays: 7
        });
        
        results.dailySync = {
          success: dailyResult.success,
          message: dailyResult.success ? 'Daily sync completed' : 'Daily sync failed',
          data: {
            targetDate: dailyResult.targetDate,
            ratesInserted: dailyResult.ratesInserted,
            gapsFilled: dailyResult.gapsFilled,
            errorCount: dailyResult.errors.length,
            skippedReason: dailyResult.skippedReason
          }
        };
        console.log('✅ Daily sync completed:', results.dailySync.data);
      } catch (error) {
        console.error('❌ Daily sync failed:', error);
        results.dailySync = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: null
        };
      }
    } else {
      results.dailySync = {
        success: true,
        message: 'Skipped (weekend)',
        data: { skipped: true }
      };
    }

    const duration = Date.now() - startTime;
    console.log(`✨ ECB sync job completed in ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      message: 'ECB sync completed',
      duration,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('💥 ECB sync job failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        results,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}