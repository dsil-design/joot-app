import { NextRequest, NextResponse } from 'next/server';
import { dailySyncService } from '@/lib/services/daily-sync-service';

/**
 * Vercel Cron endpoint for daily exchange rate synchronization
 * Scheduled to run Monday-Friday at 18:00 UTC (6 PM UTC)
 * 
 * This gives ECB 2+ hours after their typical 16:00 CET update time
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  console.log(`🕒 Daily sync cron job triggered at ${new Date().toISOString()}`);
  
  try {
    // 1. Verify cron authentication
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      );
    }
    
    // 2. Check if CRON_SECRET is configured
    if (!process.env.CRON_SECRET) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Server misconfiguration: CRON_SECRET not set',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // 3. Set timeout protection (Vercel has 10s limit for Hobby plan, 300s for Pro)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sync operation timed out'));
      }, 4 * 60 * 1000); // 4 minutes timeout
    });

    // 4. Execute daily sync with timeout protection
    const syncPromise = dailySyncService.executeDailySync({
      fillGaps: true,
      maxGapDays: 7
    });

    const result = await Promise.race([syncPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    
    // 5. Log the result
    console.log(`📊 Daily sync completed in ${Math.round(duration / 1000)}s`);
    console.log(`✅ Success: ${result.success}`);
    console.log(`📈 Rates inserted: ${result.ratesInserted}`);
    console.log(`🔧 Gaps filled: ${result.gapsFilled}`);
    console.log(`⚠️  Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('Error details:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type}] ${error.message} (retryable: ${error.retryable})`);
      });
    }
    
    // 6. Determine response status
    const responseStatus = result.success ? 200 : (result.errors.length > 0 ? 207 : 500); // 207 = Partial Success
    
    const response = {
      success: result.success,
      message: result.success 
        ? `Successfully synced ${result.ratesInserted} rates for ${result.targetDate}${result.gapsFilled > 0 ? ` and filled ${result.gapsFilled} gaps` : ''}`
        : `Sync failed for ${result.targetDate}`,
      data: {
        targetDate: result.targetDate,
        ratesInserted: result.ratesInserted,
        gapsFilled: result.gapsFilled,
        duration: Math.round(duration / 1000),
        nextSyncDate: result.nextSyncDate,
        errorCount: result.errors.length,
        skippedReason: result.skippedReason
      },
      errors: result.errors.map(error => ({
        type: error.type,
        message: error.message,
        currency: error.currency,
        date: error.date,
        retryable: error.retryable
      })),
      timestamp: new Date().toISOString()
    };

    // 7. Send notification for critical errors (optional)
    if (!result.success && result.errors.some(e => !e.retryable)) {
      await sendCriticalErrorNotification(result);
    }

    return NextResponse.json(response, { status: responseStatus });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('💥 Daily sync cron job failed:', errorMessage);
    
    const response = {
      success: false,
      error: errorMessage,
      duration: Math.round(duration / 1000),
      timestamp: new Date().toISOString()
    };
    
    // Send critical error notification
    await sendCriticalErrorNotification({ 
      errors: [{ 
        type: 'CRITICAL_FAILURE',
        message: errorMessage,
        retryable: false,
        timestamp: new Date().toISOString()
      }] 
    });
    
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET endpoint for manual testing and health checks
 */
export async function GET(request: NextRequest) {
  // Check if this is a manual test request
  const testParam = request.nextUrl.searchParams.get('test');
  
  if (testParam === 'true') {
    console.log('🧪 Manual sync test requested');
    
    // Run a test sync (dry run mode would be ideal here)
    try {
      const result = await dailySyncService.executeDailySync({
        fillGaps: false // Don't fill gaps in test mode
      });
      
      return NextResponse.json({
        success: true,
        message: 'Manual test sync completed',
        data: {
          targetDate: result.targetDate,
          ratesInserted: result.ratesInserted,
          gapsFilled: result.gapsFilled,
          errorCount: result.errors.length,
          skippedReason: result.skippedReason
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
  
  // Return endpoint information
  return NextResponse.json({
    endpoint: 'Daily Exchange Rate Sync',
    method: 'POST',
    authentication: 'Bearer token required',
    schedule: '0 18 * * 1-5 (Monday-Friday at 18:00 UTC)',
    purpose: 'Automated daily synchronization of exchange rates from ECB',
    testUrl: '/api/cron/sync-exchange-rates?test=true',
    timestamp: new Date().toISOString()
  });
}

/**
 * Send notification for critical errors
 * In production, this could send emails, Slack messages, etc.
 */
async function sendCriticalErrorNotification(result: { errors: any[] }): Promise<void> {
  try {
    // In a real implementation, you might send notifications via:
    // - Email (SendGrid, AWS SES)
    // - Slack webhooks
    // - Discord webhooks
    // - PagerDuty alerts
    // - Custom monitoring service
    
    const criticalErrors = result.errors.filter(e => !e.retryable);
    
    if (criticalErrors.length > 0) {
      console.log('🚨 Critical errors detected, notification system would be triggered:');
      criticalErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message}`);
      });
      
      // Example webhook payload (commented out)
      /*
      const webhookPayload = {
        text: `🚨 Exchange Rate Sync Critical Failure`,
        attachments: [{
          color: 'danger',
          fields: [
            {
              title: 'Error Count',
              value: criticalErrors.length,
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true
            }
          ]
        }]
      };
      
      await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
      */
    }
    
  } catch (error) {
    console.error('Failed to send error notification:', error);
    // Don't throw here - notification failures shouldn't break the main flow
  }
}