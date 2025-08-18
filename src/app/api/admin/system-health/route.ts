import { NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring-service';

export async function GET() {
  try {
    console.log('📊 Getting system health metrics...');
    
    const health = await monitoringService.getSystemHealth();
    
    console.log(`📊 System health: ${health.status} (${health.ratesAvailable} rates, ${health.gapsDetected} gaps)`);
    
    // Set cache headers to prevent excessive polling
    const response = NextResponse.json(health);
    response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    
    return response;
    
  } catch (error) {
    console.error('❌ System health check failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      status: 'critical',
      lastSyncDate: null,
      ratesAvailable: 0,
      gapsDetected: 0,
      errorRate: 100,
      uptimePercent: 0,
      lastError: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}