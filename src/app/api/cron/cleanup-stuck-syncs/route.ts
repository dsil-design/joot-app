import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncNotificationService } from '@/lib/services/sync-notification-service';

/**
 * Cleanup Stuck Syncs Cron Job
 * Runs every 10 minutes to mark stuck "running" syncs as failed
 * Prevents database pollution from timed-out sync jobs
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('🧹 Starting stuck sync cleanup job at', new Date().toISOString());

  try {
    const supabase = createServiceRoleClient();

    // Find all syncs that have been "running" for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: stuckSyncs, error: findError } = await supabase
      .from('sync_history')
      .select('id, sync_type, started_at')
      .eq('status', 'running')
      .lt('started_at', tenMinutesAgo);

    if (findError) {
      console.error('❌ Error finding stuck syncs:', findError);
      return NextResponse.json(
        {
          success: false,
          error: findError.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    if (!stuckSyncs || stuckSyncs.length === 0) {
      console.log('✅ No stuck syncs found');
      return NextResponse.json({
        success: true,
        message: 'No stuck syncs found',
        cleanedUp: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`Found ${stuckSyncs.length} stuck sync(s) to clean up`);

    // Mark each stuck sync as failed
    let cleanedUp = 0;
    const errors: string[] = [];

    for (const sync of stuckSyncs) {
      const syncStartTime = new Date(sync.started_at);
      const runningDuration = Date.now() - syncStartTime.getTime();

      console.log(`  Cleaning up: ${sync.sync_type} (ID: ${sync.id})`);
      console.log(`  Started: ${sync.started_at}`);
      console.log(`  Running for: ${Math.round(runningDuration / 1000 / 60)} minutes`);

      const { error: updateError } = await supabase
        .from('sync_history')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Sync exceeded timeout limit and was automatically marked as failed',
          duration_ms: runningDuration
        })
        .eq('id', sync.id);

      if (updateError) {
        console.error(`  ❌ Failed to update sync ${sync.id}:`, updateError.message);
        errors.push(`${sync.id}: ${updateError.message}`);
      } else {
        console.log(`  ✅ Marked as failed`);
        cleanedUp++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✨ Cleanup completed: ${cleanedUp}/${stuckSyncs.length} syncs cleaned up in ${duration}ms`);

    // Send notification if any stuck syncs were found
    if (cleanedUp > 0) {
      try {
        await syncNotificationService.notifyWarning(
          'cleanup-job',
          `Found and cleaned up ${cleanedUp} stuck sync job${cleanedUp > 1 ? 's' : ''}`,
          {
            cleanedUp,
            total: stuckSyncs.length,
            syncIds: stuckSyncs.map(s => s.id),
            details: stuckSyncs.map(s => ({
              id: s.id,
              type: s.sync_type,
              startedAt: s.started_at,
              runningMinutes: Math.round((Date.now() - new Date(s.started_at).getTime()) / 1000 / 60)
            }))
          }
        );
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedUp} stuck sync(s)`,
      cleanedUp,
      total: stuckSyncs.length,
      errors: errors.length > 0 ? errors : undefined,
      duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('💥 Cleanup job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
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
