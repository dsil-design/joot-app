import { NextRequest, NextResponse } from 'next/server';
import { dailySyncService } from '@/lib/services/daily-sync-service';
import { transactionRateGapService } from '@/lib/services/transaction-rate-gap-service';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncNotificationService } from '@/lib/services/sync-notification-service';
import { emailSyncService } from '@/lib/services/email-sync-service';

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

async function createSyncHistoryRecord(syncType: 'scheduled' | 'manual'): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('sync_history')
      .insert({
        sync_type: syncType,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create sync_history record:', error);
      return null;
    }
    return data.id;
  } catch (error) {
    console.error('Error creating sync_history record:', error);
    return null;
  }
}

async function completeSyncHistoryRecord(
  syncHistoryId: string | null,
  success: boolean,
  durationMs: number,
  stats: {
    totalGaps?: number;
    ratesInserted?: number;
    ratesSkipped?: number;
    coveragePercentage?: number;
    errorCount?: number;
  },
  errorMessage?: string
): Promise<void> {
  if (!syncHistoryId) return;

  try {
    const supabase = createServiceRoleClient();
    await supabase
      .from('sync_history')
      .update({
        status: success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        new_rates_inserted: stats.ratesInserted ?? 0,
        rates_updated: 0,
        rates_deleted: 0,
        rates_unchanged: stats.ratesSkipped ?? 0,
        filtered_rates: stats.totalGaps ?? 0,
        error_message: errorMessage ?? null
      })
      .eq('id', syncHistoryId);
  } catch (error) {
    console.error('Error updating sync_history record:', error);
  }
}

export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let syncHistoryId: string | null = null;
  const results = {
    cleanup: { success: false, message: '', data: null as any },
    dailySync: { success: false, message: '', data: null as any },
    surgicalSync: { success: false, message: '', data: null as any },
    coverage: { success: false, message: '', data: null as any },
    emailSync: { success: false, message: '', data: null as any }
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

    // 2. Create sync_history record
    syncHistoryId = await createSyncHistoryRecord('scheduled');
    if (syncHistoryId) {
      console.log(`📝 Created sync_history record: ${syncHistoryId}`);
    }

    // 3. Check if auto-sync is enabled
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

    // 4. Proactive daily sync — fetch today's ECB rates regardless of transaction gaps
    if (autoSyncEnabled) {
      try {
        console.log('📡 Running proactive daily rate sync...');
        const dailyResult = await dailySyncService.executeDailySync({ forceUpdate: false });

        results.dailySync = {
          success: dailyResult.success,
          message: dailyResult.skippedReason
            ? `Skipped: ${dailyResult.skippedReason}`
            : dailyResult.success
              ? `Inserted ${dailyResult.ratesInserted} rates for ${dailyResult.targetDate}`
              : `Failed for ${dailyResult.targetDate}: ${dailyResult.errors.map(e => e.message).join('; ')}`,
          data: {
            targetDate: dailyResult.targetDate,
            ratesInserted: dailyResult.ratesInserted,
            gapsFilled: dailyResult.gapsFilled,
            skippedReason: dailyResult.skippedReason,
            duration: dailyResult.duration,
            errors: dailyResult.errors.length > 0 ? dailyResult.errors.slice(0, 5) : undefined
          }
        };

        console.log('✅ Proactive daily sync:', results.dailySync.message);
      } catch (error) {
        console.error('⚠️  Proactive daily sync failed (non-critical):', error);
        results.dailySync = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: null
        };
      }
    }

    // 5. Execute surgical sync
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
            : `Surgical sync completed with ${syncResult.errors.length} error(s): ${syncResult.errors.slice(0, 3).map(e => `${e.currency}/${e.date}: ${e.message}`).join('; ')}`,
          data: {
            totalGaps: syncResult.totalGaps,
            ratesInserted: syncResult.ratesInserted,
            ratesSkipped: syncResult.ratesSkipped,
            errorCount: syncResult.errors.length,
            duration: syncResult.duration,
            details: syncResult.details,
            errors: syncResult.errors.slice(0, 10)
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
        const errorStack = error instanceof Error ? error.stack : undefined;

        results.surgicalSync = {
          success: false,
          message: errorMessage,
          data: { errorStack }
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

    // 5a. Sync non-ECB currencies (e.g., VND)
    if (autoSyncEnabled) {
      try {
        console.log('📡 Syncing non-ECB currency rates...');
        const { exchangeRateAPIService } = await import('@/lib/services/exchangerate-api-service');
        const nonECBResult = await exchangeRateAPIService.syncNonECBRates();
        console.log(`  ✅ Non-ECB sync: ${nonECBResult.inserted} rates inserted`);
        if (nonECBResult.errors.length > 0) {
          console.warn(`  ⚠️  Non-ECB errors: ${nonECBResult.errors.join(', ')}`);
        }
      } catch (error) {
        console.error('⚠️  Non-ECB rate sync failed (non-critical):', error);
      }
    }

    // 5. Get coverage stats for reporting
    let coveragePercentage: number | undefined;
    try {
      console.log('📊 Getting coverage stats...');
      const coverage = await transactionRateGapService.getCoverageStats();
      coveragePercentage = coverage.coveragePercentage;
      results.coverage = {
        success: true,
        message: `Coverage: ${coverage.coveragePercentage}%`,
        data: coverage
      };
      console.log(`  ✅ Coverage: ${coverage.coveragePercentage}% (${coverage.transactionsWithRates}/${coverage.totalNonUSDTransactions})`);
    } catch (error) {
      console.error('⚠️  Coverage stats failed (non-critical):', error);
      results.coverage = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }

    // 6. Email sync (if configured)
    if (process.env.ICLOUD_EMAIL && process.env.ICLOUD_APP_PASSWORD) {
      try {
        console.log('📧 Syncing emails from iCloud...');

        // Get the first user (single-user app for now)
        const supabase = createServiceRoleClient();
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .single();

        if (users) {
          const emailResult = await emailSyncService.executeSync(users.id);

          results.emailSync = {
            success: emailResult.success,
            message: emailResult.message || `Synced ${emailResult.synced} emails`,
            data: {
              synced: emailResult.synced,
              errors: emailResult.errors,
              lastUid: emailResult.lastUid
            }
          };

          console.log(`  ✅ Email sync: ${emailResult.synced} emails synced`);
        } else {
          results.emailSync = {
            success: false,
            message: 'No user found for email sync',
            data: null
          };
        }
      } catch (error) {
        console.error('⚠️  Email sync failed (non-critical):', error);
        results.emailSync = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: null
        };
      }
    } else {
      results.emailSync = {
        success: true,
        message: 'Email sync not configured (skipped)',
        data: { skipped: true }
      };
    }

    // 6. Generate proposals for pending queue items without proposals
    try {
      console.log('🤖 Generating transaction proposals...');
      const { createServiceRoleClient: createSR } = await import('@/lib/supabase/server');
      const proposalClient = createSR();

      // Fetch all users with pending imports
      const { data: users } = await proposalClient
        .from('statement_uploads')
        .select('user_id')
        .in('status', ['ready_for_review', 'in_review'])

      if (users && users.length > 0) {
        const { generateAndStoreProposals, prefetchRuleEngineContext } = await import('@/lib/proposals/proposal-service');
        const { fetchStatementQueueItems } = await import('@/lib/imports/statement-queue-builder');
        const { fetchEmailQueueItems } = await import('@/lib/imports/email-queue-builder');

        const uniqueUserIds = [...new Set(users.map((u) => u.user_id))];
        let totalGenerated = 0;

        for (const userId of uniqueUserIds.slice(0, 10)) {
          try {
            const [stmtItems, emailItems] = await Promise.all([
              fetchStatementQueueItems(proposalClient, userId, {}),
              fetchEmailQueueItems(proposalClient, userId, {}),
            ]);

            const newItems = [...stmtItems, ...emailItems].filter((i) => i.isNew);
            if (newItems.length === 0) continue;

            const inputs = newItems.slice(0, 50).map((item) => {
              const parts = item.id.split(':');
              return {
                compositeId: item.id,
                sourceType: (item.source || 'statement') as 'statement' | 'email' | 'merged',
                statementUploadId: item.statementUploadId || (parts[0] === 'stmt' ? parts[1] : undefined),
                suggestionIndex: parts[0] === 'stmt' ? parseInt(parts[2], 10) : undefined,
                emailTransactionId: parts[0] === 'email' ? parts[1] : undefined,
                description: item.statementTransaction.description,
                amount: item.statementTransaction.amount,
                currency: item.statementTransaction.currency,
                date: item.statementTransaction.date,
                paymentMethodId: item.paymentMethod?.id,
                paymentMethodName: item.paymentMethod?.name,
              };
            });

            const result = await generateAndStoreProposals(proposalClient, userId, inputs);
            totalGenerated += result.generated;
          } catch (userErr) {
            console.error(`Proposal generation failed for user ${userId}:`, userErr);
          }
        }
        console.log(`  ✅ Generated ${totalGenerated} proposals`);
      } else {
        console.log('  No users with pending imports');
      }
    } catch (proposalErr) {
      console.error('⚠️  Proposal generation failed (non-critical):', proposalErr);
    }

    const duration = Date.now() - startTime;
    console.log(`✨ Daily sync completed in ${(duration / 1000).toFixed(1)}s`);

    // 7. Complete sync_history record
    // Collect error details from surgical sync for logging
    const surgicalErrors = results.surgicalSync.data?.details?.errors
      ?? results.surgicalSync.data?.errors
      ?? [];
    const surgicalErrorMessage = !results.surgicalSync.success
      ? [
          results.surgicalSync.message,
          ...(Array.isArray(surgicalErrors)
            ? surgicalErrors.slice(0, 5).map((e: any) =>
                typeof e === 'string' ? e : `${e.currency}/${e.date}: ${e.message}`)
            : [])
        ].filter(Boolean).join(' | ') || 'Surgical sync failed (no details captured)'
      : undefined;

    await completeSyncHistoryRecord(
      syncHistoryId,
      results.surgicalSync.success,
      duration,
      {
        totalGaps: results.surgicalSync.data?.totalGaps ?? 0,
        ratesInserted: results.surgicalSync.data?.ratesInserted ?? 0,
        ratesSkipped: results.surgicalSync.data?.ratesSkipped ?? 0,
        coveragePercentage,
        errorCount: results.surgicalSync.data?.errorCount ?? 0
      },
      surgicalErrorMessage
    );

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Surgical sync job failed:', error);

    // Record failure in sync_history
    await completeSyncHistoryRecord(
      syncHistoryId,
      false,
      duration,
      {},
      errorMessage
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
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