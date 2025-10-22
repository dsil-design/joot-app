import { NextRequest, NextResponse } from 'next/server';
import { ecbFullSyncService } from '@/lib/services/ecb-full-sync-service';
import { dailySyncService } from '@/lib/services/daily-sync-service';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncNotificationService } from '@/lib/services/sync-notification-service';

/**
 * Consolidated ECB Exchange Rates Sync
 * Day-based sync strategy:
 * - Monday-Friday: Fast daily sync (previous business day rates)
 * - Sunday: Full maintenance sync (complete historical verification)
 * - Saturday: Skip (no new ECB data published)
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
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    console.log('🚀 Starting ECB rates sync job at', now.toISOString());
    console.log(`📅 Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}`);

    // Skip entirely on Saturday (no new ECB data, maintenance on Sunday)
    if (isSaturday) {
      console.log('⏭️  Skipping Saturday - no new ECB data published on weekends');
      return NextResponse.json({
        success: true,
        message: 'Saturday sync skipped (no new data)',
        skipped: true,
        duration: Date.now() - startTime,
        timestamp: now.toISOString()
      });
    }

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

    // SUNDAY: Full maintenance sync (complete historical verification)
    if (isSunday) {
      console.log('🔧 SUNDAY MAINTENANCE: Running full ECB historical sync...');

      try {
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

        // Mark daily sync as skipped for Sunday
        results.dailySync = {
          success: true,
          message: 'Skipped on Sunday (full sync runs instead)',
          data: { skipped: true, reason: 'sunday_maintenance' }
        };

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
    }

    // MONDAY-FRIDAY: Fast daily sync (previous business day rates only)
    else if (isWeekday) {
      console.log('📈 WEEKDAY: Running fast daily sync for previous business day...');

      try {
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

        // Send success notification if recovering from failure
        if (dailyResult.success) {
          try {
            const supabase = createServiceRoleClient();
            const { data: recentSyncs } = await supabase
              .from('sync_history')
              .select('status')
              .eq('sync_type', 'scheduled')
              .order('started_at', { ascending: false })
              .limit(2);

            const wasAfterFailure = recentSyncs && recentSyncs.length >= 2 &&
                                   recentSyncs[1].status === 'failed';

            if (wasAfterFailure) {
              await syncNotificationService.notifySuccess(
                'weekday-sync-' + new Date().toISOString(),
                {
                  newRatesInserted: dailyResult.ratesInserted,
                  ratesUpdated: 0,
                  gapsFilled: dailyResult.gapsFilled
                },
                true
              );
            }
          } catch (notifError) {
            console.error('Failed to send success notification:', notifError);
          }
        }

        // Mark full sync as skipped for weekdays
        results.ecbFullSync = {
          success: true,
          message: 'Skipped on weekday (daily sync runs instead)',
          data: { skipped: true, reason: 'weekday_fast_sync' }
        };

      } catch (error) {
        console.error('❌ Daily sync failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.dailySync = {
          success: false,
          message: errorMessage,
          data: null
        };

        // Send failure notification
        try {
          await syncNotificationService.notifyFailure(
            'weekday-sync-' + new Date().toISOString(),
            errorMessage,
            {
              syncType: 'weekday_fast_sync',
              dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
              error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
              } : error
            }
          );
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }

        // Mark full sync as not run
        results.ecbFullSync = {
          success: true,
          message: 'Not run (weekday)',
          data: { skipped: true, reason: 'weekday' }
        };
      }
    }

    const duration = Date.now() - startTime;
    const syncType = isSunday ? 'Sunday Maintenance' : 'Weekday Fast Sync';
    console.log(`✨ ${syncType} completed in ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      message: `ECB sync completed (${syncType})`,
      syncStrategy: {
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        syncType: isSunday ? 'full_maintenance' : 'daily_fast',
        reason: isSunday
          ? 'Weekly full sync to verify all historical data'
          : 'Daily sync for previous business day rates'
      },
      duration,
      results,
      timestamp: now.toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const dayOfWeek = new Date().getDay();
    console.error('💥 ECB sync job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
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