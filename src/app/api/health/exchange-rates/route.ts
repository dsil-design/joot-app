import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/database';
import { dateHelpers, COMMON_HOLIDAYS } from '@/lib/utils/date-helpers';
import { CURRENCY_PAIRS } from '@/lib/types/exchange-rates';

export interface HealthStatus {
  status: 'healthy' | 'stale' | 'degraded' | 'unhealthy';
  lastSyncDate: string;
  ratesAvailable: number;
  dataFreshness: {
    hoursOld: number;
    businessDaysOld: number;
    isStale: boolean;
  };
  coverage: {
    totalPairs: number;
    availablePairs: number;
    missingPairs: string[];
    coveragePercentage: number;
  };
  gaps: {
    totalGaps: number;
    recentGaps: number;
    oldestGap?: string;
  };
  timestamp: string;
}

export interface DetailedHealthCheck {
  basic: HealthStatus;
  detailed: {
    currencyPairStatus: Array<{
      pair: string;
      hasData: boolean;
      lastUpdate: string | null;
      daysSinceUpdate: number;
    }>;
    recentActivity: Array<{
      date: string;
      rateCount: number;
      hasGaps: boolean;
    }>;
  };
}

/**
 * GET /api/health/exchange-rates
 * 
 * Health check endpoint for exchange rate data
 * Returns comprehensive status information about data freshness and coverage
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';
    
    // Get the most recent business day we should have data for
    const expectedLastDate = dateHelpers.getTargetSyncDate(undefined, COMMON_HOLIDAYS.EU_2024);
    
    console.log(`🏥 Health check requested for exchange rates (detailed: ${detailed})`);
    console.log(`📅 Expected last sync date: ${expectedLastDate}`);
    
    // Basic health check
    const healthStatus = await performBasicHealthCheck(expectedLastDate);
    
    if (!detailed) {
      return NextResponse.json(healthStatus, {
        status: getHttpStatusFromHealth(healthStatus.status)
      });
    }
    
    // Detailed health check
    const detailedStatus = await performDetailedHealthCheck(expectedLastDate, healthStatus);
    
    console.log(`🏥 Health check completed in ${Date.now() - startTime}ms - Status: ${healthStatus.status}`);
    
    return NextResponse.json(detailedStatus, {
      status: getHttpStatusFromHealth(healthStatus.status)
    });
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      lastSyncDate: 'unknown',
      ratesAvailable: 0,
      dataFreshness: {
        hoursOld: -1,
        businessDaysOld: -1,
        isStale: true
      },
      coverage: {
        totalPairs: CURRENCY_PAIRS.length,
        availablePairs: 0,
        missingPairs: CURRENCY_PAIRS.map(pair => `${pair[0]}/${pair[1]}`),
        coveragePercentage: 0
      },
      gaps: {
        totalGaps: -1,
        recentGaps: -1
      },
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      ...errorStatus,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 503 });
  }
}

/**
 * Perform basic health check
 */
async function performBasicHealthCheck(expectedLastDate: string): Promise<HealthStatus> {
  // Check for recent data availability
  const { data: recentRates, error } = await db.exchangeRates.getByDateRange(
    'USD',
    'THB',
    expectedLastDate,
    expectedLastDate
  );
  
  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }
  
  const ratesAvailable = recentRates?.length || 0;
  const hasRecentData = ratesAvailable > 0;
  
  // Calculate data freshness
  const dataFreshness = calculateDataFreshness(expectedLastDate, hasRecentData);
  
  // Check coverage across currency pairs
  const coverage = await calculateCoverage(expectedLastDate);
  
  // Check for gaps in recent data
  const gaps = await calculateGaps(expectedLastDate);
  
  // Determine overall health status
  const status = determineHealthStatus(dataFreshness, coverage, gaps);
  
  return {
    status,
    lastSyncDate: hasRecentData ? expectedLastDate : 'unknown',
    ratesAvailable,
    dataFreshness,
    coverage,
    gaps,
    timestamp: new Date().toISOString()
  };
}

/**
 * Perform detailed health check
 */
async function performDetailedHealthCheck(
  expectedLastDate: string, 
  basicStatus: HealthStatus
): Promise<DetailedHealthCheck> {
  
  // Check status for each currency pair
  const currencyPairStatus = await Promise.all(
    CURRENCY_PAIRS.map(async ([from, to]) => {
      try {
        const { data } = await db.exchangeRates.getLatest(from, to);
        
        if (data) {
          const daysSinceUpdate = dateHelpers.getBusinessDayCount(data.date, dateHelpers.getCurrentUTCDate());
          return {
            pair: `${from}/${to}`,
            hasData: true,
            lastUpdate: data.date,
            daysSinceUpdate
          };
        } else {
          return {
            pair: `${from}/${to}`,
            hasData: false,
            lastUpdate: null,
            daysSinceUpdate: -1
          };
        }
      } catch (error) {
        return {
          pair: `${from}/${to}`,
          hasData: false,
          lastUpdate: null,
          daysSinceUpdate: -1
        };
      }
    })
  );
  
  // Check recent activity (last 7 days)
  const recentActivity = await getRecentActivity(expectedLastDate);
  
  return {
    basic: basicStatus,
    detailed: {
      currencyPairStatus,
      recentActivity
    }
  };
}

/**
 * Calculate data freshness metrics
 */
function calculateDataFreshness(expectedLastDate: string, hasRecentData: boolean) {
  const now = new Date();
  const expectedDate = new Date(expectedLastDate);
  
  const hoursOld = Math.round((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60));
  const businessDaysOld = dateHelpers.getBusinessDayCount(expectedLastDate, dateHelpers.getCurrentUTCDate());
  
  // Data is stale if we don't have recent data and it's more than 1 business day old
  const isStale = !hasRecentData && businessDaysOld > 1;
  
  return {
    hoursOld,
    businessDaysOld,
    isStale
  };
}

/**
 * Calculate coverage across currency pairs
 */
async function calculateCoverage(expectedLastDate: string) {
  const totalPairs = CURRENCY_PAIRS.length;
  let availablePairs = 0;
  const missingPairs: string[] = [];
  
  for (const [from, to] of CURRENCY_PAIRS) {
    try {
      const { data } = await db.exchangeRates.getByDate(from, to, expectedLastDate);
      if (data) {
        availablePairs++;
      } else {
        missingPairs.push(`${from}/${to}`);
      }
    } catch (error) {
      missingPairs.push(`${from}/${to}`);
    }
  }
  
  const coveragePercentage = Math.round((availablePairs / totalPairs) * 100);
  
  return {
    totalPairs,
    availablePairs,
    missingPairs,
    coveragePercentage
  };
}

/**
 * Calculate gap information
 */
async function calculateGaps(expectedLastDate: string) {
  try {
    // Look back 7 days for gap analysis
    const startDate = dateHelpers.subtractBusinessDays(expectedLastDate, 7);
    
    const { data: existingRates } = await db.exchangeRates.getByDateRange(
      'USD',
      'THB',
      startDate,
      expectedLastDate
    );
    
    const existingDates = existingRates?.map(rate => rate.date) || [];
    const expectedDates = dateHelpers.getBusinessDays(startDate, expectedLastDate, {
      holidays: COMMON_HOLIDAYS.EU_2024
    });
    
    const missingDates = dateHelpers.findMissingDates(
      existingDates,
      startDate,
      expectedLastDate,
      true,
      COMMON_HOLIDAYS.EU_2024
    );
    
    // Count recent gaps (last 3 days)
    const recentStartDate = dateHelpers.subtractBusinessDays(expectedLastDate, 3);
    const recentGaps = missingDates.filter(date => date >= recentStartDate).length;
    
    const oldestGap = missingDates.length > 0 ? missingDates[0] : undefined;
    
    return {
      totalGaps: missingDates.length,
      recentGaps,
      oldestGap
    };
    
  } catch (error) {
    console.error('Error calculating gaps:', error);
    return {
      totalGaps: -1,
      recentGaps: -1
    };
  }
}

/**
 * Get recent activity data
 */
async function getRecentActivity(expectedLastDate: string) {
  const activities = [];
  
  for (let i = 0; i < 7; i++) {
    const checkDate = dateHelpers.subtractBusinessDays(expectedLastDate, i);
    
    try {
      const { data: rates } = await db.exchangeRates.getByDateRange(
        'USD',
        'THB',
        checkDate,
        checkDate
      );
      
      const rateCount = rates?.length || 0;
      const hasGaps = rateCount === 0;
      
      activities.push({
        date: checkDate,
        rateCount,
        hasGaps
      });
      
    } catch (error) {
      activities.push({
        date: checkDate,
        rateCount: 0,
        hasGaps: true
      });
    }
  }
  
  return activities;
}

/**
 * Determine overall health status
 */
function determineHealthStatus(
  dataFreshness: any,
  coverage: any,
  gaps: any
): 'healthy' | 'stale' | 'degraded' | 'unhealthy' {
  
  // Unhealthy: Major issues
  if (coverage.coveragePercentage < 50 || gaps.totalGaps > 5) {
    return 'unhealthy';
  }
  
  // Degraded: Some issues but functional
  if (coverage.coveragePercentage < 80 || gaps.recentGaps > 2) {
    return 'degraded';
  }
  
  // Stale: Data is old but complete
  if (dataFreshness.isStale) {
    return 'stale';
  }
  
  // Healthy: Everything looks good
  return 'healthy';
}

/**
 * Get HTTP status code from health status
 */
function getHttpStatusFromHealth(status: string): number {
  switch (status) {
    case 'healthy':
      return 200;
    case 'stale':
      return 200; // Still OK, just old data
    case 'degraded':
      return 207; // Partial Content
    case 'unhealthy':
      return 503; // Service Unavailable
    default:
      return 500;
  }
}