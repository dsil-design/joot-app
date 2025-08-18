import { NextRequest, NextResponse } from 'next/server';
import { createCryptoRateService } from '@/lib/services/crypto-rate-service';

function getPreviousDay(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (!authHeader || authHeader !== expectedAuth) {
    console.error('Unauthorized crypto sync attempt:', {
      provided: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting crypto rates sync...');
    
    const cryptoService = createCryptoRateService();
    
    // Get yesterday's date (crypto markets operate 24/7)
    const targetDate = getPreviousDay();
    
    console.log(`📅 Target date: ${targetDate}`);
    
    const result = await cryptoService.syncBitcoinRates(targetDate);
    
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ Crypto sync completed successfully in ${(duration / 1000).toFixed(1)}s`);
      
      return NextResponse.json({
        success: true,
        message: `Synced BTC rates for ${result.date}: $${result.btcPrice?.toLocaleString()}`,
        data: {
          date: result.date,
          btcPrice: result.btcPrice,
          ratesInserted: result.ratesInserted,
          duration: result.duration,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error(`❌ Crypto sync failed: ${result.errors.join(', ')}`);
      
      return NextResponse.json({
        success: false,
        message: `Failed to sync BTC rates for ${result.date}`,
        errors: result.errors,
        data: {
          date: result.date,
          duration: result.duration,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Crypto sync crashed:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      duration,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}