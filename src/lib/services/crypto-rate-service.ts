import { CoinGeckoFetcher, BTCPrice } from './coingecko-fetcher';
import { RateCalculator } from './rate-calculator';
import { ProcessedRate } from '@/lib/types/exchange-rates';
import { createClient } from '@/lib/supabase/client';
import { CurrencyType } from '@/lib/supabase/types';

export interface CryptoSyncResult {
  success: boolean;
  date: string;
  btcPrice: number | null;
  ratesInserted: number;
  errors: string[];
  duration?: number;
}

export interface BackfillResult {
  totalDates: number;
  processedCount: number;
  errorCount: number;
  errors: string[];
  startDate: string;
  endDate: string;
  duration: number;
}

export class CryptoRateService {
  constructor(
    private coinGeckoFetcher: CoinGeckoFetcher,
    private rateCalculator: RateCalculator
  ) {}
  
  async syncBitcoinRates(date?: string): Promise<CryptoSyncResult> {
    const startTime = Date.now();
    const targetDate = date || this.getTargetDate();
    
    try {
      console.log(`Starting BTC sync for ${targetDate}`);
      
      // 1. Fetch BTC/USD rate from CoinGecko
      const btcPrice = await this.coinGeckoFetcher.getHistoricalPrice(targetDate);
      
      // Validate BTC price
      if (!this.coinGeckoFetcher.validateBTCPrice(btcPrice.price_usd, targetDate)) {
        throw new Error(`Invalid BTC price: $${btcPrice.price_usd} for ${targetDate}`);
      }
      
      // 2. Get existing fiat rates for cross-calculation
      const fiatRates = await this.getFiatRatesForDate(targetDate);
      
      if (fiatRates.length === 0) {
        console.warn(`No fiat rates available for ${targetDate}, BTC rates will be limited to USD`);
      }
      
      // 3. Calculate BTC cross-rates
      const btcCrossRates = this.calculateBTCCrossRates(btcPrice, fiatRates);
      
      // 4. Store in database
      const insertedCount = await this.storeBTCRates(btcCrossRates);
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ BTC sync completed for ${targetDate}: $${btcPrice.price_usd.toLocaleString()}, ${insertedCount} rates inserted`);
      
      return {
        success: true,
        date: targetDate,
        btcPrice: btcPrice.price_usd,
        ratesInserted: insertedCount,
        errors: [],
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ BTC sync failed for ${targetDate}:`, errorMessage);
      
      return {
        success: false,
        date: targetDate,
        btcPrice: null,
        ratesInserted: 0,
        errors: [errorMessage],
        duration
      };
    }
  }
  
  async backfillBitcoinRates(
    startDate: string, 
    endDate: string
  ): Promise<BackfillResult> {
    const backfillStartTime = Date.now();
    const dates = this.generateDateRange(startDate, endDate);
    
    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    console.log(`Starting BTC backfill: ${dates.length} dates from ${startDate} to ${endDate}`);
    
    // Process dates sequentially to respect rate limits
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      
      try {
        // Check if we already have BTC data for this date
        const existingRates = await this.checkExistingBTCRates(date);
        if (existingRates > 0) {
          console.log(`⏭️  Skipping ${date} (${existingRates} rates already exist)`);
          processedCount++;
          continue;
        }
        
        // Wait for rate limiter
        await this.coinGeckoFetcher.getRateLimitStatus();
        
        const result = await this.syncBitcoinRates(date);
        
        if (result.success) {
          processedCount++;
          console.log(`✅ [${i + 1}/${dates.length}] Processed BTC rates for ${date}: $${result.btcPrice?.toLocaleString()}`);
        } else {
          errorCount++;
          errors.push(`${date}: ${result.errors.join(', ')}`);
          console.error(`❌ [${i + 1}/${dates.length}] Failed ${date}: ${result.errors.join(', ')}`);
        }
        
        // Conservative delay between requests (1.2 seconds)
        await new Promise(resolve => setTimeout(resolve, 1200));
        
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${date}: ${errorMessage}`);
        console.error(`❌ [${i + 1}/${dates.length}] Failed to process ${date}:`, errorMessage);
        
        // Continue processing other dates
      }
      
      // Log progress every 50 dates
      if (i % 50 === 0 && i > 0) {
        const progress = ((i / dates.length) * 100).toFixed(1);
        console.log(`📊 Progress: ${progress}% (${i}/${dates.length}), Success: ${processedCount}, Errors: ${errorCount}`);
      }
    }
    
    const duration = Date.now() - backfillStartTime;
    
    console.log(`🏁 BTC backfill completed: ${processedCount}/${dates.length} successful (${(duration / 1000).toFixed(1)}s)`);
    
    return {
      totalDates: dates.length,
      processedCount,
      errorCount,
      errors,
      startDate,
      endDate,
      duration
    };
  }
  
  // Calculate BTC against all fiat currencies
  private calculateBTCCrossRates(
    btcPrice: BTCPrice, 
    fiatRates: ProcessedRate[]
  ): ProcessedRate[] {
    const crossRates: ProcessedRate[] = [];
    
    // BTC/USD (direct from CoinGecko)
    crossRates.push({
      from_currency: 'BTC',
      to_currency: 'USD',
      rate: btcPrice.price_usd,
      date: btcPrice.date,
      source: 'COINGECKO',
      is_interpolated: false
    });
    
    // USD/BTC (inverse)
    crossRates.push({
      from_currency: 'USD',
      to_currency: 'BTC',
      rate: 1 / btcPrice.price_usd,
      date: btcPrice.date,
      source: 'COINGECKO',
      is_interpolated: false
    });
    
    // BTC against other fiat currencies using USD as bridge
    const usdRates = fiatRates.filter(rate => rate.from_currency === 'USD');
    
    for (const usdRate of usdRates) {
      // BTC/XXX = BTC/USD * USD/XXX
      const btcToFiat = btcPrice.price_usd * usdRate.rate;
      
      crossRates.push({
        from_currency: 'BTC',
        to_currency: usdRate.to_currency,
        rate: Math.round(btcToFiat * 1000000) / 1000000, // Round to 6 decimal places
        date: btcPrice.date,
        source: 'COINGECKO',
        is_interpolated: false
      });
      
      // XXX/BTC (inverse)
      crossRates.push({
        from_currency: usdRate.to_currency,
        to_currency: 'BTC',
        rate: Math.round((1 / btcToFiat) * 1000000000000) / 1000000000000, // More precision for small values
        date: btcPrice.date,
        source: 'COINGECKO',
        is_interpolated: false
      });
    }
    
    // Also calculate from other fiat currencies to BTC if needed
    const nonUsdFiatRates = fiatRates.filter(rate => rate.to_currency === 'USD' && rate.from_currency !== 'USD');
    
    for (const fiatRate of nonUsdFiatRates) {
      // XXX/BTC = (XXX/USD) * (USD/BTC)
      const fiatToBtc = fiatRate.rate * (1 / btcPrice.price_usd);
      
      // Only add if we haven't already calculated this pair
      const existingPair = crossRates.find(
        cr => cr.from_currency === fiatRate.from_currency && cr.to_currency === 'BTC'
      );
      
      if (!existingPair) {
        crossRates.push({
          from_currency: fiatRate.from_currency,
          to_currency: 'BTC',
          rate: Math.round(fiatToBtc * 1000000000000) / 1000000000000,
          date: btcPrice.date,
          source: 'COINGECKO',
          is_interpolated: false
        });
        
        // BTC/XXX (inverse)
        crossRates.push({
          from_currency: 'BTC',
          to_currency: fiatRate.from_currency,
          rate: Math.round((1 / fiatToBtc) * 1000000) / 1000000,
          date: btcPrice.date,
          source: 'COINGECKO',
          is_interpolated: false
        });
      }
    }
    
    return crossRates;
  }
  
  private async getFiatRatesForDate(date: string): Promise<ProcessedRate[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('date', date)
        .neq('from_currency', 'BTC')
        .neq('to_currency', 'BTC');
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        source: item.source as 'ECB' | 'COINGECKO',
        interpolated_from_date: item.interpolated_from_date || undefined
      }));
    } catch (error) {
      console.error(`Error fetching fiat rates for ${date}:`, error);
      return [];
    }
  }
  
  private async storeBTCRates(rates: ProcessedRate[]): Promise<number> {
    if (rates.length === 0) return 0;
    
    try {
      const supabase = createClient();
      // First, delete any existing BTC rates for this date to avoid duplicates
      const date = rates[0].date;
      await supabase
        .from('exchange_rates')
        .delete()
        .eq('date', date)
        .or(`from_currency.eq.BTC,to_currency.eq.BTC`);
      
      // Insert new rates
      const { error } = await supabase
        .from('exchange_rates')
        .insert(rates);
      
      if (error) throw error;
      
      return rates.length;
    } catch (error) {
      console.error('Error storing BTC rates:', error);
      throw error;
    }
  }
  
  private async checkExistingBTCRates(date: string): Promise<number> {
    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('exchange_rates')
        .select('*', { count: 'exact', head: true })
        .eq('date', date)
        .or(`from_currency.eq.BTC,to_currency.eq.BTC`);
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error(`Error checking existing BTC rates for ${date}:`, error);
      return 0;
    }
  }
  
  private getTargetDate(): string {
    // Get yesterday's date (crypto markets operate 24/7)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  
  private generateDateRange(startDate: string, endDate: string): string[] {
    // Generate daily dates (including weekends for crypto)
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
  
  // Validate price movement (basic volatility check)
  async validatePriceMovement(
    currentPrice: number, 
    date: string
  ): Promise<boolean> {
    try {
      const supabase = createClient();
      // Get price from previous day
      const previousDay = new Date(date);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDateStr = previousDay.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', 'BTC')
        .eq('to_currency', 'USD')
        .eq('date', previousDateStr)
        .single();
      
      if (error || !data) return true; // Can't validate, allow it
      
      const previousPrice = data.rate;
      const changePercent = Math.abs((currentPrice - previousPrice) / previousPrice);
      
      // Flag if price changed more than 50% in one day
      if (changePercent > 0.5) {
        console.warn(`Large BTC price movement: ${(changePercent * 100).toFixed(1)}% on ${date} ($${previousPrice.toLocaleString()} → $${currentPrice.toLocaleString()})`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating price movement:', error);
      return true; // Allow on error
    }
  }
}

// Factory function for dependency injection
export function createCryptoRateService(): CryptoRateService {
  const coinGeckoFetcher = new CoinGeckoFetcher();
  const rateCalculator = new RateCalculator();
  
  return new CryptoRateService(coinGeckoFetcher, rateCalculator);
}