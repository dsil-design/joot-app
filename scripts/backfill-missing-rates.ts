import { dailySyncService } from '../src/lib/services/daily-sync-service';

/**
 * Backfill missing exchange rates from Oct 23 to Nov 4, 2025
 */
async function backfillMissingRates() {
  console.log('🔄 Starting backfill for missing dates...\n');

  const startDate = new Date('2025-10-23');
  const endDate = new Date('2025-11-04');
  const results: any[] = [];
  let totalInserted = 0;
  let totalGapsFilled = 0;

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

    console.log(`\n📅 Processing ${dateStr} (${dayName})...`);

    try {
      const result = await dailySyncService.executeDailySync({
        targetDate: dateStr,
        forceUpdate: false,
        fillGaps: true,
        maxGapDays: 7
      });

      results.push({
        date: dateStr,
        day: dayName,
        success: result.success,
        ratesInserted: result.ratesInserted,
        gapsFilled: result.gapsFilled,
        skipped: result.skippedReason
      });

      totalInserted += result.ratesInserted;
      totalGapsFilled += result.gapsFilled;

      if (result.success) {
        if (result.skippedReason) {
          console.log(`  ⏭️  Skipped: ${result.skippedReason}`);
        } else {
          console.log(`  ✅ Success: ${result.ratesInserted} rates inserted, ${result.gapsFilled} gaps filled`);
        }
      } else {
        console.log(`  ❌ Failed: ${result.errors[0]?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`  💥 Error: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        date: dateStr,
        day: dayName,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    BACKFILL SUMMARY                        ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total dates processed: ${results.length}`);
  console.log(`Successful syncs: ${results.filter(r => r.success).length}`);
  console.log(`Failed syncs: ${results.filter(r => !r.success).length}`);
  console.log(`Total rates inserted: ${totalInserted}`);
  console.log(`Total gaps filled: ${totalGapsFilled}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📊 Detailed Results:');
  console.table(results);

  process.exit(0);
}

backfillMissingRates();
