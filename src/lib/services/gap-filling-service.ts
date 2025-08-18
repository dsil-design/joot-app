import { db } from '../supabase/database';
import { dateHelpers, COMMON_HOLIDAYS } from '../utils/date-helpers';
import { CurrencyType, ExchangeRate, ExchangeRateInsert } from '../supabase/types';

export interface GapFillResult {
  success: boolean;
  totalGaps: number;
  filledGaps: number;
  errors: GapFillError[];
  filledDates: string[];
  duration: number;
}

export interface GapFillError {
  date: string;
  fromCurrency: CurrencyType;
  toCurrency: CurrencyType;
  message: string;
  retryable: boolean;
}

export interface GapAnalysis {
  missingDates: string[];
  availableDates: string[];
  gapRanges: Array<{
    startDate: string;
    endDate: string;
    dayCount: number;
  }>;
  totalGaps: number;
}

export interface InterpolationSource {
  date: string;
  rate: number;
  distance: number; // Days from target date
}

export class GapFillingService {
  /**
   * Find missing exchange rate dates for a currency pair
   * @param fromCurrency Source currency
   * @param toCurrency Target currency  
   * @param dayRange Number of days to look back
   * @returns Array of missing dates in YYYY-MM-DD format
   */
  async findMissingDates(
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType,
    dayRange: number = 30
  ): Promise<string[]> {
    const endDate = dateHelpers.getCurrentUTCDate();
    const startDate = dateHelpers.subtractBusinessDays(endDate, dayRange);
    
    console.log(`🔍 Finding missing rates for ${fromCurrency}/${toCurrency} from ${startDate} to ${endDate}`);
    
    // Get existing rates in the range
    const { data: existingRates, error } = await db.exchangeRates.getByDateRange(
      fromCurrency,
      toCurrency,
      startDate,
      endDate
    );
    
    if (error) {
      throw new Error(`Failed to query existing rates: ${error.message}`);
    }
    
    const existingDates = existingRates?.map(rate => rate.date) || [];
    
    // Find missing business days
    const missingDates = dateHelpers.findMissingDates(
      existingDates,
      startDate,
      endDate,
      true, // Business days only
      COMMON_HOLIDAYS.EU_2024 // Use EU holidays since we're dealing with ECB data
    );
    
    console.log(`📊 Found ${missingDates.length} missing dates out of ${dateHelpers.getBusinessDayCount(startDate, endDate)} business days`);
    
    return missingDates;
  }

  /**
   * Analyze gaps in exchange rate data
   * @param fromCurrency Source currency
   * @param toCurrency Target currency
   * @param dayRange Number of days to analyze
   * @returns Comprehensive gap analysis
   */
  async analyzeGaps(
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType,
    dayRange: number = 30
  ): Promise<GapAnalysis> {
    const endDate = dateHelpers.getCurrentUTCDate();
    const startDate = dateHelpers.subtractBusinessDays(endDate, dayRange);
    
    const { data: existingRates } = await db.exchangeRates.getByDateRange(
      fromCurrency,
      toCurrency,
      startDate,
      endDate
    );
    
    const availableDates = existingRates?.map(rate => rate.date).sort() || [];
    const expectedBusinessDays = dateHelpers.getBusinessDays(startDate, endDate, {
      holidays: COMMON_HOLIDAYS.EU_2024
    });
    
    const missingDates = dateHelpers.findMissingDates(
      availableDates,
      startDate,
      endDate,
      true,
      COMMON_HOLIDAYS.EU_2024
    );
    
    // Identify gap ranges (consecutive missing dates)
    const gapRanges = this.identifyGapRanges(missingDates);
    
    return {
      missingDates,
      availableDates,
      gapRanges,
      totalGaps: missingDates.length
    };
  }

  /**
   * Fill gaps for multiple currency pairs
   * @param currencyPairs Array of [from, to] currency pairs
   * @param maxGapDays Maximum number of days to fill gaps for
   * @returns Comprehensive fill result
   */
  async fillGapsForPairs(
    currencyPairs: Array<[CurrencyType, CurrencyType]>,
    maxGapDays: number = 7
  ): Promise<GapFillResult> {
    const startTime = Date.now();
    const result: GapFillResult = {
      success: true,
      totalGaps: 0,
      filledGaps: 0,
      errors: [],
      filledDates: [],
      duration: 0
    };
    
    console.log(`🔧 Filling gaps for ${currencyPairs.length} currency pairs`);
    
    for (const [fromCurrency, toCurrency] of currencyPairs) {
      try {
        const missingDates = await this.findMissingDates(fromCurrency, toCurrency, maxGapDays);
        result.totalGaps += missingDates.length;
        
        if (missingDates.length > 0) {
          console.log(`🔄 Filling ${missingDates.length} gaps for ${fromCurrency}/${toCurrency}`);
          
          const pairResult = await this.fillGaps(missingDates, fromCurrency, toCurrency);
          result.filledGaps += pairResult.filledGaps;
          result.errors.push(...pairResult.errors);
          result.filledDates.push(...pairResult.filledDates);
          
          if (!pairResult.success) {
            result.success = false;
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to fill gaps for ${fromCurrency}/${toCurrency}:`, error);
        
        result.errors.push({
          date: 'unknown',
          fromCurrency,
          toCurrency,
          message: error instanceof Error ? error.message : String(error),
          retryable: true
        });
        
        result.success = false;
      }
    }
    
    result.duration = Date.now() - startTime;
    
    console.log(`✅ Gap filling completed: ${result.filledGaps}/${result.totalGaps} gaps filled in ${Math.round(result.duration / 1000)}s`);
    
    return result;
  }

  /**
   * Fill gaps for missing dates using interpolation
   * @param missingDates Array of missing dates
   * @param fromCurrency Source currency
   * @param toCurrency Target currency
   * @returns Fill result for this currency pair
   */
  async fillGaps(
    missingDates: string[],
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType
  ): Promise<GapFillResult> {
    const startTime = Date.now();
    const result: GapFillResult = {
      success: true,
      totalGaps: missingDates.length,
      filledGaps: 0,
      errors: [],
      filledDates: [],
      duration: 0
    };
    
    if (missingDates.length === 0) {
      result.duration = Date.now() - startTime;
      return result;
    }
    
    const ratesToInsert: ExchangeRateInsert[] = [];
    
    for (const missingDate of missingDates) {
      try {
        // Find the best rate to use for interpolation
        const sourceRate = await this.findBestInterpolationSource(
          fromCurrency,
          toCurrency,
          missingDate
        );
        
        if (sourceRate) {
          ratesToInsert.push({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate: sourceRate.rate,
            date: missingDate,
            source: 'ECB',
            is_interpolated: true,
            interpolated_from_date: sourceRate.date
          });
          
          result.filledDates.push(missingDate);
        } else {
          result.errors.push({
            date: missingDate,
            fromCurrency,
            toCurrency,
            message: 'No suitable source rate found for interpolation',
            retryable: false
          });
        }
        
      } catch (error) {
        result.errors.push({
          date: missingDate,
          fromCurrency,
          toCurrency,
          message: error instanceof Error ? error.message : String(error),
          retryable: true
        });
      }
    }
    
    // Bulk insert interpolated rates
    if (ratesToInsert.length > 0) {
      try {
        const { data, error } = await db.exchangeRates.bulkUpsert(ratesToInsert);
        
        if (error) {
          throw new Error(`Failed to insert interpolated rates: ${error.message}`);
        }
        
        result.filledGaps = data?.length || 0;
        console.log(`💾 Inserted ${result.filledGaps} interpolated rates for ${fromCurrency}/${toCurrency}`);
        
      } catch (error) {
        result.success = false;
        result.errors.push({
          date: 'bulk_insert',
          fromCurrency,
          toCurrency,
          message: error instanceof Error ? error.message : String(error),
          retryable: true
        });
      }
    }
    
    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Handle weekend gaps specifically
   * @param targetDate The date to fill (should be weekend)
   * @param currencyPairs Currency pairs to process
   * @returns Gap fill result
   */
  async fillWeekendGaps(
    targetDate: string,
    currencyPairs: Array<[CurrencyType, CurrencyType]>
  ): Promise<GapFillResult> {
    const targetDateObj = new Date(targetDate);
    const dayOfWeek = targetDateObj.getDay();
    
    // Only process weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      throw new Error(`Target date ${targetDate} is not a weekend`);
    }
    
    console.log(`📅 Filling weekend gap for ${targetDate} (${dayOfWeek === 0 ? 'Sunday' : 'Saturday'})`);
    
    // Use Friday's rates for weekend
    const friday = dateHelpers.getPreviousBusinessDay(targetDate);
    
    const result: GapFillResult = {
      success: true,
      totalGaps: currencyPairs.length,
      filledGaps: 0,
      errors: [],
      filledDates: [],
      duration: 0
    };
    
    const startTime = Date.now();
    const ratesToInsert: ExchangeRateInsert[] = [];
    
    for (const [fromCurrency, toCurrency] of currencyPairs) {
      try {
        // Get Friday's rate
        const { data: fridayRate, error } = await db.exchangeRates.getByDate(
          fromCurrency,
          toCurrency,
          friday
        );
        
        if (error || !fridayRate) {
          result.errors.push({
            date: targetDate,
            fromCurrency,
            toCurrency,
            message: `No Friday rate available for interpolation from ${friday}`,
            retryable: false
          });
          continue;
        }
        
        ratesToInsert.push({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: fridayRate.rate,
          date: targetDate,
          source: 'ECB',
          is_interpolated: true,
          interpolated_from_date: friday
        });
        
        result.filledDates.push(targetDate);
        
      } catch (error) {
        result.errors.push({
          date: targetDate,
          fromCurrency,
          toCurrency,
          message: error instanceof Error ? error.message : String(error),
          retryable: true
        });
      }
    }
    
    // Bulk insert weekend rates
    if (ratesToInsert.length > 0) {
      try {
        const { data, error } = await db.exchangeRates.bulkUpsert(ratesToInsert);
        
        if (error) {
          throw new Error(`Failed to insert weekend rates: ${error.message}`);
        }
        
        result.filledGaps = data?.length || 0;
        console.log(`📅 Filled ${result.filledGaps} weekend rates for ${targetDate}`);
        
      } catch (error) {
        result.success = false;
        result.errors.push({
          date: targetDate,
          fromCurrency: 'USD', // Use placeholder currency for bulk operations
          toCurrency: 'USD',
          message: error instanceof Error ? error.message : String(error),
          retryable: true
        });
      }
    }
    
    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Find the best rate to use for interpolation
   * Prioritizes: 1) Most recent rate within 7 days, 2) Actual rates over interpolated
   * @param fromCurrency Source currency
   * @param toCurrency Target currency
   * @param targetDate Date to fill
   * @returns Best interpolation source or null
   */
  private async findBestInterpolationSource(
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType,
    targetDate: string
  ): Promise<InterpolationSource | null> {
    // Look for rates within 7 days before the target date
    const searchStartDate = dateHelpers.subtractBusinessDays(targetDate, 7);
    
    const { data: availableRates, error } = await db.exchangeRates.getByDateRange(
      fromCurrency,
      toCurrency,
      searchStartDate,
      dateHelpers.getPreviousDay(targetDate)
    );
    
    if (error || !availableRates || availableRates.length === 0) {
      return null;
    }
    
    // Sort by date (most recent first) and prefer actual rates over interpolated
    const sortedRates = availableRates.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, prefer actual rates
      if (a.is_interpolated && !b.is_interpolated) return 1;
      if (!a.is_interpolated && b.is_interpolated) return -1;
      return 0;
    });
    
    const bestRate = sortedRates[0];
    const targetDateObj = new Date(targetDate);
    const sourceDateObj = new Date(bestRate.date);
    const daysDifference = Math.abs(
      (targetDateObj.getTime() - sourceDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return {
      date: bestRate.date,
      rate: bestRate.rate,
      distance: daysDifference
    };
  }

  /**
   * Identify consecutive gap ranges
   * @param missingDates Sorted array of missing dates
   * @returns Array of gap ranges
   */
  private identifyGapRanges(missingDates: string[]): Array<{
    startDate: string;
    endDate: string;
    dayCount: number;
  }> {
    if (missingDates.length === 0) return [];
    
    const sortedDates = [...missingDates].sort();
    const ranges: Array<{ startDate: string; endDate: string; dayCount: number }> = [];
    
    let rangeStart = sortedDates[0];
    let rangeEnd = sortedDates[0];
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      const prevDate = new Date(sortedDates[i - 1]);
      
      // Check if dates are consecutive (within 1-3 days, accounting for weekends)
      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 3) {
        // Extend current range
        rangeEnd = sortedDates[i];
      } else {
        // Close current range and start new one
        ranges.push({
          startDate: rangeStart,
          endDate: rangeEnd,
          dayCount: dateHelpers.getBusinessDayCount(rangeStart, rangeEnd)
        });
        
        rangeStart = sortedDates[i];
        rangeEnd = sortedDates[i];
      }
    }
    
    // Add the last range
    ranges.push({
      startDate: rangeStart,
      endDate: rangeEnd,
      dayCount: dateHelpers.getBusinessDayCount(rangeStart, rangeEnd)
    });
    
    return ranges;
  }

  /**
   * Check if gaps should be filled based on business rules
   * @param missingDates Array of missing dates
   * @param maxGapSize Maximum gap size to fill
   * @returns Whether gaps should be filled
   */
  shouldFillGaps(missingDates: string[], maxGapSize: number = 5): boolean {
    if (missingDates.length === 0) return false;
    if (missingDates.length > maxGapSize) return false;
    
    // Don't fill gaps older than 30 days
    const oldestGap = missingDates[0];
    const daysSinceOldest = dateHelpers.getBusinessDayCount(
      oldestGap,
      dateHelpers.getCurrentUTCDate()
    );
    
    return daysSinceOldest <= 30;
  }
}

// Singleton instance
export const gapFillingService = new GapFillingService();