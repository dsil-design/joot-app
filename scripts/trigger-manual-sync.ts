import { ecbFullSyncService } from '../src/lib/services/ecb-full-sync-service'

async function triggerManualSync() {
  try {
    console.log('🚀 Triggering manual ECB sync...\n')
    console.log('This will download the full ECB XML and sync all rates up to today')
    console.log('Expected to include rates for October 15, 2025\n')

    const result = await ecbFullSyncService.executeSync('manual')

    console.log('\n✅ Sync completed successfully!\n')
    console.log('Statistics:')
    console.log(`  - Total rates in XML: ${result.statistics.totalRatesInXml}`)
    console.log(`  - Filtered rates: ${result.statistics.filteredRates}`)
    console.log(`  - New rates inserted: ${result.statistics.newRatesInserted}`)
    console.log(`  - Rates updated: ${result.statistics.ratesUpdated}`)
    console.log(`  - Rates unchanged: ${result.statistics.ratesUnchanged}`)
    console.log(`  - Duration: ${result.duration}ms`)
    console.log(`  - Sync ID: ${result.syncId}`)

  } catch (error) {
    console.error('❌ Sync failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

triggerManualSync()
