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
import { currencyConfigService } from './currency-config-service';

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

export enum ExchangeRateAPIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT'
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
  /**
   * Sync today's rates for all non-ECB fiat currencies (e.g. VND).
   * Called by the daily cron job after the ECB sync completes.
   */
  async syncNonECBRates(targetDate?: string): Promise<{
    success: boolean;
    inserted: number;
    errors: string[];
  }> {
    // Determine which currencies are not covered by ECB or crypto
    const ecbCurrencies = await currencyConfigService.getECBCurrencies();
    const allTracked = await currencyConfigService.getCurrencyConfig();

    const nonECBCurrencies = allTracked.allTracked.filter(
      c => !ecbCurrencies.includes(c) && c !== 'EUR' && !allTracked.cryptoCurrencies.includes(c)
    );

    if (nonECBCurrencies.length === 0) {
      return { success: true, inserted: 0, errors: [] };
    }

    const syncDate = targetDate || new Date().toISOString().split('T')[0];
    console.log(`Syncing non-ECB currencies: ${nonECBCurrencies.join(', ')} for ${syncDate}`);

    let inserted = 0;
    const errors: string[] = [];
    const supabase = createServiceRoleClient();

    try {
      const apiData = await this.fetchLatestRates('USD');

      for (const currency of nonECBCurrencies) {
        try {
          const rate = apiData.rates[currency];
          if (!rate) {
            errors.push(`${currency} not found in API response`);
            continue;
          }

          const ratesToInsert = [
            {
              from_currency: 'USD' as CurrencyType,
              to_currency: currency as CurrencyType,
              rate: rate,
              date: syncDate,
              source: 'EXCHANGERATE_API',
              is_interpolated: false,
              interpolated_from_date: null
            },
            {
              from_currency: currency as CurrencyType,
              to_currency: 'USD' as CurrencyType,
              rate: 1 / rate,
              date: syncDate,
              source: 'EXCHANGERATE_API',
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
            errors.push(`Failed to insert ${currency}: ${error.message}`);
          } else {
            inserted += 2;
          }
        } catch (err) {
          errors.push(`${currency}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`API fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { success: errors.length === 0, inserted, errors };
  }
}

// Export singleton instance
export const exchangeRateAPIService = new ExchangeRateAPIService();
