import { backfillService, BackfillResult } from './backfill-service';
import { db } from '../supabase/database';
import { dateHelpers } from '../utils/date-helpers';

export interface HistoricalBackfillConfig {
  startYear?: number;           // Default: 2016
  endDate?: string;             // Default: yesterday
  chunkSizeInDays?: number;     // Default: 90 days per chunk
  delayBetweenChunks?: number;  // Default: 2000ms
  skipExisting?: boolean;       // Default: true
  dryRun?: boolean;             // Default: false
}

export interface HistoricalBackfillStatus {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  currentChunk?: number;
  totalChunks?: number;
  processedDays?: number;
  totalDays?: number;
  lastProcessedDate?: string;
  errors?: string[];
  estimatedTimeRemaining?: number;
}

export class HistoricalBackfillJob {
  private status: HistoricalBackfillStatus = { status: 'idle' };
  private abortController?: AbortController;
  
  /**
   * Execute historical backfill from 2016 to present
   * This fetches all data at once from ECB but processes it in manageable chunks
   */
  async execute(config: HistoricalBackfillConfig = {}): Promise<BackfillResult> {
    // Set defaults
    const settings = {
      startYear: 2016,
      endDate: dateHelpers.getYesterday(),
      chunkSizeInDays: 90,
      delayBetweenChunks: 2000,
      skipExisting: true,
      dryRun: false,
      ...config
    };

    const startDate = `${settings.startYear}-01-01`;
    const endDate = settings.endDate;

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║           HISTORICAL EXCHANGE RATES BACKFILL JOB               ║
╠════════════════════════════════════════════════════════════════╣
║ Date Range: ${startDate} to ${endDate}                         
║ Mode: ${settings.dryRun ? 'DRY RUN' : 'LIVE INSERTION'}
║ Skip Existing: ${settings.skipExisting}
║ Chunk Size: ${settings.chunkSizeInDays} days
╚════════════════════════════════════════════════════════════════╝
    `);

    this.status = {
      status: 'running',
      startedAt: new Date().toISOString(),
      processedDays: 0,
      totalDays: this.calculateTotalDays(startDate, endDate),
      currentChunk: 0,
      totalChunks: Math.ceil(this.calculateTotalDays(startDate, endDate) / settings.chunkSizeInDays)
    };

    this.abortController = new AbortController();

    try {
      // Check current data coverage
      const coverageReport = await this.analyzeCoverage(startDate, endDate);
      console.log(`\n📊 Current Coverage Analysis:`);
      console.log(`   Total days in range: ${coverageReport.totalDays}`);
      console.log(`   Days with data: ${coverageReport.daysWithData}`);
      console.log(`   Missing days: ${coverageReport.missingDays}`);
      console.log(`   Coverage: ${coverageReport.coveragePercent.toFixed(2)}%`);
      
      if (coverageReport.gaps.length > 0) {
        console.log(`\n   Identified ${coverageReport.gaps.length} gaps:`);
        coverageReport.gaps.slice(0, 5).forEach(gap => {
          console.log(`     - ${gap.startDate} to ${gap.endDate} (${gap.days} days)`);
        });
        if (coverageReport.gaps.length > 5) {
          console.log(`     ... and ${coverageReport.gaps.length - 5} more gaps`);
        }
      }

      // Process in chunks to avoid memory issues
      const chunks = this.createDateChunks(startDate, endDate, settings.chunkSizeInDays);
      const results: BackfillResult[] = [];

      console.log(`\n🔄 Processing ${chunks.length} chunks...`);

      for (let i = 0; i < chunks.length; i++) {
        // Check for abort signal
        if (this.abortController.signal.aborted) {
          console.log('⛔ Backfill job aborted by user');
          break;
        }

        const chunk = chunks[i];
        this.status.currentChunk = i + 1;
        this.status.lastProcessedDate = chunk.endDate;

        console.log(`\n📦 Processing chunk ${i + 1}/${chunks.length}: ${chunk.startDate} to ${chunk.endDate}`);

        // Execute backfill for this chunk
        const chunkResult = await backfillService.executeBackfill({
          startDate: chunk.startDate,
          endDate: chunk.endDate,
          batchSize: 500,
          skipExisting: settings.skipExisting,
          dryRun: settings.dryRun
        });

        // Ensure chunk result is valid before processing
        if (!chunkResult) {
          throw new Error(`Chunk ${i + 1} returned null result`);
        }

        results.push(chunkResult);
        
        this.status.processedDays = Math.min(
          (this.status.processedDays || 0) + settings.chunkSizeInDays,
          this.status.totalDays || 0
        );

        // Log chunk results
        console.log(`   ✅ Chunk completed: ${chunkResult.insertedRecords || 0} inserted, ${chunkResult.skippedRecords || 0} skipped`);

        // Add delay between chunks to be respectful to ECB servers
        if (i < chunks.length - 1 && !settings.dryRun) {
          console.log(`   ⏳ Waiting ${settings.delayBetweenChunks}ms before next chunk...`);
          await this.sleep(settings.delayBetweenChunks);
        }

        // Update estimated time
        const elapsed = Date.now() - new Date(this.status.startedAt!).getTime();
        const avgTimePerChunk = elapsed / (i + 1);
        this.status.estimatedTimeRemaining = Math.round(avgTimePerChunk * (chunks.length - i - 1));
      }

      // Aggregate results
      const aggregatedResult = this.aggregateResults(results);

      // Final coverage report
      const finalCoverage = await this.analyzeCoverage(startDate, endDate);
      console.log(`\n📊 Final Coverage Report:`);
      console.log(`   Coverage improved from ${coverageReport.coveragePercent.toFixed(2)}% to ${finalCoverage.coveragePercent.toFixed(2)}%`);
      console.log(`   New records added: ${aggregatedResult.insertedRecords}`);
      console.log(`   Total time: ${Math.round(aggregatedResult.duration / 1000)}s`);

      this.status = {
        ...this.status,
        status: 'completed',
        completedAt: new Date().toISOString()
      };

      return aggregatedResult;

    } catch (error) {
      console.error('❌ Historical backfill failed:', error);
      this.status = {
        ...this.status,
        status: 'failed',
        errors: [error instanceof Error ? error.message : String(error)]
      };
      throw error;
    }
  }

  /**
   * Analyze current data coverage for the date range
   */
  private async analyzeCoverage(startDate: string, endDate: string): Promise<{
    totalDays: number;
    daysWithData: number;
    missingDays: number;
    coveragePercent: number;
    gaps: Array<{ startDate: string; endDate: string; days: number }>;
  }> {
    // Query existing data
    const { data: existingRates } = await db.exchangeRates.getByDateRange(
      'USD',
      'EUR',
      startDate,
      endDate
    );

    const totalDays = this.calculateTotalDays(startDate, endDate);
    const existingDates = new Set((existingRates || []).map(r => r.date));
    const daysWithData = existingDates.size;
    const missingDays = totalDays - daysWithData;

    // Identify gaps
    const gaps: Array<{ startDate: string; endDate: string; days: number }> = [];
    let currentGapStart: string | null = null;
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      if (!isWeekend && !existingDates.has(dateStr)) {
        if (!currentGapStart) {
          currentGapStart = dateStr;
        }
      } else if (currentGapStart) {
        const gapEnd = new Date(currentDate);
        gapEnd.setDate(gapEnd.getDate() - 1);
        gaps.push({
          startDate: currentGapStart,
          endDate: gapEnd.toISOString().split('T')[0],
          days: this.calculateTotalDays(currentGapStart, gapEnd.toISOString().split('T')[0])
        });
        currentGapStart = null;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Handle final gap if exists
    if (currentGapStart) {
      gaps.push({
        startDate: currentGapStart,
        endDate: endDate,
        days: this.calculateTotalDays(currentGapStart, endDate)
      });
    }

    return {
      totalDays,
      daysWithData,
      missingDays,
      coveragePercent: (daysWithData / totalDays) * 100,
      gaps
    };
  }

  /**
   * Create date chunks for processing
   */
  private createDateChunks(
    startDate: string,
    endDate: string,
    chunkSizeInDays: number
  ): Array<{ startDate: string; endDate: string }> {
    const chunks: Array<{ startDate: string; endDate: string }> = [];
    let currentStart = new Date(startDate);
    const finalEnd = new Date(endDate);

    while (currentStart <= finalEnd) {
      const chunkEnd = new Date(currentStart);
      chunkEnd.setDate(chunkEnd.getDate() + chunkSizeInDays - 1);
      
      // Don't exceed the final end date
      if (chunkEnd > finalEnd) {
        chunkEnd.setTime(finalEnd.getTime());
      }

      chunks.push({
        startDate: currentStart.toISOString().split('T')[0],
        endDate: chunkEnd.toISOString().split('T')[0]
      });

      currentStart = new Date(chunkEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    return chunks;
  }

  /**
   * Calculate total days between two dates
   */
  private calculateTotalDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Aggregate results from multiple chunks
   */
  private aggregateResults(results: BackfillResult[]): BackfillResult {
    return results.reduce((acc, result) => ({
      totalRecords: acc.totalRecords + result.totalRecords,
      processedRecords: acc.processedRecords + result.processedRecords,
      insertedRecords: acc.insertedRecords + result.insertedRecords,
      skippedRecords: acc.skippedRecords + result.skippedRecords,
      errorCount: acc.errorCount + result.errorCount,
      duration: acc.duration + result.duration,
      checkpoints: [...acc.checkpoints, ...result.checkpoints],
      errors: [...acc.errors, ...result.errors]
    }), {
      totalRecords: 0,
      processedRecords: 0,
      insertedRecords: 0,
      skippedRecords: 0,
      errorCount: 0,
      duration: 0,
      checkpoints: [],
      errors: []
    });
  }

  /**
   * Get current job status
   */
  getStatus(): HistoricalBackfillStatus {
    return { ...this.status };
  }

  /**
   * Pause the job (can be resumed)
   */
  pause(): void {
    if (this.status.status === 'running') {
      this.status.status = 'paused';
      this.abortController?.abort();
      console.log('⏸️  Backfill job paused');
    }
  }

  /**
   * Abort the job (cannot be resumed)
   */
  abort(): void {
    this.abortController?.abort();
    this.status.status = 'failed';
    this.status.errors = ['Job aborted by user'];
    console.log('🛑 Backfill job aborted');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const historicalBackfillJob = new HistoricalBackfillJob();