/**
 * Surgical Backfill Service
 *
 * Fetches exchange rates only for specific (currency, date) pairs
 * identified by the gap detection service. This implements the
 * "surgical exchange rate alignment" approach - no pre-fetching,
 * no "active windows", just exact alignment between transactions and rates.
 *
 * Key principles:
 * 1. Only fetch rates that are actually needed
 * 2. Handle weekends/holidays by using nearest available rate
 * 3. Support ECB currencies (via EUR cross-rates) and non-ECB currencies (VND)
 * 4. Always create bidirectional rates (X→USD and USD→X)
 */

import { createServiceRoleClient } from '../supabase/server';
import { CurrencyType, ExchangeRateInsert } from '../supabase/types';
import { ecbFetcher } from './ecb-fetcher';
import { exchangeRateAPIService } from './exchangerate-api-service';
import { rateCalculator } from './rate-calculator';
import { dateHelpers, COMMON_HOLIDAYS } from '../utils/date-helpers';
import { RateGap, transactionRateGapService } from './transaction-rate-gap-service';
import { ECBRate } from '../types/exchange-rates';

export interface SurgicalBackfillOptions {
  dryRun?: boolean;           // If true, don't insert, just log what would be done
  maxGapsPerRun?: number;     // Limit gaps processed per run (default: unlimited)
  skipExisting?: boolean;     // Skip if rate already exists (default: true)
}

export interface SurgicalBackfillResult {
  success: boolean;
  totalGaps: number;
  ratesInserted: number;
  ratesSkipped: number;
  errors: BackfillError[];
  duration: number;
  details: {
    ecbRates: number;
    nonEcbRates: number;
    interpolated: number;
  };
}

export interface BackfillError {
  currency: string;
  date: string;
  message: string;
  retryable: boolean;
}

class SurgicalBackfillService {
  /**
   * Main entry point: detect gaps and backfill them
   */
  async executeBackfill(options: SurgicalBackfillOptions = {}): Promise<SurgicalBackfillResult> {
    const startTime = Date.now();
    const config: Required<SurgicalBackfillOptions> = {
      dryRun: options.dryRun ?? false,
      maxGapsPerRun: options.maxGapsPerRun ?? Infinity,
      skipExisting: options.skipExisting ?? true
    };

    console.log('🎯 Starting surgical exchange rate backfill...');
    console.log(`   Options: dryRun=${config.dryRun}, maxGaps=${config.maxGapsPerRun}, skipExisting=${config.skipExisting}`);

    const result: SurgicalBackfillResult = {
      success: true,
      totalGaps: 0,
      ratesInserted: 0,
      ratesSkipped: 0,
      errors: [],
      duration: 0,
      details: {
        ecbRates: 0,
        nonEcbRates: 0,
        interpolated: 0
      }
    };

    try {
      // Step 1: Detect gaps
      const gapResult = await transactionRateGapService.detectGaps();

      if (!gapResult.success) {
        throw new Error(`Gap detection failed: ${gapResult.error}`);
      }

      if (gapResult.gaps.length === 0) {
        console.log('✅ No exchange rate gaps found - all transactions have rates!');
        result.duration = Date.now() - startTime;
        return result;
      }

      // Apply max gaps limit if set
      let gapsToProcess = gapResult.gaps;
      if (config.maxGapsPerRun < Infinity && gapsToProcess.length > config.maxGapsPerRun) {
        console.log(`📋 Limiting to ${config.maxGapsPerRun} gaps (${gapsToProcess.length} total)`);
        gapsToProcess = gapsToProcess.slice(0, config.maxGapsPerRun);
      }

      result.totalGaps = gapsToProcess.length;
      console.log(`📊 Processing ${gapsToProcess.length} exchange rate gaps...`);

      // Step 2: Categorize gaps by source
      const { ecbGaps, nonEcbGaps } = transactionRateGapService.categorizeGapsBySource(gapsToProcess);

      console.log(`   ECB currencies: ${ecbGaps.length} gaps`);
      console.log(`   Non-ECB currencies (VND): ${nonEcbGaps.length} gaps`);

      // Step 3: Process ECB gaps
      if (ecbGaps.length > 0) {
        const ecbResult = await this.processECBGaps(ecbGaps, config);
        result.ratesInserted += ecbResult.inserted;
        result.ratesSkipped += ecbResult.skipped;
        result.details.ecbRates = ecbResult.inserted;
        result.details.interpolated += ecbResult.interpolated;
        result.errors.push(...ecbResult.errors);
      }

      // Step 4: Process non-ECB gaps (VND)
      if (nonEcbGaps.length > 0) {
        const nonEcbResult = await this.processNonECBGaps(nonEcbGaps, config);
        result.ratesInserted += nonEcbResult.inserted;
        result.ratesSkipped += nonEcbResult.skipped;
        result.details.nonEcbRates = nonEcbResult.inserted;
        result.errors.push(...nonEcbResult.errors);
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      console.log(`🎉 Surgical backfill completed in ${Math.round(result.duration / 1000)}s`);
      console.log(`   Inserted: ${result.ratesInserted} rates`);
      console.log(`   Skipped: ${result.ratesSkipped} rates`);
      console.log(`   Errors: ${result.errors.length}`);

      return result;

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push({
        currency: 'ALL',
        date: 'ALL',
        message: error instanceof Error ? error.message : String(error),
        retryable: true
      });

      console.error('❌ Surgical backfill failed:', error);
      return result;
    }
  }

  /**
   * Process gaps for ECB-available currencies (THB, CNY, etc.)
   * These use EUR cross-rates from ECB data
   */
  private async processECBGaps(
    gaps: RateGap[],
    config: Required<SurgicalBackfillOptions>
  ): Promise<{ inserted: number; skipped: number; interpolated: number; errors: BackfillError[] }> {
    console.log(`🇪🇺 Processing ${gaps.length} ECB currency gaps...`);

    const result = { inserted: 0, skipped: 0, interpolated: 0, errors: [] as BackfillError[] };

    // Group gaps by date for efficient processing
    const gapsByDate = new Map<string, RateGap[]>();
    for (const gap of gaps) {
      const existing = gapsByDate.get(gap.date) || [];
      existing.push(gap);
      gapsByDate.set(gap.date, existing);
    }

    // Get unique dates and sort
    const uniqueDates = Array.from(gapsByDate.keys()).sort();
    console.log(`   Fetching rates for ${uniqueDates.length} unique dates...`);

    // Fetch ECB historical data once
    let ecbRates: ECBRate[] = [];
    try {
      const fetchResult = await ecbFetcher.fetchHistoricalRates();
      if (fetchResult.success && fetchResult.data) {
        ecbRates = fetchResult.data;
        console.log(`   ✅ Fetched ${ecbRates.length} historical ECB rates`);
      } else {
        throw new Error(`ECB fetch failed: ${fetchResult.error}`);
      }
    } catch (error) {
      console.error('   ❌ Failed to fetch ECB historical data:', error);
      result.errors.push({
        currency: 'ECB',
        date: 'ALL',
        message: `ECB fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        retryable: true
      });
      return result;
    }

    // Create rate lookup by date
    const ratesByDate = new Map<string, Map<string, number>>();
    for (const rate of ecbRates) {
      if (!ratesByDate.has(rate.date)) {
        ratesByDate.set(rate.date, new Map());
      }
      ratesByDate.get(rate.date)!.set(rate.currency, rate.rate);
    }

    // Process each date
    const ratesToInsert: ExchangeRateInsert[] = [];

    for (const date of uniqueDates) {
      const gapsForDate = gapsByDate.get(date)!;

      for (const gap of gapsForDate) {
        try {
          // First try exact date
          let rateInfo = this.findRateForDate(gap.currency, date, ratesByDate);

          // If not found, try fallback (weekend/holiday handling)
          if (!rateInfo) {
            rateInfo = this.findNearestRate(gap.currency, date, ratesByDate);
            if (rateInfo) {
              result.interpolated++;
            }
          }

          if (!rateInfo) {
            result.errors.push({
              currency: gap.currency,
              date,
              message: `No ECB rate available (checked ${date} and nearby dates)`,
              retryable: false
            });
            continue;
          }

          // Calculate cross-rate to USD
          const usdRate = ratesByDate.get(rateInfo.sourceDate)?.get('USD');
          if (!usdRate) {
            result.errors.push({
              currency: gap.currency,
              date,
              message: `No USD rate available for cross-rate calculation on ${rateInfo.sourceDate}`,
              retryable: false
            });
            continue;
          }

          // Cross-rate: XXX/USD = EUR/USD / EUR/XXX
          const crossRate = usdRate / rateInfo.rate;
          const inverseRate = 1 / crossRate;

          // Add both directions
          ratesToInsert.push({
            from_currency: gap.currency,
            to_currency: 'USD',
            rate: crossRate,
            date,
            source: 'ECB',
            is_interpolated: rateInfo.interpolated,
            interpolated_from_date: rateInfo.interpolated ? rateInfo.sourceDate : null
          });

          ratesToInsert.push({
            from_currency: 'USD',
            to_currency: gap.currency,
            rate: inverseRate,
            date,
            source: 'ECB',
            is_interpolated: rateInfo.interpolated,
            interpolated_from_date: rateInfo.interpolated ? rateInfo.sourceDate : null
          });

        } catch (error) {
          result.errors.push({
            currency: gap.currency,
            date,
            message: error instanceof Error ? error.message : String(error),
            retryable: true
          });
        }
      }
    }

    // Insert rates (unless dry run)
    if (!config.dryRun && ratesToInsert.length > 0) {
      const insertResult = await this.insertRates(ratesToInsert, config.skipExisting);
      result.inserted = insertResult.inserted;
      result.skipped = insertResult.skipped;
    } else if (config.dryRun) {
      console.log(`   🔍 DRY RUN: Would insert ${ratesToInsert.length} ECB rates`);
      result.skipped = ratesToInsert.length;
    }

    return result;
  }

  /**
   * Process gaps for non-ECB currencies (VND)
   * Uses ExchangeRate-API service
   */
  private async processNonECBGaps(
    gaps: RateGap[],
    config: Required<SurgicalBackfillOptions>
  ): Promise<{ inserted: number; skipped: number; errors: BackfillError[] }> {
    console.log(`🌏 Processing ${gaps.length} non-ECB currency gaps (VND)...`);

    const result = { inserted: 0, skipped: 0, errors: [] as BackfillError[] };
    const ratesToInsert: ExchangeRateInsert[] = [];

    // Group by currency for batch processing
    const gapsByCurrency = transactionRateGapService.groupGapsByCurrency(gaps);

    for (const [currency, dates] of Array.from(gapsByCurrency)) {
      console.log(`   Processing ${currency}: ${dates.length} dates`);

      if (currency === 'VND') {
        // Use ExchangeRate-API for VND
        for (const date of dates) {
          try {
            const historicalData = await exchangeRateAPIService.fetchHistoricalRates(date, 'USD');

            if (!historicalData.rates.VND) {
              result.errors.push({
                currency,
                date,
                message: 'VND rate not found in API response',
                retryable: false
              });
              continue;
            }

            const vndRate = historicalData.rates.VND;

            // Add both directions
            ratesToInsert.push({
              from_currency: 'USD',
              to_currency: 'VND',
              rate: vndRate,
              date,
              source: 'EXCHANGERATE_API' as any,
              is_interpolated: false,
              interpolated_from_date: null
            });

            ratesToInsert.push({
              from_currency: 'VND',
              to_currency: 'USD',
              rate: 1 / vndRate,
              date,
              source: 'EXCHANGERATE_API' as any,
              is_interpolated: false,
              interpolated_from_date: null
            });

            // Small delay to be respectful to free API
            await new Promise(resolve => setTimeout(resolve, 300));

          } catch (error) {
            result.errors.push({
              currency,
              date,
              message: error instanceof Error ? error.message : String(error),
              retryable: true
            });
          }
        }
      } else {
        // Unknown non-ECB currency
        for (const date of dates) {
          result.errors.push({
            currency,
            date,
            message: `No rate source configured for ${currency}`,
            retryable: false
          });
        }
      }
    }

    // Insert rates (unless dry run)
    if (!config.dryRun && ratesToInsert.length > 0) {
      const insertResult = await this.insertRates(ratesToInsert, config.skipExisting);
      result.inserted = insertResult.inserted;
      result.skipped = insertResult.skipped;
    } else if (config.dryRun) {
      console.log(`   🔍 DRY RUN: Would insert ${ratesToInsert.length} non-ECB rates`);
      result.skipped = ratesToInsert.length;
    }

    return result;
  }

  /**
   * Find rate for exact date
   */
  private findRateForDate(
    currency: string,
    date: string,
    ratesByDate: Map<string, Map<string, number>>
  ): { rate: number; sourceDate: string; interpolated: boolean } | null {
    const dateRates = ratesByDate.get(date);
    if (dateRates?.has(currency)) {
      return {
        rate: dateRates.get(currency)!,
        sourceDate: date,
        interpolated: false
      };
    }
    return null;
  }

  /**
   * Find nearest available rate for weekends/holidays
   * Looks up to 7 days back for a valid rate
   */
  private findNearestRate(
    currency: string,
    targetDate: string,
    ratesByDate: Map<string, Map<string, number>>
  ): { rate: number; sourceDate: string; interpolated: boolean } | null {
    const targetDateObj = new Date(targetDate);

    // Try each day going backwards up to 7 days
    for (let daysBack = 1; daysBack <= 7; daysBack++) {
      const checkDate = new Date(targetDateObj);
      checkDate.setDate(checkDate.getDate() - daysBack);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      const dateRates = ratesByDate.get(checkDateStr);
      if (dateRates?.has(currency)) {
        console.log(`   📅 Using ${checkDateStr} rate for ${targetDate} (${currency})`);
        return {
          rate: dateRates.get(currency)!,
          sourceDate: checkDateStr,
          interpolated: true
        };
      }
    }

    return null;
  }

  /**
   * Insert rates to database with deduplication
   */
  private async insertRates(
    rates: ExchangeRateInsert[],
    skipExisting: boolean
  ): Promise<{ inserted: number; skipped: number }> {
    const supabase = createServiceRoleClient();

    // Deduplicate rates
    const uniqueRates = new Map<string, ExchangeRateInsert>();
    for (const rate of rates) {
      const key = `${rate.from_currency}:${rate.to_currency}:${rate.date}`;
      uniqueRates.set(key, rate);
    }

    const ratesToInsert = Array.from(uniqueRates.values());
    console.log(`   💾 Inserting ${ratesToInsert.length} unique rates...`);

    const { data, error } = await supabase
      .from('exchange_rates')
      .upsert(ratesToInsert, {
        onConflict: 'from_currency,to_currency,date',
        ignoreDuplicates: skipExisting
      })
      .select();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    const inserted = data?.length || 0;
    const skipped = ratesToInsert.length - inserted;

    return { inserted, skipped };
  }

  /**
   * Backfill specific gaps (for manual/targeted backfill)
   */
  async backfillSpecificGaps(
    gaps: Array<{ currency: CurrencyType; date: string }>,
    options: SurgicalBackfillOptions = {}
  ): Promise<SurgicalBackfillResult> {
    const rateGaps: RateGap[] = gaps.map(g => ({
      currency: g.currency,
      date: g.date,
      transactionCount: 1
    }));

    // Override gap detection with provided gaps
    const originalDetectGaps = transactionRateGapService.detectGaps.bind(transactionRateGapService);

    try {
      // Temporarily override detectGaps
      (transactionRateGapService as any).detectGaps = async () => ({
        success: true,
        gaps: rateGaps,
        totalTransactionsNeedingRates: rateGaps.length,
        totalMissingRates: rateGaps.length,
        byCurrency: {}
      });

      return await this.executeBackfill(options);
    } finally {
      // Restore original method
      (transactionRateGapService as any).detectGaps = originalDetectGaps;
    }
  }
}

// Singleton instance
export const surgicalBackfillService = new SurgicalBackfillService();
