import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring-service';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting data quality metrics...');
    
    const metrics = await monitoringService.getDataQualityMetrics();
    
    console.log(`📊 Data quality: ${metrics.totalRecords} total records, ${metrics.qualityScore}% quality score`);
    
    // Set cache headers for reasonable refresh rate
    const response = NextResponse.json(metrics);
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    
    return response;
    
  } catch (error) {
    console.error('❌ Data quality check failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}