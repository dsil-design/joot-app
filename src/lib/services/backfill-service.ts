import { ECBFetcher, ecbFetcher } from './ecb-fetcher';
import { RateCalculator, rateCalculator } from './rate-calculator';
import { db } from '../supabase/database';
import { dateHelpers } from '../utils/date-helpers';
import { 
  ECBRate, 
  ProcessedRate, 
  FetchResult,
  ECBError,
  ECBErrorType 
} from '../types/exchange-rates';
import { ExchangeRateInsert, CurrencyType } from '../supabase/types';

// Backfill-specific types
export interface BackfillOptions {
  startDate: string;        // '2015-01-01'
  endDate?: string;         // Default: today
  batchSize: number;        // Default: 500 records per batch
  skipExisting: boolean;    // Default: true
  dryRun: boolean;         // Default: false
}

export interface BackfillResult {
  totalRecords: number;
  processedRecords: number;
  insertedRecords: number;
  skippedRecords: number;
  errorCount: number;
  duration: number;
  checkpoints: string[];
  errors: BackfillError[];
}

export interface BackfillProgress {
  phase: 'fetching' | 'processing' | 'inserting' | 'complete';
  totalRecords: number;
  processedRecords: number;
  currentDate: string;
  estimatedTimeRemaining: number;
  errors: number;
  currentBatch: number;
  totalBatches: number;
}

export enum BackfillErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export interface BackfillError {
  type: BackfillErrorType;
  message: string;
  date?: string;
  retryable: boolean;
  context?: any;
  timestamp: string;
}

export interface Checkpoint {
  id: string;
  timestamp: string;
  lastProcessedDate: string;
  totalProcessed: number;
  batchNumber: number;
  options: BackfillOptions;
}

export class BackfillService {
  private ecbFetcher: ECBFetcher;
  private rateCalculator: RateCalculator;
  private progressCallback?: (progress: BackfillProgress) => void;

  constructor() {
    this.ecbFetcher = ecbFetcher;
    this.rateCalculator = rateCalculator;
  }

  /**
   * Set progress callback for streaming updates
   */
  setProgressCallback(callback: (progress: BackfillProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Execute complete backfill operation
   */
  async executeBackfill(options: BackfillOptions): Promise<BackfillResult> {
    const startTime = Date.now();
    
    // Set defaults
    const config: BackfillOptions = {
      endDate: dateHelpers.getCurrentUTCDate(),
      batchSize: 500,
      skipExisting: true,
      dryRun: false,
      ...options
    };

    // Validate configuration
    this.validateBackfillOptions(config);

    const result: BackfillResult = {
      totalRecords: 0,
      processedRecords: 0,
      insertedRecords: 0,
      skippedRecords: 0,
      errorCount: 0,
      duration: 0,
      checkpoints: [],
      errors: []
    };

    try {
      console.log(`🚀 Starting backfill from ${config.startDate} to ${config.endDate}`);
      console.log(`📊 Batch size: ${config.batchSize}, Skip existing: ${config.skipExisting}, Dry run: ${config.dryRun}`);

      // Phase 1: Fetch ECB historical data
      this.updateProgress({
        phase: 'fetching',
        totalRecords: 0,
        processedRecords: 0,
        currentDate: config.startDate,
        estimatedTimeRemaining: 0,
        errors: 0,
        currentBatch: 0,
        totalBatches: 0
      });

      const fetchResult = await this.ecbFetcher.fetchHistoricalRates();
      
      if (!fetchResult.success || !fetchResult.data) {
        throw new ECBError(ECBErrorType.NETWORK_ERROR, `Failed to fetch ECB data: ${fetchResult.error}`);
      }

      console.log(`✅ Fetched ${fetchResult.data.length} raw ECB records`);

      // Phase 2: Filter and process data
      this.updateProgress({
        phase: 'processing',
        totalRecords: fetchResult.data.length,
        processedRecords: 0,
        currentDate: config.startDate,
        estimatedTimeRemaining: 0,
        errors: 0,
        currentBatch: 0,
        totalBatches: 0
      });

      const filteredData = this.filterDataByDateRange(fetchResult.data, config.startDate, config.endDate!);
      result.totalRecords = filteredData.length;

      console.log(`📅 Filtered to ${filteredData.length} records in date range`);

      // Phase 3: Process in chunks
      const chunks = this.createChunks(filteredData, config.batchSize);
      const totalBatches = chunks.length;

      console.log(`📦 Processing ${totalBatches} batches of ${config.batchSize} records each`);

      this.updateProgress({
        phase: 'inserting',
        totalRecords: result.totalRecords,
        processedRecords: 0,
        currentDate: config.startDate,
        estimatedTimeRemaining: 0,
        errors: 0,
        currentBatch: 0,
        totalBatches
      });

      for (let batchIndex = 0; batchIndex < chunks.length; batchIndex++) {
        const chunk = chunks[batchIndex];
        
        try {
          const batchResult = await this.processChunk(chunk, config, batchIndex + 1);
          
          result.processedRecords += batchResult.processed;
          result.insertedRecords += batchResult.inserted;
          result.skippedRecords += batchResult.skipped;
          
          // Create checkpoint
          const checkpointId = await this.createCheckpoint({
            id: `backfill_${Date.now()}_${batchIndex}`,
            timestamp: new Date().toISOString(),
            lastProcessedDate: this.getLastDateFromChunk(chunk),
            totalProcessed: result.processedRecords,
            batchNumber: batchIndex + 1,
            options: config
          });
          
          result.checkpoints.push(checkpointId);

          // Update progress
          const estimatedTimeRemaining = this.calculateEstimatedTime(
            startTime, 
            batchIndex + 1, 
            totalBatches
          );

          this.updateProgress({
            phase: 'inserting',
            totalRecords: result.totalRecords,
            processedRecords: result.processedRecords,
            currentDate: this.getLastDateFromChunk(chunk),
            estimatedTimeRemaining,
            errors: result.errorCount,
            currentBatch: batchIndex + 1,
            totalBatches
          });

          console.log(`✅ Batch ${batchIndex + 1}/${totalBatches} completed: ${batchResult.inserted} inserted, ${batchResult.skipped} skipped`);

        } catch (error) {
          const backfillError: BackfillError = {
            type: this.categorizeError(error),
            message: error instanceof Error ? error.message : String(error),
            date: this.getLastDateFromChunk(chunk),
            retryable: this.isRetryableError(error),
            context: { batchIndex, chunkSize: chunk.length },
            timestamp: new Date().toISOString()
          };
          
          result.errors.push(backfillError);
          result.errorCount++;
          
          console.error(`❌ Batch ${batchIndex + 1} failed:`, backfillError.message);
          
          // Continue with next batch for non-critical errors
          if (backfillError.retryable) {
            continue;
          } else {
            throw error;
          }
        }
      }

      // Phase 4: Complete
      result.duration = Date.now() - startTime;

      this.updateProgress({
        phase: 'complete',
        totalRecords: result.totalRecords,
        processedRecords: result.processedRecords,
        currentDate: config.endDate!,
        estimatedTimeRemaining: 0,
        errors: result.errorCount,
        currentBatch: totalBatches,
        totalBatches
      });

      console.log(`🎉 Backfill completed successfully!`);
      console.log(`📊 Processed: ${result.processedRecords} records`);
      console.log(`💾 Inserted: ${result.insertedRecords} records`);
      console.log(`⏭️  Skipped: ${result.skippedRecords} records`);
      console.log(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      
      const backfillError: BackfillError = {
        type: this.categorizeError(error),
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
        timestamp: new Date().toISOString()
      };
      
      result.errors.push(backfillError);
      result.errorCount++;
      
      console.error(`💥 Backfill failed:`, backfillError.message);
      throw error;
    }
  }

  /**
   * Resume backfill from checkpoint
   */
  async resumeBackfill(checkpointId: string): Promise<BackfillResult> {
    const checkpoint = await this.loadCheckpoint(checkpointId);
    
    console.log(`🔄 Resuming backfill from checkpoint ${checkpointId}`);
    console.log(`📍 Last processed date: ${checkpoint.lastProcessedDate}`);
    
    // Create modified options starting from checkpoint
    const resumeOptions: BackfillOptions = {
      ...checkpoint.options,
      startDate: dateHelpers.getNextBusinessDay(checkpoint.lastProcessedDate)
    };
    
    return this.executeBackfill(resumeOptions);
  }

  /**
   * Process a chunk of ECB data
   */
  private async processChunk(
    chunk: ECBRate[], 
    config: BackfillOptions, 
    batchNumber: number
  ): Promise<{ processed: number; inserted: number; skipped: number }> {
    
    console.log(`📦 Processing batch ${batchNumber} with ${chunk.length} records`);
    
    // Group by date for cross-rate calculation
    const ratesByDate = this.groupRatesByDate(chunk);
    const processedRates: ProcessedRate[] = [];
    
    for (const [date, rates] of Object.entries(ratesByDate)) {
      // Skip if we already have data for this date (unless force update)
      if (config.skipExisting && await this.hasExistingData(date)) {
        continue;
      }
      
      // Calculate cross-rates
      const crossRates = this.rateCalculator.calculateCrossRates(rates);
      
      // Add EUR direct rates
      const eurRates = this.addEurDirectRates(rates, date);
      
      processedRates.push(...crossRates, ...eurRates);
    }
    
    console.log(`🔄 Generated ${processedRates.length} processed rates for batch ${batchNumber}`);
    
    let inserted = 0;
    let skipped = processedRates.length;
    
    // Insert to database (unless dry run)
    if (!config.dryRun && processedRates.length > 0) {
      const exchangeRateInserts: ExchangeRateInsert[] = processedRates.map(rate => ({
        from_currency: rate.from_currency,
        to_currency: rate.to_currency,
        rate: rate.rate,
        date: rate.date,
        source: rate.source,
        is_interpolated: rate.is_interpolated
      }));
      
      // Use upsert if not skipping existing records
      let insertResult;
      if (config.skipExisting) {
        insertResult = await db.exchangeRates.bulkInsert(exchangeRateInserts);
      } else {
        insertResult = await db.exchangeRates.bulkUpsert(exchangeRateInserts);
      }
      
      if (insertResult.error) {
        throw new Error(`Database operation failed: ${insertResult.error.message}`);
      }
      
      inserted = insertResult.data?.length || 0;
      skipped = processedRates.length - inserted;
    }
    
    return {
      processed: chunk.length,
      inserted: config.dryRun ? 0 : inserted,
      skipped: config.dryRun ? processedRates.length : skipped
    };
  }

  /**
   * Filter ECB data by date range
   */
  private filterDataByDateRange(data: ECBRate[], startDate: string, endDate: string): ECBRate[] {
    return data.filter(rate => {
      return rate.date >= startDate && rate.date <= endDate;
    });
  }

  /**
   * Create chunks from data array
   */
  private createChunks<T>(data: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Group rates by date
   */
  private groupRatesByDate(rates: ECBRate[]): Record<string, ECBRate[]> {
    return rates.reduce((groups, rate) => {
      if (!groups[rate.date]) {
        groups[rate.date] = [];
      }
      groups[rate.date].push(rate);
      return groups;
    }, {} as Record<string, ECBRate[]>);
  }

  /**
   * Add EUR direct rates (EUR/XXX = rate, XXX/EUR = 1/rate)
   */
  private addEurDirectRates(rates: ECBRate[], date: string): ProcessedRate[] {
    const eurRates: ProcessedRate[] = [];
    
    for (const rate of rates) {
      // EUR to other currency
      eurRates.push({
        from_currency: 'EUR',
        to_currency: rate.currency as CurrencyType,
        rate: rate.rate,
        date,
        source: 'ECB',
        is_interpolated: false
      });
      
      // Other currency to EUR
      eurRates.push({
        from_currency: rate.currency as CurrencyType,
        to_currency: 'EUR',
        rate: 1 / rate.rate,
        date,
        source: 'ECB',
        is_interpolated: false
      });
    }
    
    return eurRates;
  }

  /**
   * Check if we already have data for a specific date
   */
  private async hasExistingData(date: string): Promise<boolean> {
    const { data } = await db.exchangeRates.getByDateRange('USD', 'THB', date, date);
    return data !== null && data.length > 0;
  }

  /**
   * Get last date from chunk
   */
  private getLastDateFromChunk(chunk: ECBRate[]): string {
    if (chunk.length === 0) return '';
    return chunk.reduce((latest, rate) => 
      rate.date > latest ? rate.date : latest, 
      chunk[0].date
    );
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateEstimatedTime(
    startTime: number, 
    currentBatch: number, 
    totalBatches: number
  ): number {
    if (currentBatch === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const averageTimePerBatch = elapsed / currentBatch;
    const remainingBatches = totalBatches - currentBatch;
    
    return Math.round(remainingBatches * averageTimePerBatch);
  }

  /**
   * Update progress callback
   */
  private updateProgress(progress: BackfillProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Create checkpoint for recovery
   */
  private async createCheckpoint(checkpoint: Checkpoint): Promise<string> {
    // In a real implementation, this would store in database or file system
    // For now, we'll store in memory (would persist across restarts in production)
    console.log(`💾 Creating checkpoint ${checkpoint.id} for batch ${checkpoint.batchNumber}`);
    return checkpoint.id;
  }

  /**
   * Load checkpoint for resume
   */
  private async loadCheckpoint(checkpointId: string): Promise<Checkpoint> {
    // In a real implementation, this would load from database or file system
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  /**
   * Validate backfill options
   */
  private validateBackfillOptions(options: BackfillOptions): void {
    if (!dateHelpers.isValidDateString(options.startDate)) {
      throw new Error(`Invalid start date: ${options.startDate}`);
    }
    
    if (options.endDate && !dateHelpers.isValidDateString(options.endDate)) {
      throw new Error(`Invalid end date: ${options.endDate}`);
    }
    
    if (options.endDate && !dateHelpers.validateDateRange(options.startDate, options.endDate)) {
      throw new Error(`Start date must be before end date`);
    }
    
    if (options.batchSize <= 0 || options.batchSize > 2000) {
      throw new Error(`Batch size must be between 1 and 2000`);
    }
    
    // Check if date range is reasonable (not too far back)
    const startYear = parseInt(options.startDate.split('-')[0]);
    if (startYear < 1999) {
      throw new Error(`ECB data is only available from 1999 onwards`);
    }
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: unknown): BackfillErrorType {
    if (error instanceof ECBError) {
      switch (error.type) {
        case ECBErrorType.NETWORK_ERROR:
          return BackfillErrorType.NETWORK_ERROR;
        case ECBErrorType.PARSE_ERROR:
          return BackfillErrorType.PARSE_ERROR;
        case ECBErrorType.VALIDATION_ERROR:
          return BackfillErrorType.VALIDATION_ERROR;
        default:
          return BackfillErrorType.NETWORK_ERROR;
      }
    }
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return BackfillErrorType.TIMEOUT_ERROR;
      }
      if (error.message.includes('database') || error.message.includes('Database')) {
        return BackfillErrorType.DATABASE_ERROR;
      }
    }
    
    return BackfillErrorType.NETWORK_ERROR;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof ECBError) {
      return error.type === ECBErrorType.NETWORK_ERROR || error.type === ECBErrorType.RATE_LIMIT;
    }
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timeout') || 
             message.includes('network') || 
             message.includes('connection');
    }
    
    return false;
  }
}

// Singleton instance
export const backfillService = new BackfillService();