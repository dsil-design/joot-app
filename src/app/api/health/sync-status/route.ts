import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Sync Health Status Endpoint
 * Returns health information about exchange rate synchronization
 * Can be used for uptime monitoring services
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Get latest sync
    const { data: latestSync, error: latestError } = await supabase
      .from('sync_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (latestError) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Unable to fetch sync history',
          error: latestError.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Get recent syncs (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSyncs, error: recentError } = await supabase
      .from('sync_history')
      .select('status, started_at, completed_at, error_message')
      .gte('started_at', oneDayAgo)
      .order('started_at', { ascending: false });

    if (recentError) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Unable to fetch recent sync history',
          error: recentError.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Calculate health metrics
    const totalSyncs = recentSyncs?.length || 0;
    const failedSyncs = recentSyncs?.filter(s => s.status === 'failed').length || 0;
    const successfulSyncs = recentSyncs?.filter(s => s.status === 'completed').length || 0;
    const runningSyncs = recentSyncs?.filter(s => s.status === 'running').length || 0;
    const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs * 100).toFixed(1) : '0';

    // Check if latest sync is healthy
    const latestSyncTime = new Date(latestSync.started_at);
    const timeSinceLastSync = Date.now() - latestSyncTime.getTime();
    const hoursSinceLastSync = (timeSinceLastSync / (1000 * 60 * 60)).toFixed(1);

    // Determine overall health status
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    const issues: string[] = [];

    // Check for stuck running syncs
    if (runningSyncs > 0) {
      healthStatus = 'warning';
      issues.push(`${runningSyncs} sync(s) currently running`);
    }

    // Check if latest sync failed
    if (latestSync.status === 'failed') {
      healthStatus = 'critical';
      issues.push(`Latest sync failed: ${latestSync.error_message}`);
    }

    // Check if last sync was too long ago (more than 25 hours)
    if (timeSinceLastSync > 25 * 60 * 60 * 1000) {
      healthStatus = 'critical';
      issues.push(`No sync in ${hoursSinceLastSync} hours`);
    }

    // Check recent failure rate
    if (totalSyncs > 0 && failedSyncs / totalSyncs > 0.5) {
      healthStatus = 'critical';
      issues.push(`High failure rate: ${(failedSyncs / totalSyncs * 100).toFixed(0)}%`);
    }

    // Check if rates are up to date
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRates, error: ratesError } = await supabase
      .from('exchange_rates')
      .select('date')
      .eq('date', today)
      .limit(1);

    const hasRatesForToday = !ratesError && todayRates && todayRates.length > 0;

    if (!hasRatesForToday && new Date().getUTCHours() >= 19) {
      // If it's after 19:00 UTC (1 hour after scheduled sync) and we don't have today's rates
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      issues.push(`No exchange rates for ${today} (sync may have failed)`);
    }

    const httpStatus = healthStatus === 'healthy' ? 200 :
                      healthStatus === 'warning' ? 200 : 500;

    return NextResponse.json({
      status: healthStatus,
      issues: issues.length > 0 ? issues : undefined,
      latestSync: {
        id: latestSync.id,
        type: latestSync.sync_type,
        status: latestSync.status,
        startedAt: latestSync.started_at,
        completedAt: latestSync.completed_at,
        duration: latestSync.duration_ms,
        error: latestSync.error_message,
        statistics: {
          newRates: latestSync.new_rates_inserted,
          updated: latestSync.rates_updated,
          deleted: latestSync.rates_deleted
        }
      },
      metrics: {
        last24Hours: {
          total: totalSyncs,
          successful: successfulSyncs,
          failed: failedSyncs,
          running: runningSyncs,
          successRate: `${successRate}%`
        },
        timeSinceLastSync: {
          milliseconds: timeSinceLastSync,
          hours: hoursSinceLastSync
        },
        hasRatesForToday
      },
      timestamp: new Date().toISOString()
    }, { status: httpStatus });

  } catch (error) {
    console.error('Sync health check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
