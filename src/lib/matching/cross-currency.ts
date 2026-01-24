/**
 * Cross-Currency Converter for Transaction Matching
 *
 * Converts amounts between currencies using stored historical exchange rates.
 * Used by the matching algorithm to compare transactions in different currencies.
 *
 * Uses the existing `exchange_rates` table which is populated by daily sync.
 * Falls back to nearest available rate when exact date not found.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Result of a currency conversion
 */
export interface ConversionResult {
  /** Converted amount */
  convertedAmount: number;

  /** Exchange rate used */
  rate: number;

  /** Date of the rate used */
  rateDate: string;

  /** Whether the exact date rate was used or a fallback */
  isExactRate: boolean;

  /** Days difference if fallback rate used */
  rateDaysDiff: number;

  /** Source currency */
  fromCurrency: string;

  /** Target currency */
  toCurrency: string;

  /** Original amount */
  originalAmount: number;
}

/**
 * Configuration for currency conversion
 */
export interface ConversionConfig {
  /** Maximum days to look back for a rate (default: 30) */
  maxDaysBack?: number;

  /** Whether to allow approximate rates (default: true) */
  allowApproximate?: boolean;
}

/**
 * Exchange rate data from database
 */
interface ExchangeRateRow {
  rate: number;
  date: string;
  from_currency: string;
  to_currency: string;
  created_at?: string;
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get exchange rate for a specific date from the database
 *
 * @param supabase - Supabase client
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param date - Date to get rate for (YYYY-MM-DD)
 * @param config - Optional configuration
 * @returns Exchange rate data or null if not found
 */
export async function getExchangeRate(
  supabase: SupabaseClient,
  fromCurrency: string,
  toCurrency: string,
  date: string,
  config: ConversionConfig = {}
): Promise<{ rate: number; date: string; isExact: boolean } | null> {
  const { maxDaysBack = 30, allowApproximate = true } = config;

  // Same currency - no conversion needed
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return { rate: 1, date, isExact: true };
  }

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Try to get exact date rate
  const { data: exactRate } = await supabase
    .from('exchange_rates')
    .select('rate, date')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .eq('date', date)
    .single();

  if (exactRate) {
    return {
      rate: exactRate.rate,
      date: exactRate.date,
      isExact: true,
    };
  }

  // If exact not found and approximation not allowed, return null
  if (!allowApproximate) {
    return null;
  }

  // Try to find nearest rate (prefer earlier dates)
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - maxDaysBack);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data: nearestRates } = await supabase
    .from('exchange_rates')
    .select('rate, date')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .gte('date', startDateStr)
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1);

  if (nearestRates && nearestRates.length > 0) {
    return {
      rate: nearestRates[0].rate,
      date: nearestRates[0].date,
      isExact: false,
    };
  }

  // Also try future dates (in case transaction is near end of rate data)
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 7); // Only look forward 7 days
  const endDateStr = endDate.toISOString().split('T')[0];

  const { data: futureRates } = await supabase
    .from('exchange_rates')
    .select('rate, date')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .gt('date', date)
    .lte('date', endDateStr)
    .order('date', { ascending: true })
    .limit(1);

  if (futureRates && futureRates.length > 0) {
    return {
      rate: futureRates[0].rate,
      date: futureRates[0].date,
      isExact: false,
    };
  }

  return null;
}

/**
 * Convert an amount from one currency to another using historical rate
 *
 * @param supabase - Supabase client
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param date - Transaction date (YYYY-MM-DD)
 * @param config - Optional configuration
 * @returns Conversion result or null if rate not found
 */
export async function convertAmount(
  supabase: SupabaseClient,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string,
  config: ConversionConfig = {}
): Promise<ConversionResult | null> {
  const rateInfo = await getExchangeRate(
    supabase,
    fromCurrency,
    toCurrency,
    date,
    config
  );

  if (!rateInfo) {
    return null;
  }

  const convertedAmount = amount * rateInfo.rate;
  const rateDaysDiff = daysBetween(date, rateInfo.date);

  return {
    convertedAmount,
    rate: rateInfo.rate,
    rateDate: rateInfo.date,
    isExactRate: rateInfo.isExact,
    rateDaysDiff,
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase(),
    originalAmount: amount,
  };
}

/**
 * Convert multiple amounts in batch for efficiency
 *
 * @param supabase - Supabase client
 * @param conversions - Array of conversion requests
 * @param config - Optional configuration
 * @returns Map of request index to conversion result
 */
export async function convertAmountsBatch(
  supabase: SupabaseClient,
  conversions: Array<{
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    date: string;
  }>,
  config: ConversionConfig = {}
): Promise<Map<number, ConversionResult | null>> {
  const results = new Map<number, ConversionResult | null>();

  // Group by currency pair and date to minimize queries
  const rateCache = new Map<string, { rate: number; date: string; isExact: boolean } | null>();

  for (let i = 0; i < conversions.length; i++) {
    const { amount, fromCurrency, toCurrency, date } = conversions[i];
    const cacheKey = `${fromCurrency}-${toCurrency}-${date}`;

    let rateInfo = rateCache.get(cacheKey);
    if (rateInfo === undefined) {
      rateInfo = await getExchangeRate(supabase, fromCurrency, toCurrency, date, config);
      rateCache.set(cacheKey, rateInfo);
    }

    if (rateInfo) {
      const convertedAmount = amount * rateInfo.rate;
      const rateDaysDiff = daysBetween(date, rateInfo.date);

      results.set(i, {
        convertedAmount,
        rate: rateInfo.rate,
        rateDate: rateInfo.date,
        isExactRate: rateInfo.isExact,
        rateDaysDiff,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        originalAmount: amount,
      });
    } else {
      results.set(i, null);
    }
  }

  return results;
}

/**
 * Check if a conversion is within acceptable tolerance
 * Used to validate cross-currency matches
 *
 * @param originalAmount - Original amount in source currency
 * @param convertedAmount - Amount after conversion
 * @param targetAmount - Amount to compare against
 * @param tolerance - Acceptable percentage difference (default: 2%)
 * @returns Whether the amounts match within tolerance
 */
export function isWithinConversionTolerance(
  originalAmount: number,
  convertedAmount: number,
  targetAmount: number,
  tolerance = 2
): boolean {
  // Use the target amount as the reference for percentage calculation
  const percentDiff =
    (Math.abs(convertedAmount - targetAmount) / Math.abs(targetAmount)) * 100;
  return percentDiff <= tolerance;
}

/**
 * Get rate quality score based on how close the rate date is to the transaction date
 * Used to adjust matching confidence when using approximate rates
 *
 * @param rateDaysDiff - Days between transaction and rate date
 * @returns Quality score (0-100)
 */
export function getRateQualityScore(rateDaysDiff: number): number {
  if (rateDaysDiff === 0) return 100; // Exact date
  if (rateDaysDiff <= 1) return 95;
  if (rateDaysDiff <= 3) return 85;
  if (rateDaysDiff <= 7) return 70;
  if (rateDaysDiff <= 14) return 50;
  if (rateDaysDiff <= 30) return 30;
  return 10; // Very old rate
}

/**
 * Format conversion result for logging/debugging
 */
export function formatConversionLog(result: ConversionResult): string {
  const exactness = result.isExactRate
    ? 'exact rate'
    : `approximate rate (${result.rateDaysDiff} days diff)`;

  return [
    `${result.fromCurrency} ${result.originalAmount.toFixed(2)}`,
    `→ ${result.toCurrency} ${result.convertedAmount.toFixed(2)}`,
    `(rate: ${result.rate.toFixed(6)} from ${result.rateDate}, ${exactness})`,
  ].join(' ');
}
