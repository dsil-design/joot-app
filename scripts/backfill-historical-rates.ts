#!/usr/bin/env tsx

/**
 * Script to backfill historical exchange rates from 2016 to present
 * 
 * Usage:
 *   npm run backfill:rates                    # Run full backfill from 2016
 *   npm run backfill:rates -- --year 2020     # Start from specific year
 *   npm run backfill:rates -- --dry-run       # Test without inserting data
 *   npm run backfill:rates -- --check         # Check coverage only
 * 
 * Options:
 *   --year <year>      Start year (default: 2016)
 *   --end <date>       End date in YYYY-MM-DD format (default: yesterday)
 *   --chunk <days>     Days per chunk (default: 90)
 *   --delay <ms>       Delay between chunks in ms (default: 2000)
 *   --dry-run          Run without inserting data
 *   --check            Check coverage only, don't backfill
 *   --force            Don't skip existing data
 */

import { historicalBackfillJob } from '../src/lib/services/historical-backfill-job';
import { db } from '../src/lib/supabase/database';
import { program } from 'commander';
import ora from 'ora';
import chalk from 'chalk';

// Parse command line arguments
program
  .option('--year <year>', 'Start year', '2016')
  .option('--end <date>', 'End date (YYYY-MM-DD)')
  .option('--chunk <days>', 'Days per chunk', '90')
  .option('--delay <ms>', 'Delay between chunks (ms)', '2000')
  .option('--dry-run', 'Run without inserting data', false)
  .option('--check', 'Check coverage only', false)
  .option('--force', 'Don\'t skip existing data', false)
  .parse(process.argv);

const options = program.opts();

async function checkCoverage() {
  const startYear = parseInt(options.year);
  const startDate = `${startYear}-01-01`;
  const endDate = options.end || new Date(Date.now() - 86400000).toISOString().split('T')[0];

  console.log(chalk.cyan('\n📊 Checking Exchange Rate Coverage\n'));
  console.log(`Date Range: ${chalk.yellow(startDate)} to ${chalk.yellow(endDate)}`);

  const spinner = ora('Analyzing current data coverage...').start();

  try {
    // Get sample coverage for USD/EUR pair
    const { data: rates } = await db.exchangeRates.getByDateRange('USD', 'EUR', startDate, endDate);
    
    if (!rates || rates.length === 0) {
      spinner.fail('No data found in the specified range');
      console.log(chalk.red('\n❌ No exchange rate data found for the specified period'));
      console.log(chalk.yellow('💡 Run without --check flag to start backfilling'));
      return;
    }

    const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const uniqueDates = new Set(rates.map(r => r.date));
    const coverage = (uniqueDates.size / totalDays) * 100;

    spinner.succeed('Coverage analysis complete');

    console.log('\n' + chalk.green('📈 Coverage Statistics:'));
    console.log(`  Total days: ${chalk.white(totalDays)}`);
    console.log(`  Days with data: ${chalk.white(uniqueDates.size)}`);
    console.log(`  Missing days: ${chalk.white(totalDays - uniqueDates.size)}`);
    console.log(`  Coverage: ${chalk.yellow(coverage.toFixed(2) + '%')}`);

    // Find gaps
    const dates = Array.from(uniqueDates).sort();
    const gaps: Array<{ start: string; end: string; days: number }> = [];
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const daysDiff = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        const gapStart = new Date(prevDate);
        gapStart.setDate(gapStart.getDate() + 1);
        const gapEnd = new Date(currDate);
        gapEnd.setDate(gapEnd.getDate() - 1);
        
        gaps.push({
          start: gapStart.toISOString().split('T')[0],
          end: gapEnd.toISOString().split('T')[0],
          days: daysDiff - 1
        });
      }
    }

    if (gaps.length > 0) {
      console.log('\n' + chalk.yellow('⚠️  Data Gaps Found:'));
      gaps.slice(0, 10).forEach(gap => {
        console.log(`  ${gap.start} to ${gap.end} (${gap.days} days)`);
      });
      if (gaps.length > 10) {
        console.log(`  ... and ${gaps.length - 10} more gaps`);
      }
    } else {
      console.log('\n' + chalk.green('✅ No gaps found in the data!'));
    }

  } catch (error) {
    spinner.fail('Coverage check failed');
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

async function runBackfill() {
  const startYear = parseInt(options.year);
  const endDate = options.end;
  const chunkSize = parseInt(options.chunk);
  const delay = parseInt(options.delay);
  const dryRun = options.dryRun;
  const skipExisting = !options.force;

  console.log(chalk.cyan('\n🚀 Starting Historical Exchange Rates Backfill\n'));

  // Display configuration
  console.log(chalk.yellow('Configuration:'));
  console.log(`  Start Year: ${chalk.white(startYear)}`);
  console.log(`  End Date: ${chalk.white(endDate || 'Yesterday')}`);
  console.log(`  Chunk Size: ${chalk.white(chunkSize + ' days')}`);
  console.log(`  Delay Between Chunks: ${chalk.white(delay + 'ms')}`);
  console.log(`  Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  console.log(`  Skip Existing: ${skipExisting ? chalk.green('Yes') : chalk.yellow('No (Force Update)')}`);

  // Add confirmation prompt for live mode
  if (!dryRun) {
    console.log(chalk.red('\n⚠️  Warning: This will insert data into your database!'));
    console.log(chalk.yellow('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n'));
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const spinner = ora('Initializing backfill job...').start();

  try {
    // Set up progress monitoring
    let lastUpdate = Date.now();
    const progressInterval = setInterval(() => {
      const status = historicalBackfillJob.getStatus();
      if (status.status === 'running' && status.currentChunk && status.totalChunks) {
        const progress = ((status.currentChunk - 1) / status.totalChunks) * 100;
        const timeRemaining = status.estimatedTimeRemaining 
          ? ` (${Math.round(status.estimatedTimeRemaining / 1000)}s remaining)`
          : '';
        
        spinner.text = `Processing chunk ${status.currentChunk}/${status.totalChunks} (${progress.toFixed(1)}%)${timeRemaining}`;
      }
    }, 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n⚠️  Received interrupt signal, stopping backfill...'));
      historicalBackfillJob.abort();
      clearInterval(progressInterval);
      process.exit(0);
    });

    spinner.text = 'Starting backfill process...';

    // Execute backfill
    const result = await historicalBackfillJob.execute({
      startYear,
      endDate,
      chunkSizeInDays: chunkSize,
      delayBetweenChunks: delay,
      skipExisting,
      dryRun
    });

    clearInterval(progressInterval);
    spinner.succeed('Backfill completed successfully!');

    // Display results
    console.log('\n' + chalk.green('✅ Backfill Results:'));
    console.log(`  Total Records Processed: ${chalk.white(result.processedRecords.toLocaleString())}`);
    console.log(`  Records Inserted: ${chalk.green(result.insertedRecords.toLocaleString())}`);
    console.log(`  Records Skipped: ${chalk.yellow(result.skippedRecords.toLocaleString())}`);
    console.log(`  Errors: ${result.errorCount > 0 ? chalk.red(result.errorCount) : chalk.green('0')}`);
    console.log(`  Duration: ${chalk.white(Math.round(result.duration / 1000) + 's')}`);

    if (result.errors.length > 0) {
      console.log('\n' + chalk.yellow('⚠️  Errors encountered:'));
      result.errors.slice(0, 5).forEach(error => {
        console.log(`  - ${error.message}`);
      });
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more errors`);
      }
    }

    // Show final coverage if not dry run
    if (!dryRun) {
      console.log('\n' + chalk.cyan('📊 Checking final coverage...'));
      await checkCoverage();
    }

  } catch (error) {
    spinner.fail('Backfill failed');
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    console.log(chalk.bold.cyan(`
╔════════════════════════════════════════════════════════════════╗
║          HISTORICAL EXCHANGE RATES BACKFILL UTILITY           ║
╚════════════════════════════════════════════════════════════════╝
    `));

    if (options.check) {
      await checkCoverage();
    } else {
      await runBackfill();
    }

    console.log(chalk.green('\n✨ Done!\n'));
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

// Run the script
main();