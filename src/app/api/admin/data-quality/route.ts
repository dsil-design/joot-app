import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring-service';
import { createAdminClient, isAdminAvailable } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  // Check admin authentication
  const { user, response } = await requireAdminAuth(request);
  if (response) return response;

  // Check if admin operations are available in this environment
  if (!isAdminAvailable()) {
    console.warn('⚠️ Admin operations not available - missing or dummy environment variables');
    return NextResponse.json(
      {
        success: false,
        error: 'Admin operations not available in this environment',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
  
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