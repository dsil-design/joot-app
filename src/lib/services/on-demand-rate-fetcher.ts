/**
 * On-Demand Rate Fetcher Service
 * Fetches missing exchange rates on-demand from ECB when needed
 * Used as a fallback when scheduled syncs haven't run or failed
 */

import { createServiceRoleClient } from '../supabase/server';
import { CurrencyType } from '../supabase/types';
import { rateCalculator } from './rate-calculator';

export interface OnDemandRateFetchResult {
  success: boolean;
  date: string;
  ratesInserted: number;
  error?: string;
  cacheHit: boolean;
}

export class OnDemandRateFetcherService {
  private fetchCache = new Map<string, Promise<OnDemandRateFetchResult>>();
  private readonly ECB_DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

  /**
   * Fetch exchange rates for a specific date on-demand
   * If the rate already exists, returns immediately (cache hit)
   * If not, fetches from ECB and stores in database
   */
  async fetchRatesForDate(
    date: string,
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType
  ): Promise<OnDemandRateFetchResult> {
    const cacheKey = `${date}-${fromCurrency}-${toCurrency}`;

    // Check if we're already fetching this
    if (this.fetchCache.has(cacheKey)) {
      return this.fetchCache.get(cacheKey)!;
    }

    // Start the fetch and cache the promise
    const fetchPromise = this.fetchRatesForDateInternal(date, fromCurrency, toCurrency);
    this.fetchCache.set(cacheKey, fetchPromise);

    // Clean up cache after completion
    fetchPromise.finally(() => {
      setTimeout(() => this.fetchCache.delete(cacheKey), 60000); // Clean up after 1 minute
    });

    return fetchPromise;
  }

  private async fetchRatesForDateInternal(
    date: string,
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType
  ): Promise<OnDemandRateFetchResult> {
    try {
      console.log(`📡 On-demand fetch requested: ${fromCurrency}/${toCurrency} for ${date}`);

      // First check if the rate already exists (cache hit)
      const supabase = createServiceRoleClient();
      const { data: existing, error: checkError } = await supabase
        .from('exchange_rates')
        .select('id')
        .eq('date', date)
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .single();

      if (existing && !checkError) {
        console.log(`✅ Rate already exists (cache hit)`);
        return {
          success: true,
          date,
          ratesInserted: 0,
          cacheHit: true
        };
      }

      // For dates more than 90 days old, we should use the backfill service instead
      const daysSinceDate = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceDate > 90) {
        console.log(`⚠️  Date is ${daysSinceDate} days old, skipping on-demand fetch (use backfill instead)`);
        return {
          success: false,
          date,
          ratesInserted: 0,
          error: 'Date too old for on-demand fetch (use backfill service)',
          cacheHit: false
        };
      }

      // Fetch ECB daily rates (contains latest business day)
      console.log(`Fetching ECB daily rates...`);
      const response = await fetch(this.ECB_DAILY_URL, {
        headers: {
          'Accept': 'application/xml, text/xml',
          'User-Agent': 'Joot-OnDemand-Fetch/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`ECB API returned ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();

      // Parse XML
      let doc: Document;
      if (typeof DOMParser !== 'undefined') {
        doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      } else {
        const { JSDOM } = await import('jsdom');
        doc = new JSDOM(xmlText, { contentType: 'text/xml' }).window.document;
      }

      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML parsing failed');
      }

      // Extract rates from XML
      const timeCubes = Array.from(doc.querySelectorAll('Cube[time]'));
      if (timeCubes.length === 0) {
        throw new Error('No rates found in ECB XML');
      }

      // The daily XML only contains the latest business day, which might not be the requested date
      const latestTimeCube = timeCubes[0];
      const rateDate = latestTimeCube.getAttribute('time');

      if (!rateDate) {
        throw new Error('No date found in ECB XML');
      }

      console.log(`ECB latest rate date: ${rateDate} (requested: ${date})`);

      // Extract currency rates
      const rates: Array<{ currency: string; rate: number }> = [];
      const rateCubes = Array.from(latestTimeCube.querySelectorAll('Cube[currency][rate]'));

      for (const rateCube of rateCubes) {
        const currency = rateCube.getAttribute('currency');
        const rateStr = rateCube.getAttribute('rate');

        if (currency && rateStr) {
          const rate = parseFloat(rateStr);
          if (!isNaN(rate) && rate > 0) {
            rates.push({ currency, rate });
          }
        }
      }

      console.log(`Found ${rates.length} currency rates from ECB`);

      // Generate all currency pairs (EUR-based and cross rates)
      const currencyPairs: Array<{
        from_currency: CurrencyType;
        to_currency: CurrencyType;
        rate: number;
        date: string;
        source: string;
      }> = [];

      // Add EUR pairs
      for (const rate of rates) {
        currencyPairs.push({
          from_currency: 'EUR' as CurrencyType,
          to_currency: rate.currency as CurrencyType,
          rate: rate.rate,
          date: rateDate,
          source: 'ECB_OnDemand'
        });

        currencyPairs.push({
          from_currency: rate.currency as CurrencyType,
          to_currency: 'EUR' as CurrencyType,
          rate: 1 / rate.rate,
          date: rateDate,
          source: 'ECB_OnDemand'
        });
      }

      // Calculate cross rates
      const crossRates = rateCalculator.calculateCrossRates(
        rates.map(r => ({ currency: r.currency, rate: r.rate, date: rateDate }))
      );

      for (const crossRate of crossRates) {
        currencyPairs.push({
          from_currency: crossRate.from_currency as CurrencyType,
          to_currency: crossRate.to_currency as CurrencyType,
          rate: crossRate.rate,
          date: rateDate,
          source: 'ECB_OnDemand'
        });
      }

      console.log(`Generated ${currencyPairs.length} total currency pairs`);

      // Insert into database (upsert to handle duplicates)
      const insertData = currencyPairs.map(pair => ({
        from_currency: pair.from_currency,
        to_currency: pair.to_currency,
        rate: pair.rate,
        date: pair.date,
        source: pair.source,
        is_interpolated: false,
        interpolated_from_date: null
      }));

      const { data: insertResult, error: insertError } = await supabase
        .from('exchange_rates')
        .upsert(insertData, {
          onConflict: 'from_currency,to_currency,date',
          ignoreDuplicates: false
        });

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ Successfully inserted ${currencyPairs.length} rates for ${rateDate}`);

      return {
        success: true,
        date: rateDate,
        ratesInserted: currencyPairs.length,
        cacheHit: false
      };

    } catch (error) {
      console.error('❌ On-demand rate fetch failed:', error);

      return {
        success: false,
        date,
        ratesInserted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        cacheHit: false
      };
    }
  }
}

// Export singleton instance
export const onDemandRateFetcher = new OnDemandRateFetcherService();
