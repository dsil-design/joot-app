import { ECBFetcher, ecbFetcher } from './ecb-fetcher';
import { RateCalculator, rateCalculator } from './rate-calculator';
import { GapFillingService, gapFillingService } from './gap-filling-service';
import { db } from '../supabase/database';
import { dateHelpers, COMMON_HOLIDAYS } from '../utils/date-helpers';
import {
  ECBRate,
  ProcessedRate,
  ECBErrorType,
  ECBError
} from '../types/exchange-rates';
import { currencyConfigService } from './currency-config-service';
import { ExchangeRateInsert, CurrencyType } from '../supabase/types';
import { surgicalBackfillService, SurgicalBackfillResult } from './surgical-backfill-service';
import { transactionRateGapService } from './transaction-rate-gap-service';

export interface SyncOptions {
  targetDate?: string;      // Default: previous business day
  forceUpdate: boolean;     // Default: false
  fillGaps: boolean;        // Default: true
  maxGapDays: number;       // Default: 7
}

export interface SyncResult {
  success: boolean;
  targetDate: string;
  ratesInserted: number;
  gapsFilled: number;
  errors: SyncError[];
  duration: number;
  nextSyncDate: string;
  skippedReason?: string;
}

export enum SyncErrorType {
  ECB_UNAVAILABLE = 'ECB_UNAVAILABLE',
  PARSE_ERROR = 'PARSE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS'
}

export interface SyncError {
  type: SyncErrorType;
  message: string;
  currency?: string;
  date?: string;
  retryable: boolean;
  timestamp: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Retry configuration for sync operations
const SYNC_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 2000,      // 2 seconds
  maxDelay: 30000,      // 30 seconds
  backoffFactor: 2
};

export class DailySyncService {
  private ecbFetcher: ECBFetcher;
  private rateCalculator: RateCalculator;
  private gapFillingService: GapFillingService;

  constructor() {
    this.ecbFetcher = ecbFetcher;
    this.rateCalculator = rateCalculator;
    this.gapFillingService = gapFillingService;
  }

  /**
   * Execute daily synchronization of exchange rates
   */
  async executeDailySync(options: Partial<SyncOptions> = {}): Promise<SyncResult> {
    const startTime = Date.now();
    
    const config: SyncOptions = {
      targetDate: dateHelpers.getTargetSyncDate(undefined, COMMON_HOLIDAYS.EU_2024),
      forceUpdate: false,
      fillGaps: true,
      maxGapDays: 7,
      ...options
    };

    console.log(`🔄 Starting daily sync for ${config.targetDate}`);

    const result: SyncResult = {
      success: true,
      targetDate: config.targetDate!,
      ratesInserted: 0,
      gapsFilled: 0,
      errors: [],
      duration: 0,
      nextSyncDate: dateHelpers.getNextBusinessDay(config.targetDate!)
    };

    try {
      // Step 1: Check if we should skip this sync
      if (!config.forceUpdate && await this.shouldSkipSync(config.targetDate!)) {
        result.success = true;
        result.skippedReason = 'Data already exists for target date';
        result.duration = Date.now() - startTime;
        
        console.log(`⏭️  Skipping sync for ${config.targetDate} - data already exists`);
        
        // Still run gap filling if requested
        if (config.fillGaps) {
          await this.performGapFilling(config, result);
        }
        
        return result;
      }

      // Step 2: Determine if target date should have data (business day check)
      if (!dateHelpers.isBusinessDay(config.targetDate!, COMMON_HOLIDAYS.EU_2024)) {
        console.log(`📅 Target date ${config.targetDate} is not a business day, handling as weekend/holiday`);
        
        if (config.fillGaps) {
          await this.handleWeekendSync(config, result);
        } else {
          result.skippedReason = 'Target date is not a business day and gap filling is disabled';
        }
        
        result.duration = Date.now() - startTime;
        return result;
      }

      // Step 3: Fetch latest ECB rates with retry logic
      console.log(`📡 Fetching ECB rates for ${config.targetDate}`);
      
      const fetchResult = await this.executeWithRetry(
        () => this.ecbFetcher.fetchDailyRates(),
        'ECB rate fetch'
      );

      if (!fetchResult.success || !fetchResult.data) {
        throw new ECBError(ECBErrorType.NETWORK_ERROR, `ECB fetch failed: ${fetchResult.error}`);
      }

      // Step 4: Filter rates for target date
      const targetDateRates = fetchResult.data.filter(rate => rate.date === config.targetDate);
      
      if (targetDateRates.length === 0) {
        console.log(`⚠️  No ECB rates found for ${config.targetDate}, checking if it's a recent date`);
        
        // If it's a very recent date (today/yesterday), ECB might not have published yet
        const isVeryRecent = dateHelpers.getBusinessDayCount(config.targetDate!, dateHelpers.getCurrentUTCDate()) <= 1;
        
        if (isVeryRecent) {
          result.skippedReason = 'ECB has not yet published rates for this recent date';
          result.duration = Date.now() - startTime;
          return result;
        } else {
          // For older dates, this might indicate a holiday or ECB outage
          if (config.fillGaps) {
            await this.handleMissingDataSync(config, result);
          } else {
            throw new ECBError(ECBErrorType.VALIDATION_ERROR, `No ECB rates available for ${config.targetDate}`);
          }
          
          result.duration = Date.now() - startTime;
          return result;
        }
      }

      console.log(`✅ Found ${targetDateRates.length} ECB rates for ${config.targetDate}`);

      // Step 5: Validate data quality
      const validation = this.validateSyncData(targetDateRates);
      if (!validation.valid) {
        result.errors.push({
          type: SyncErrorType.VALIDATION_ERROR,
          message: `Data validation failed: ${validation.errors.join(', ')}`,
          date: config.targetDate,
          retryable: false,
          timestamp: new Date().toISOString()
        });
      }

      // Log warnings but don't fail
      if (validation.warnings.length > 0) {
        console.warn(`⚠️  Data validation warnings: ${validation.warnings.join(', ')}`);
      }

      // Step 6: Calculate cross-rates
      console.log(`🔄 Calculating cross-rates for ${config.targetDate}`);
      const processedRates = this.rateCalculator.calculateCrossRates(targetDateRates);
      
      // Add EUR direct rates
      const eurRates = this.addEurDirectRates(targetDateRates, config.targetDate!);
      
      // Deduplicate rates to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time" error
      const allRates = this.deduplicateRates([...processedRates, ...eurRates]);

      console.log(`💱 Generated ${allRates.length} processed rates (after deduplication)`);

      // Step 7: Insert rates to database
      if (allRates.length > 0) {
        const insertResult = await this.insertRatesWithConflictHandling(allRates, config.forceUpdate);
        result.ratesInserted = insertResult;
        
        console.log(`💾 Inserted ${result.ratesInserted} rates for ${config.targetDate}`);
      }

      // Step 8: Fill gaps if requested
      if (config.fillGaps) {
        await this.performGapFilling(config, result);
      }

      result.duration = Date.now() - startTime;

      console.log(`🎉 Daily sync completed successfully for ${config.targetDate}`);
      console.log(`📊 Rates: ${result.ratesInserted} rates, Gaps: ${result.gapsFilled}`);
      console.log(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);

      return result;

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      
      const syncError: SyncError = {
        type: this.categorizeSyncError(error),
        message: error instanceof Error ? error.message : String(error),
        date: config.targetDate,
        retryable: this.isRetryableError(error),
        timestamp: new Date().toISOString()
      };
      
      result.errors.push(syncError);
      
      console.error(`❌ Daily sync failed for ${config.targetDate}:`, syncError.message);
      
      return result;
    }
  }

  /**
   * Sync specific date (manual operation)
   */
  async syncSpecificDate(
    date: string, 
    forceUpdate: boolean = false
  ): Promise<SyncResult> {
    console.log(`🎯 Manual sync requested for ${date}`);
    
    if (!dateHelpers.isValidDateString(date)) {
      throw new Error(`Invalid date format: ${date}`);
    }
    
    if (dateHelpers.isFutureDate(date)) {
      throw new Error(`Cannot sync future date: ${date}`);
    }
    
    return this.executeDailySync({
      targetDate: date,
      forceUpdate,
      fillGaps: true,
      maxGapDays: 14 // Allow larger gap filling for manual syncs
    });
  }

  /**
   * Handle weekend/holiday sync by using previous business day rates
   */
  private async handleWeekendSync(config: SyncOptions, result: SyncResult): Promise<void> {
    console.log(`📅 Handling weekend/holiday sync for ${config.targetDate}`);
    
    try {
      const currencyPairs = await currencyConfigService.getCurrencyPairs();
      const gapResult = await this.gapFillingService.fillWeekendGaps(
        config.targetDate!,
        currencyPairs as [CurrencyType, CurrencyType][]
      );
      
      result.gapsFilled = gapResult.filledGaps;
      result.success = gapResult.success;
      
      if (gapResult.errors.length > 0) {
        result.errors.push(...gapResult.errors.map(err => ({
          type: SyncErrorType.PARTIAL_SUCCESS,
          message: err.message,
          currency: `${err.fromCurrency}/${err.toCurrency}`,
          date: err.date,
          retryable: err.retryable,
          timestamp: new Date().toISOString()
        })));
      }
      
      console.log(`📅 Weekend gap filling completed: ${result.gapsFilled} rates filled`);
      
    } catch (error) {
      result.errors.push({
        type: SyncErrorType.DATABASE_ERROR,
        message: `Weekend gap filling failed: ${error instanceof Error ? error.message : String(error)}`,
        date: config.targetDate,
        retryable: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle missing data sync (ECB outage/holiday)
   */
  private async handleMissingDataSync(config: SyncOptions, result: SyncResult): Promise<void> {
    console.log(`🔄 Handling missing ECB data for ${config.targetDate}`);
    
    try {
      const currencyPairs = await currencyConfigService.getCurrencyPairs();
      const gapResult = await this.gapFillingService.fillGapsForPairs(
        currencyPairs as [CurrencyType, CurrencyType][],
        1 // Only look 1 day back for missing data
      );
      
      result.gapsFilled = gapResult.filledGaps;
      result.success = gapResult.success;
      
      if (gapResult.errors.length > 0) {
        result.errors.push(...gapResult.errors.map(err => ({
          type: SyncErrorType.ECB_UNAVAILABLE,
          message: err.message,
          currency: `${err.fromCurrency}/${err.toCurrency}`,
          date: err.date,
          retryable: err.retryable,
          timestamp: new Date().toISOString()
        })));
      }
      
      console.log(`🔄 Missing data gap filling completed: ${result.gapsFilled} rates filled`);
      
    } catch (error) {
      result.errors.push({
        type: SyncErrorType.ECB_UNAVAILABLE,
        message: `Missing data handling failed: ${error instanceof Error ? error.message : String(error)}`,
        date: config.targetDate,
        retryable: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Sync fiat currencies (ECB rates)
   */
  async syncFiatCurrencies(targetDate?: string): Promise<SyncResult> {
    return this.executeDailySync({
      targetDate,
      forceUpdate: false,
      fillGaps: true,
      maxGapDays: 7
    });
  }

  /**
   * Execute surgical sync - only fetch rates for transactions that actually need them
   *
   * This is the recommended sync method for production use:
   * 1. Detects gaps between transactions and exchange rates
   * 2. Fetches only the specific rates needed
   * 3. Handles weekends/holidays automatically
   * 4. Works for both ECB and non-ECB currencies
   *
   * @param dryRun If true, just report what would be done without inserting
   * @returns Surgical backfill result
   */
  async executeSurgicalSync(dryRun: boolean = false): Promise<SurgicalBackfillResult> {
    console.log('🎯 Starting surgical exchange rate sync...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    return surgicalBackfillService.executeBackfill({
      dryRun,
      skipExisting: true
    });
  }

  /**
   * Get coverage statistics for exchange rates
   * Shows how many transactions have rates vs need them
   */
  async getCoverageStats() {
    return transactionRateGapService.getCoverageStats();
  }

  /**
   * Detect gaps without filling them
   * Useful for diagnostics and reporting
   */
  async detectGaps() {
    return transactionRateGapService.detectGaps();
  }

  /**
   * Perform gap filling after main sync
   */
  private async performGapFilling(config: SyncOptions, result: SyncResult): Promise<void> {
    console.log(`🔧 Performing gap filling (max ${config.maxGapDays} days)`);
    
    try {
      const currencyPairs = await currencyConfigService.getCurrencyPairs();
      const gapResult = await this.gapFillingService.fillGapsForPairs(
        currencyPairs as [CurrencyType, CurrencyType][],
        config.maxGapDays
      );
      
      result.gapsFilled += gapResult.filledGaps;
      
      if (gapResult.errors.length > 0) {
        result.errors.push(...gapResult.errors.map(err => ({
          type: SyncErrorType.PARTIAL_SUCCESS,
          message: err.message,
          currency: `${err.fromCurrency}/${err.toCurrency}`,
          date: err.date,
          retryable: err.retryable,
          timestamp: new Date().toISOString()
        })));
      }
      
      if (result.gapsFilled > 0) {
        console.log(`🔧 Gap filling completed: ${result.gapsFilled} additional rates filled`);
      }
      
    } catch (error) {
      result.errors.push({
        type: SyncErrorType.PARTIAL_SUCCESS,
        message: `Gap filling failed: ${error instanceof Error ? error.message : String(error)}`,
        date: config.targetDate,
        retryable: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if we should skip sync (data already exists)
   */
  private async shouldSkipSync(targetDate: string): Promise<boolean> {
    try {
      // Check if we have any data for this date
      const { data } = await db.exchangeRates.getByDate('USD', 'THB', targetDate);
      return data !== null;
    } catch (error) {
      console.warn(`⚠️  Could not check existing data for ${targetDate}, proceeding with sync`);
      return false;
    }
  }

  /**
   * Add EUR direct rates (EUR/XXX and XXX/EUR)
   */
  private addEurDirectRates(rates: ECBRate[], date: string): ProcessedRate[] {
    const eurRates: ProcessedRate[] = [];
    
    for (const rate of rates) {
      // EUR to other currency (direct ECB rate)
      eurRates.push({
        from_currency: 'EUR',
        to_currency: rate.currency as CurrencyType,
        rate: rate.rate,
        date,
        source: 'ECB',
        is_interpolated: false
      });
      
      // Other currency to EUR (inverse rate)
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
   * Deduplicate rates to avoid database conflicts
   * Uses currency pair + date as unique key
   */
  private deduplicateRates(rates: ProcessedRate[]): ProcessedRate[] {
    const uniqueRates = new Map<string, ProcessedRate>();
    
    for (const rate of rates) {
      const key = `${rate.from_currency}-${rate.to_currency}-${rate.date}`;
      
      // If we already have this rate, keep the one with higher precision or prefer ECB source
      if (uniqueRates.has(key)) {
        const existing = uniqueRates.get(key)!;
        
        // Prefer non-interpolated over interpolated
        if (existing.is_interpolated && !rate.is_interpolated) {
          uniqueRates.set(key, rate);
        }
        // If both have same interpolation status, prefer ECB source
        else if (existing.is_interpolated === rate.is_interpolated && rate.source === 'ECB') {
          uniqueRates.set(key, rate);
        }
        // Otherwise keep the existing one
      } else {
        uniqueRates.set(key, rate);
      }
    }
    
    return Array.from(uniqueRates.values());
  }

  /**
   * Insert rates with conflict handling
   */
  private async insertRatesWithConflictHandling(
    rates: ProcessedRate[], 
    forceUpdate: boolean
  ): Promise<number> {
    const exchangeRateInserts: ExchangeRateInsert[] = rates.map(rate => ({
      from_currency: rate.from_currency,
      to_currency: rate.to_currency,
      rate: rate.rate,
      date: rate.date,
      source: rate.source,
      is_interpolated: rate.is_interpolated
    }));
    
    if (forceUpdate) {
      // Use upsert to update existing records
      const { data, error } = await db.exchangeRates.upsert(exchangeRateInserts);
      if (error) {
        throw new Error(`Database upsert failed: ${error.message}`);
      }
      return data?.length || 0;
    } else {
      // Use bulk upsert to handle duplicates gracefully
      const { data, error } = await db.exchangeRates.bulkUpsert(exchangeRateInserts);
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      return data?.length || 0;
    }
  }

  /**
   * Validate sync data quality
   */
  private validateSyncData(rates: ECBRate[]): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (rates.length === 0) {
      result.valid = false;
      result.errors.push('No rates provided for validation');
      return result;
    }

    // Check for required currencies
    const requiredCurrencies = ['USD', 'THB', 'EUR', 'GBP'];
    const presentCurrencies = new Set(rates.map(r => r.currency));
    
    for (const currency of requiredCurrencies) {
      if (!presentCurrencies.has(currency)) {
        result.warnings.push(`Missing rates for ${currency}`);
      }
    }

    // Validate rate ranges (basic sanity check)
    for (const rate of rates) {
      if (rate.rate <= 0 || rate.rate > 1000000) {
        result.errors.push(`Invalid rate for ${rate.currency}: ${rate.rate}`);
        result.valid = false;
      }
      
      // Check for suspicious rate changes (> 10% from typical ranges)
      if (!this.isRateReasonable(rate)) {
        result.warnings.push(`Unusual rate detected for ${rate.currency}: ${rate.rate}`);
      }
    }

    return result;
  }

  /**
   * Check if a rate is within reasonable bounds
   */
  private isRateReasonable(rate: ECBRate): boolean {
    // Basic sanity checks for common ECB rates (EUR-based)
    const reasonableBounds: Record<string, { min: number; max: number }> = {
      'USD': { min: 0.8, max: 1.4 },
      'GBP': { min: 0.7, max: 1.0 },
      'THB': { min: 25, max: 50 },
      'SGD': { min: 1.2, max: 1.8 },
      'VND': { min: 20000, max: 30000 },
      'MYR': { min: 3.5, max: 5.5 }
    };
    
    const bounds = reasonableBounds[rate.currency];
    if (!bounds) return true; // No bounds defined, assume reasonable
    
    return rate.rate >= bounds.min && rate.rate <= bounds.max;
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= SYNC_RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < SYNC_RETRY_CONFIG.maxAttempts) {
          const delay = Math.min(
            SYNC_RETRY_CONFIG.baseDelay * Math.pow(SYNC_RETRY_CONFIG.backoffFactor, attempt - 1),
            SYNC_RETRY_CONFIG.maxDelay
          );
          
          console.warn(`${context} failed (attempt ${attempt}), retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Categorize sync error type
   */
  private categorizeSyncError(error: unknown): SyncErrorType {
    if (error instanceof ECBError) {
      switch (error.type) {
        case ECBErrorType.NETWORK_ERROR:
        case ECBErrorType.RATE_LIMIT:
          return SyncErrorType.ECB_UNAVAILABLE;
        case ECBErrorType.PARSE_ERROR:
          return SyncErrorType.PARSE_ERROR;
        case ECBErrorType.VALIDATION_ERROR:
          return SyncErrorType.VALIDATION_ERROR;
        default:
          return SyncErrorType.ECB_UNAVAILABLE;
      }
    }
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('database') || message.includes('insert') || message.includes('upsert')) {
        return SyncErrorType.DATABASE_ERROR;
      }
      
      if (message.includes('validation') || message.includes('invalid')) {
        return SyncErrorType.VALIDATION_ERROR;
      }
      
      if (message.includes('parse') || message.includes('xml')) {
        return SyncErrorType.PARSE_ERROR;
      }
    }
    
    return SyncErrorType.ECB_UNAVAILABLE;
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
             message.includes('connection') ||
             message.includes('unavailable');
    }
    
    return false;
  }
}

// Singleton instance
export const dailySyncService = new DailySyncService();