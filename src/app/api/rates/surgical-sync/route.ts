import { NextRequest, NextResponse } from 'next/server';
import { dailySyncService } from '@/lib/services/daily-sync-service';
import { transactionRateGapService } from '@/lib/services/transaction-rate-gap-service';
import { surgicalBackfillService } from '@/lib/services/surgical-backfill-service';

/**
 * Surgical Exchange Rate Sync API
 *
 * This endpoint implements the "surgical exchange rate alignment" approach:
 * - Only fetches rates that are actually needed for transaction conversion
 * - No pre-fetching, no "active windows"
 * - Exact alignment between transactions and rates
 *
 * GET: Get gap analysis (what rates are missing)
 * POST: Execute surgical sync to fill gaps
 */

export async function GET(request: NextRequest) {
  // Verify authorization (using cron secret or anon key for testing)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow cron secret or skip auth in development
  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    process.env.NODE_ENV === 'development';

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'gaps';

    if (action === 'coverage') {
      // Get coverage statistics
      const stats = await transactionRateGapService.getCoverageStats();
      return NextResponse.json({
        success: true,
        action: 'coverage',
        data: stats,
        timestamp: new Date().toISOString()
      });
    }

    // Default: detect gaps
    const gapResult = await transactionRateGapService.detectGaps();

    return NextResponse.json({
      success: gapResult.success,
      action: 'gaps',
      data: {
        totalMissingRates: gapResult.totalMissingRates,
        totalTransactionsAffected: gapResult.totalTransactionsNeedingRates,
        byCurrency: gapResult.byCurrency,
        gaps: gapResult.gaps.slice(0, 50), // Limit to first 50 for readability
        hasMoreGaps: gapResult.gaps.length > 50
      },
      error: gapResult.error,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Gap detection failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow cron secret or skip auth in development
  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    process.env.NODE_ENV === 'development';

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse options from request body
    let options: {
      dryRun?: boolean;
      maxGapsPerRun?: number;
    } = {};

    try {
      const body = await request.json();
      options = body || {};
    } catch {
      // No body provided, use defaults
    }

    console.log('🎯 Starting surgical sync via API...');
    console.log('   Options:', options);

    // Execute surgical sync
    const result = await surgicalBackfillService.executeBackfill({
      dryRun: options.dryRun ?? false,
      maxGapsPerRun: options.maxGapsPerRun,
      skipExisting: true
    });

    return NextResponse.json({
      success: result.success,
      action: 'sync',
      data: {
        totalGaps: result.totalGaps,
        ratesInserted: result.ratesInserted,
        ratesSkipped: result.ratesSkipped,
        errorCount: result.errors.length,
        duration: result.duration,
        details: result.details
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Surgical sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
