/**
 * Transaction Rate Gap Service
 *
 * Detects gaps between transactions and exchange rates.
 * For every non-USD transaction, ensures an exchange rate exists for
 * (currency → USD) on that exact date.
 *
 * This implements "surgical exchange rate alignment" - only fetching
 * rates that are actually needed for transaction conversion.
 */

import { createServiceRoleClient } from '../supabase/server';
import { CurrencyType } from '../supabase/types';

export interface RateGap {
  currency: CurrencyType;
  date: string;
  transactionCount: number;
}

export interface GapDetectionResult {
  success: boolean;
  gaps: RateGap[];
  totalTransactionsNeedingRates: number;
  totalMissingRates: number;
  byCurrency: Record<string, number>;
  error?: string;
}

export interface TransactionWithoutRate {
  original_currency: CurrencyType;
  transaction_date: string;
  count: number;
}

/**
 * The display currency that all transactions convert to
 * This is the "home" currency - transactions in this currency need no conversion
 */
const DISPLAY_CURRENCY: CurrencyType = 'USD';

class TransactionRateGapService {
  /**
   * Find all transactions that don't have corresponding exchange rates.
   *
   * For each non-USD transaction, we need a rate for:
   * - original_currency → USD on transaction_date
   *
   * Returns a list of (currency, date) pairs that need fetching.
   */
  async detectGaps(): Promise<GapDetectionResult> {
    const supabase = createServiceRoleClient();

    try {
      console.log('🔍 Detecting exchange rate gaps for transactions...');

      // Use direct query approach (RPC function not implemented)
      // The RPC approach would be more efficient for large datasets,
      // but direct query works fine for our scale
      return await this.detectGapsDirectQuery();

    } catch (error) {
      console.error('❌ Gap detection failed:', error);
      return {
        success: false,
        gaps: [],
        totalTransactionsNeedingRates: 0,
        totalMissingRates: 0,
        byCurrency: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Direct query approach for gap detection
   * Used when the RPC function is not available
   */
  private async detectGapsDirectQuery(): Promise<GapDetectionResult> {
    const supabase = createServiceRoleClient();

    try {
      // Step 1: Get all distinct (currency, date) pairs from transactions
      // where currency is not USD (the display currency)
      const { data: transactionPairs, error: txError } = await supabase
        .from('transactions')
        .select('original_currency, transaction_date')
        .neq('original_currency', DISPLAY_CURRENCY);

      if (txError) {
        throw new Error(`Failed to query transactions: ${txError.message}`);
      }

      if (!transactionPairs || transactionPairs.length === 0) {
        console.log('✅ No non-USD transactions found - no rates needed');
        return {
          success: true,
          gaps: [],
          totalTransactionsNeedingRates: 0,
          totalMissingRates: 0,
          byCurrency: {}
        };
      }

      // Group and count transactions by (currency, date)
      const transactionMap = new Map<string, { currency: CurrencyType; date: string; count: number }>();

      for (const tx of transactionPairs) {
        const key = `${tx.original_currency}:${tx.transaction_date}`;
        const existing = transactionMap.get(key);

        if (existing) {
          existing.count++;
        } else {
          transactionMap.set(key, {
            currency: tx.original_currency as CurrencyType,
            date: tx.transaction_date,
            count: 1
          });
        }
      }

      console.log(`📊 Found ${transactionMap.size} unique (currency, date) pairs across ${transactionPairs.length} transactions`);

      // Step 2: Get all existing exchange rates for these pairs
      const uniqueCurrencies = Array.from(new Set(transactionPairs.map(tx => tx.original_currency)));

      const { data: existingRates, error: ratesError } = await supabase
        .from('exchange_rates')
        .select('from_currency, date')
        .in('from_currency', uniqueCurrencies)
        .eq('to_currency', DISPLAY_CURRENCY);

      if (ratesError) {
        throw new Error(`Failed to query exchange rates: ${ratesError.message}`);
      }

      // Create a set of existing rates for fast lookup
      const existingRatesSet = new Set<string>();
      if (existingRates) {
        for (const rate of existingRates) {
          existingRatesSet.add(`${rate.from_currency}:${rate.date}`);
        }
      }

      console.log(`📈 Found ${existingRatesSet.size} existing exchange rates`);

      // Step 3: Find gaps - transactions without corresponding rates
      const gaps: RateGap[] = [];
      const byCurrency: Record<string, number> = {};
      let totalTransactionsNeedingRates = 0;

      for (const [key, value] of Array.from(transactionMap)) {
        if (!existingRatesSet.has(key)) {
          gaps.push({
            currency: value.currency,
            date: value.date,
            transactionCount: value.count
          });

          byCurrency[value.currency] = (byCurrency[value.currency] || 0) + 1;
          totalTransactionsNeedingRates += value.count;
        }
      }

      // Sort gaps by date (oldest first) for efficient backfilling
      gaps.sort((a, b) => a.date.localeCompare(b.date));

      console.log(`🔎 Found ${gaps.length} missing exchange rates affecting ${totalTransactionsNeedingRates} transactions`);

      if (gaps.length > 0) {
        console.log('📋 Missing rates by currency:');
        for (const [currency, count] of Object.entries(byCurrency)) {
          console.log(`   ${currency}: ${count} dates`);
        }
      }

      return {
        success: true,
        gaps,
        totalTransactionsNeedingRates,
        totalMissingRates: gaps.length,
        byCurrency
      };

    } catch (error) {
      console.error('❌ Direct query gap detection failed:', error);
      return {
        success: false,
        gaps: [],
        totalTransactionsNeedingRates: 0,
        totalMissingRates: 0,
        byCurrency: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Process RPC results into gap detection result
   */
  private processGapResults(data: any[]): GapDetectionResult {
    if (!data || data.length === 0) {
      console.log('✅ No exchange rate gaps detected');
      return {
        success: true,
        gaps: [],
        totalTransactionsNeedingRates: 0,
        totalMissingRates: 0,
        byCurrency: {}
      };
    }

    const gaps: RateGap[] = [];
    const byCurrency: Record<string, number> = {};
    let totalTransactionsNeedingRates = 0;

    for (const row of data) {
      gaps.push({
        currency: row.original_currency as CurrencyType,
        date: row.transaction_date,
        transactionCount: row.count || 1
      });

      byCurrency[row.original_currency] = (byCurrency[row.original_currency] || 0) + 1;
      totalTransactionsNeedingRates += row.count || 1;
    }

    gaps.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`🔎 Found ${gaps.length} missing exchange rates affecting ${totalTransactionsNeedingRates} transactions`);

    return {
      success: true,
      gaps,
      totalTransactionsNeedingRates,
      totalMissingRates: gaps.length,
      byCurrency
    };
  }

  /**
   * Get summary statistics about exchange rate coverage
   */
  async getCoverageStats(): Promise<{
    totalNonUSDTransactions: number;
    transactionsWithRates: number;
    transactionsWithoutRates: number;
    coveragePercentage: number;
    byCurrency: Record<string, { total: number; covered: number; missing: number }>;
  }> {
    const supabase = createServiceRoleClient();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('original_currency, transaction_date')
      .neq('original_currency', DISPLAY_CURRENCY);

    if (error || !transactions) {
      throw new Error(`Failed to get coverage stats: ${error?.message}`);
    }

    // Get all unique currency/date pairs
    const pairs = new Map<string, { currency: string; date: string }>();
    for (const tx of transactions) {
      const key = `${tx.original_currency}:${tx.transaction_date}`;
      if (!pairs.has(key)) {
        pairs.set(key, { currency: tx.original_currency, date: tx.transaction_date });
      }
    }

    // Check which pairs have rates
    const uniqueCurrencies = Array.from(new Set(transactions.map(tx => tx.original_currency)));
    const { data: rates } = await supabase
      .from('exchange_rates')
      .select('from_currency, date')
      .in('from_currency', uniqueCurrencies)
      .eq('to_currency', DISPLAY_CURRENCY);

    const ratesSet = new Set((rates || []).map(r => `${r.from_currency}:${r.date}`));

    // Calculate stats
    const byCurrency: Record<string, { total: number; covered: number; missing: number }> = {};
    let covered = 0;
    let missing = 0;

    for (const [key, value] of Array.from(pairs)) {
      if (!byCurrency[value.currency]) {
        byCurrency[value.currency] = { total: 0, covered: 0, missing: 0 };
      }
      byCurrency[value.currency].total++;

      if (ratesSet.has(key)) {
        covered++;
        byCurrency[value.currency].covered++;
      } else {
        missing++;
        byCurrency[value.currency].missing++;
      }
    }

    const totalNonUSD = pairs.size;
    const coveragePercentage = totalNonUSD > 0 ? (covered / totalNonUSD) * 100 : 100;

    return {
      totalNonUSDTransactions: transactions.length,
      transactionsWithRates: covered,
      transactionsWithoutRates: missing,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100,
      byCurrency
    };
  }

  /**
   * Group gaps by currency for efficient batch fetching
   */
  groupGapsByCurrency(gaps: RateGap[]): Map<CurrencyType, string[]> {
    const grouped = new Map<CurrencyType, string[]>();

    for (const gap of gaps) {
      const dates = grouped.get(gap.currency) || [];
      dates.push(gap.date);
      grouped.set(gap.currency, dates);
    }

    // Sort dates within each currency group
    for (const [currency, dates] of Array.from(grouped)) {
      grouped.set(currency, dates.sort());
    }

    return grouped;
  }

  /**
   * Categorize gaps by source (ECB vs non-ECB)
   * ECB provides: EUR, USD, THB, GBP, SGD, MYR, JPY, CHF, CAD, AUD, NZD, SEK, NOK, CNY
   * Non-ECB: VND (need alternate source)
   */
  categorizeGapsBySource(gaps: RateGap[]): {
    ecbGaps: RateGap[];
    nonEcbGaps: RateGap[];
  } {
    // Currencies available from ECB (via EUR cross-rates)
    const ECB_CURRENCIES = new Set([
      'EUR', 'USD', 'THB', 'GBP', 'SGD', 'MYR', 'JPY', 'CHF',
      'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'CNY'
    ]);

    const ecbGaps: RateGap[] = [];
    const nonEcbGaps: RateGap[] = [];

    for (const gap of gaps) {
      if (ECB_CURRENCIES.has(gap.currency)) {
        ecbGaps.push(gap);
      } else {
        nonEcbGaps.push(gap);
      }
    }

    return { ecbGaps, nonEcbGaps };
  }
}

// Singleton instance
export const transactionRateGapService = new TransactionRateGapService();
