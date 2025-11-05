import { dailySyncService } from '../src/lib/services/daily-sync-service';

async function testSync() {
  console.log('🧪 Testing manual sync...\n');
  const startTime = Date.now();

  try {
    const result = await dailySyncService.executeDailySync({
      targetDate: '2025-11-04',
      forceUpdate: false,
      fillGaps: false, // Disable gap filling to test just the sync
      maxGapDays: 0
    });

    const duration = Date.now() - startTime;
    console.log('\n✅ Sync completed!');
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n⏱️  Total duration: ${(duration / 1000).toFixed(2)}s`);
    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('\n❌ Sync failed!');
    console.error(error);
    console.log(`\n⏱️  Duration before failure: ${(duration / 1000).toFixed(2)}s`);
    process.exit(1);
  }
}

testSync();
