/**
 * ExchangeRate-API Service
 * Fetches exchange rates for currencies not available from ECB (e.g., VND)
 * Uses the free open.er-api.com endpoint (no API key required)
 *
 * API Documentation: https://www.exchangerate-api.com/docs/free
 * Endpoint: https://open.er-api.com/v6/latest/{BASE_CURRENCY}
 * Free Tier: Updated once per 24 hours, no rate limits for reasonable use
 */

import { createServiceRoleClient } from '../supabase/server';
import { CurrencyType } from '../supabase/types';

export interface ExchangeRateAPIResponse {
  result: string;
  provider: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  time_eol_unix: number;
  base_code: string;
  rates: { [currency: string]: number };
}

export interface ExchangeRateAPIHistoricalResponse {
  result: string;
  provider: string;
  documentation: string;
  terms_of_use: string;
  year: number;
  month: number;
  day: number;
  base_code: string;
  rates: { [currency: string]: number };
}

export enum ExchangeRateAPIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  UNSUPPORTED_DATE = 'UNSUPPORTED_DATE'
}

export class ExchangeRateAPIError extends Error {
  public type: ExchangeRateAPIErrorType;
  public originalError?: Error;

  constructor(type: ExchangeRateAPIErrorType, message: string, originalError?: Error) {
    super(message);
    this.name = 'ExchangeRateAPIError';
    this.type = type;
    this.originalError = originalError;
  }
}

class ExchangeRateAPIService {
  private readonly BASE_URL = 'https://open.er-api.com/v6';
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Fetch latest exchange rates for a base currency
   */
  async fetchLatestRates(baseCurrency: string = 'USD'): Promise<ExchangeRateAPIResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/latest/${baseCurrency}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Joot-App/1.0'
        }
      });

      if (!response.ok) {
        throw new ExchangeRateAPIError(
          ExchangeRateAPIErrorType.NETWORK_ERROR,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: ExchangeRateAPIResponse = await response.json();

      if (data.result !== 'success') {
        throw new ExchangeRateAPIError(
          ExchangeRateAPIErrorType.VALIDATION_ERROR,
          `API returned result: ${data.result}`
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ExchangeRateAPIError) {
        throw error;
      }
      throw new ExchangeRateAPIError(
        ExchangeRateAPIErrorType.NETWORK_ERROR,
        `Failed to fetch latest rates: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Fetch historical exchange rates for a specific date
   * NOTE: Free tier only supports dates from 2010 onwards
   */
  async fetchHistoricalRates(
    date: string, // YYYY-MM-DD format
    baseCurrency: string = 'USD'
  ): Promise<ExchangeRateAPIHistoricalResponse> {
    try {
      // Parse date
      const [year, month, day] = date.split('-').map(Number);

      // Validate date range (API supports 2010 onwards)
      if (year < 2010) {
        throw new ExchangeRateAPIError(
          ExchangeRateAPIErrorType.UNSUPPORTED_DATE,
          `Historical data only available from 2010 onwards. Requested: ${date}`
        );
      }

      const response = await fetch(
        `${this.BASE_URL}/history/${baseCurrency}/${year}/${month}/${day}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Joot-App/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new ExchangeRateAPIError(
          ExchangeRateAPIErrorType.NETWORK_ERROR,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: ExchangeRateAPIHistoricalResponse = await response.json();

      if (data.result !== 'success') {
        throw new ExchangeRateAPIError(
          ExchangeRateAPIErrorType.VALIDATION_ERROR,
          `API returned result: ${data.result}`
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ExchangeRateAPIError) {
        throw error;
      }
      throw new ExchangeRateAPIError(
        ExchangeRateAPIErrorType.NETWORK_ERROR,
        `Failed to fetch historical rates for ${date}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Backfill VND exchange rates for specific dates
   */
  async backfillVNDRates(dates: string[]): Promise<{
    success: boolean;
    inserted: number;
    failed: number;
    errors: string[];
  }> {
    console.log(`\n🔄 Backfilling VND exchange rates for ${dates.length} dates...`);

    let inserted = 0;
    let failed = 0;
    const errors: string[] = [];
    const supabase = createServiceRoleClient();

    for (const date of dates) {
      try {
        console.log(`  Fetching rates for ${date}...`);

        // Fetch historical rates from ExchangeRate-API
        const data = await this.fetchHistoricalRates(date, 'USD');

        if (!data.rates.VND) {
          throw new Error(`VND rate not found in response for ${date}`);
        }

        const vndRate = data.rates.VND;
        console.log(`    USD/VND rate: ${vndRate}`);

        // Calculate inverse rate (VND to USD)
        const usdVndRate = vndRate; // USD -> VND
        const vndUsdRate = 1 / vndRate; // VND -> USD

        // Insert both directions
        const ratesToInsert = [
          {
            from_currency: 'USD' as CurrencyType,
            to_currency: 'VND' as CurrencyType,
            rate: usdVndRate,
            date,
            source: 'EXCHANGERATE_API' as const,
            is_interpolated: false,
            interpolated_from_date: null
          },
          {
            from_currency: 'VND' as CurrencyType,
            to_currency: 'USD' as CurrencyType,
            rate: vndUsdRate,
            date,
            source: 'EXCHANGERATE_API' as const,
            is_interpolated: false,
            interpolated_from_date: null
          }
        ];

        const { error } = await supabase
          .from('exchange_rates')
          .upsert(ratesToInsert, {
            onConflict: 'from_currency,to_currency,date',
            ignoreDuplicates: false
          });

        if (error) {
          throw error;
        }

        console.log(`    ✅ Inserted USD/VND and VND/USD rates for ${date}`);
        inserted += 2;

        // Small delay to be respectful to the free API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        const errorMsg = `Failed to backfill ${date}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`    ❌ ${errorMsg}`);
        errors.push(errorMsg);
        failed++;
      }
    }

    const success = failed === 0;
    console.log(`\n${success ? '✅' : '⚠️'} Backfill complete: ${inserted} rates inserted, ${failed} failed`);

    return { success, inserted, failed, errors };
  }

  /**
   * Backfill VND rates for a date range
   */
  async backfillVNDRatesForDateRange(
    startDate: string,
    endDate: string
  ): Promise<{
    success: boolean;
    inserted: number;
    failed: number;
    errors: string[];
  }> {
    // Generate list of dates in range
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    console.log(`📅 Date range: ${startDate} to ${endDate} (${dates.length} days)`);

    return this.backfillVNDRates(dates);
  }

  /**
   * Get VND exchange rate for a specific date from database
   * If not found, returns null
   */
  async getVNDRate(date: string, fromCurrency: 'USD' | 'VND' = 'VND', toCurrency: 'USD' | 'VND' = 'USD'): Promise<number | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .eq('date', date)
      .single();

    if (error || !data) {
      return null;
    }

    return data.rate;
  }

  /**
   * Check if VND rates exist for a date
   */
  async hasVNDRatesForDate(date: string): Promise<boolean> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('id')
      .or(`and(from_currency.eq.USD,to_currency.eq.VND,date.eq.${date}),and(from_currency.eq.VND,to_currency.eq.USD,date.eq.${date})`)
      .limit(1);

    return !error && data && data.length > 0;
  }
}

// Export singleton instance
export const exchangeRateAPIService = new ExchangeRateAPIService();
