#!/usr/bin/env npx tsx

/**
 * Test script for surgical exchange rate sync
 *
 * Run with:
 * NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/test-surgical-sync.ts
 *
 * Options:
 *   --dry-run    Show what would be done without inserting
 *   --sync       Execute the surgical sync
 *   --coverage   Show coverage statistics
 *   --gaps       Show gap analysis (default)
 */

import { transactionRateGapService } from '../src/lib/services/transaction-rate-gap-service';
import { surgicalBackfillService } from '../src/lib/services/surgical-backfill-service';

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || '--gaps';

  console.log('🎯 Surgical Exchange Rate Sync Test');
  console.log('=====================================\n');

  switch (action) {
    case '--coverage':
      await showCoverage();
      break;

    case '--gaps':
      await showGaps();
      break;

    case '--dry-run':
      await executeDryRun();
      break;

    case '--sync':
      await executeSync();
      break;

    default:
      console.log('Usage: npx tsx scripts/test-surgical-sync.ts [--gaps|--coverage|--dry-run|--sync]');
      console.log('');
      console.log('Options:');
      console.log('  --gaps      Show gap analysis (default)');
      console.log('  --coverage  Show coverage statistics');
      console.log('  --dry-run   Show what would be done without inserting');
      console.log('  --sync      Execute the surgical sync');
  }
}

async function showGaps() {
  console.log('📊 Detecting exchange rate gaps...\n');

  const result = await transactionRateGapService.detectGaps();

  if (!result.success) {
    console.error('❌ Gap detection failed:', result.error);
    process.exit(1);
  }

  console.log(`Total missing rates: ${result.totalMissingRates}`);
  console.log(`Transactions affected: ${result.totalTransactionsNeedingRates}`);
  console.log('');

  if (Object.keys(result.byCurrency).length > 0) {
    console.log('Missing rates by currency:');
    for (const [currency, count] of Object.entries(result.byCurrency)) {
      console.log(`  ${currency}: ${count} dates`);
    }
    console.log('');
  }

  if (result.gaps.length > 0) {
    const { ecbGaps, nonEcbGaps } = transactionRateGapService.categorizeGapsBySource(result.gaps);

    console.log(`ECB currencies: ${ecbGaps.length} gaps`);
    console.log(`Non-ECB currencies (VND): ${nonEcbGaps.length} gaps`);
    console.log('');

    // Show first 10 gaps as sample
    console.log('Sample gaps (first 10):');
    for (const gap of result.gaps.slice(0, 10)) {
      console.log(`  ${gap.currency} @ ${gap.date} (${gap.transactionCount} tx)`);
    }
    if (result.gaps.length > 10) {
      console.log(`  ... and ${result.gaps.length - 10} more`);
    }
  } else {
    console.log('✅ No gaps found - all transactions have exchange rates!');
  }
}

async function showCoverage() {
  console.log('📊 Calculating coverage statistics...\n');

  const stats = await transactionRateGapService.getCoverageStats();

  console.log(`Total non-USD transactions: ${stats.totalNonUSDTransactions}`);
  console.log(`Transactions with rates: ${stats.transactionsWithRates}`);
  console.log(`Transactions without rates: ${stats.transactionsWithoutRates}`);
  console.log(`Coverage: ${stats.coveragePercentage}%`);
  console.log('');

  console.log('Coverage by currency:');
  for (const [currency, data] of Object.entries(stats.byCurrency)) {
    const coverage = data.total > 0 ? ((data.covered / data.total) * 100).toFixed(1) : '100';
    console.log(`  ${currency}: ${data.covered}/${data.total} (${coverage}% covered)`);
  }
}

async function executeDryRun() {
  console.log('🔍 DRY RUN - showing what would be done...\n');

  const result = await surgicalBackfillService.executeBackfill({
    dryRun: true
  });

  console.log('');
  console.log('Dry run results:');
  console.log(`  Total gaps: ${result.totalGaps}`);
  console.log(`  Rates that would be inserted: ${result.ratesInserted}`);
  console.log(`  Rates skipped: ${result.ratesSkipped}`);
  console.log(`  Duration: ${result.duration}ms`);
  console.log('');

  if (result.errors.length > 0) {
    console.log('Errors:');
    for (const err of result.errors) {
      console.log(`  ${err.currency} @ ${err.date}: ${err.message}`);
    }
  }
}

async function executeSync() {
  console.log('🚀 Executing surgical sync...\n');

  const result = await surgicalBackfillService.executeBackfill({
    dryRun: false
  });

  console.log('');
  console.log('Sync results:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Total gaps: ${result.totalGaps}`);
  console.log(`  Rates inserted: ${result.ratesInserted}`);
  console.log(`  Rates skipped: ${result.ratesSkipped}`);
  console.log(`  Duration: ${result.duration}ms`);
  console.log('');

  console.log('Details:');
  console.log(`  ECB rates: ${result.details.ecbRates}`);
  console.log(`  Non-ECB rates: ${result.details.nonEcbRates}`);
  console.log(`  Interpolated: ${result.details.interpolated}`);

  if (result.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    for (const err of result.errors) {
      console.log(`  ${err.currency} @ ${err.date}: ${err.message}`);
    }
  }
}

main().catch(console.error);
