import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoring-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ 
        error: 'Limit must be between 1 and 100' 
      }, { status: 400 });
    }
    
    console.log(`📊 Getting sync history (limit: ${limit})...`);
    
    const history = await monitoringService.getSyncHistory(limit);
    
    console.log(`📊 Retrieved ${history.length} sync history entries`);
    
    // Set cache headers
    const response = NextResponse.json(history);
    response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    
    return response;
    
  } catch (error) {
    console.error('❌ Sync history retrieval failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}