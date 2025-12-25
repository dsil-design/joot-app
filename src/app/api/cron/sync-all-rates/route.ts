import { NextRequest, NextResponse } from 'next/server';
import { dailySyncService } from '@/lib/services/daily-sync-service';
import { transactionRateGapService } from '@/lib/services/transaction-rate-gap-service';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncNotificationService } from '@/lib/services/sync-notification-service';

/**
 * Surgical Exchange Rates Sync
 *
 * Uses the "surgical alignment" approach:
 * - Detects gaps between transactions and exchange rates
 * - Only fetches rates that are actually needed
 * - Handles weekends/holidays automatically (interpolates from nearest business day)
 * - Works for all currencies (ECB and non-ECB)
 *
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
    surgicalSync: { success: false, message: '', data: null as any },
    coverage: { success: false, message: '', data: null as any }
  };

  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

    console.log('🎯 Starting surgical exchange rate sync at', now.toISOString());
    console.log(`📅 Day: ${dayName}`);

    // 1. Cleanup stuck syncs first (before starting new syncs)
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

    // 2. Check if auto-sync is enabled
    let autoSyncEnabled = true;
    try {
      const supabase = createServiceRoleClient();
      const { data: config } = await supabase.rpc('get_sync_configuration' as any);
      if (config?.[0]?.auto_sync_enabled === false) {
        console.log('⏸️  Auto-sync is disabled');
        results.surgicalSync = {
          success: true,
          message: 'Auto-sync disabled',
          data: { skipped: true }
        };
        autoSyncEnabled = false;
      }
    } catch {
      console.log('Sync configuration not available, proceeding...');
    }

    // 3. Execute surgical sync
    if (autoSyncEnabled) {
      console.log('🔄 Executing surgical sync...');

      try {
        const syncResult = await dailySyncService.executeSurgicalSync(false);

        results.surgicalSync = {
          success: syncResult.success,
          message: syncResult.success
            ? syncResult.totalGaps === 0
              ? 'No gaps found - all transactions have rates'
              : `Filled ${syncResult.ratesInserted} rate gaps`
            : 'Surgical sync completed with errors',
          data: {
            totalGaps: syncResult.totalGaps,
            ratesInserted: syncResult.ratesInserted,
            ratesSkipped: syncResult.ratesSkipped,
            errorCount: syncResult.errors.length,
            duration: syncResult.duration,
            details: syncResult.details
          }
        };

        console.log('✅ Surgical sync completed:', results.surgicalSync.data);

        // Send notifications on failure
        if (!syncResult.success && syncResult.errors.length > 0) {
          try {
            await syncNotificationService.notifyFailure(
              'surgical-sync-' + now.toISOString(),
              `Surgical sync had ${syncResult.errors.length} errors`,
              {
                syncType: 'surgical',
                dayOfWeek: dayName,
                errors: syncResult.errors.slice(0, 5) // First 5 errors
              }
            );
          } catch (notifError) {
            console.error('Failed to send failure notification:', notifError);
          }
        }

        // Send recovery notification if previous sync failed
        if (syncResult.success && syncResult.ratesInserted > 0) {
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
                'surgical-sync-' + now.toISOString(),
                {
                  newRatesInserted: syncResult.ratesInserted,
                  ratesUpdated: 0,
                  gapsFilled: syncResult.ratesInserted
                },
                true
              );
            }
          } catch (notifError) {
            console.error('Failed to send success notification:', notifError);
          }
        }

      } catch (error) {
        console.error('❌ Surgical sync failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.surgicalSync = {
          success: false,
          message: errorMessage,
          data: null
        };

        // Send failure notification
        try {
          await syncNotificationService.notifyFailure(
            'surgical-sync-' + now.toISOString(),
            errorMessage,
            {
              syncType: 'surgical',
              dayOfWeek: dayName,
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
      }
    }

    // 4. Get coverage stats for reporting
    try {
      console.log('📊 Getting coverage stats...');
      const coverage = await transactionRateGapService.getCoverageStats();
      results.coverage = {
        success: true,
        message: `Coverage: ${coverage.coveragePercentage}%`,
        data: coverage
      };
      console.log(`  ✅ Coverage: ${coverage.coveragePercentage}% (${coverage.transactionsWithRates}/${coverage.totalTransactionsNeedingRates})`);
    } catch (error) {
      console.error('⚠️  Coverage stats failed (non-critical):', error);
      results.coverage = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }

    const duration = Date.now() - startTime;
    console.log(`✨ Surgical sync completed in ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: results.surgicalSync.success,
      message: results.surgicalSync.message,
      syncStrategy: {
        type: 'surgical',
        description: 'Only fetches rates needed for actual transactions',
        dayOfWeek: dayName
      },
      duration,
      results,
      timestamp: now.toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const dayOfWeek = new Date().getDay();
    console.error('💥 Surgical sync job failed:', error);

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