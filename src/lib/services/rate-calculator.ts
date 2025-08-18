import { CurrencyType } from '../supabase/types';
import { 
  ECBRate, 
  ProcessedRate, 
  CURRENCY_PAIRS, 
  CrossRateCalculation 
} from '../types/exchange-rates';

export class RateCalculator {
  /**
   * Convert EUR-based ECB rates to cross-rates between other currencies
   * ECB provides rates as EUR/XXX, we need to calculate XXX/YYY cross-rates
   */
  calculateCrossRates(eurRates: ECBRate[]): ProcessedRate[] {
    const processedRates: ProcessedRate[] = [];
    
    // Group rates by date for easier processing
    const ratesByDate = this.groupRatesByDate(eurRates);
    
    for (const [date, rates] of Object.entries(ratesByDate)) {
      // Create a lookup map for this date's rates
      const rateMap = new Map<string, number>();
      
      // Add EUR as base (rate = 1.0)
      rateMap.set('EUR', 1.0);
      
      // Add all ECB rates
      for (const rate of rates) {
        rateMap.set(rate.currency, rate.rate);
      }
      
      // Generate all required currency pairs
      for (const [fromCurrency, toCurrency] of CURRENCY_PAIRS) {
        const crossRate = this.calculateCrossRate(fromCurrency, toCurrency, rateMap);
        
        if (crossRate !== null) {
          processedRates.push({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate: crossRate,
            date,
            source: 'ECB',
            is_interpolated: false
          });
        }
      }
    }
    
    return processedRates;
  }

  /**
   * Generate all possible currency pairs from available rates
   * This creates a comprehensive matrix of all combinations
   */
  generateAllPairs(baseRates: ECBRate[]): ProcessedRate[] {
    const processedRates: ProcessedRate[] = [];
    const ratesByDate = this.groupRatesByDate(baseRates);
    
    for (const [date, rates] of Object.entries(ratesByDate)) {
      const availableCurrencies = ['EUR', ...rates.map(r => r.currency)];
      const rateMap = new Map<string, number>();
      
      // Set up the rate map
      rateMap.set('EUR', 1.0);
      for (const rate of rates) {
        rateMap.set(rate.currency, rate.rate);
      }
      
      // Generate all possible pairs
      for (const fromCurrency of availableCurrencies) {
        for (const toCurrency of availableCurrencies) {
          if (fromCurrency === toCurrency) continue;
          
          const crossRate = this.calculateCrossRate(
            fromCurrency as CurrencyType, 
            toCurrency as CurrencyType, 
            rateMap
          );
          
          if (crossRate !== null) {
            processedRates.push({
              from_currency: fromCurrency as CurrencyType,
              to_currency: toCurrency as CurrencyType,
              rate: crossRate,
              date,
              source: 'ECB',
              is_interpolated: false
            });
          }
        }
      }
    }
    
    return processedRates;
  }

  /**
   * Calculate cross-rate between two currencies using EUR as bridge
   * Formula: EUR/USD = 1.0945, EUR/THB = 39.755
   * USD/THB = (EUR/THB) / (EUR/USD) = 39.755 / 1.0945 = 36.32
   */
  private calculateCrossRate(
    fromCurrency: CurrencyType, 
    toCurrency: CurrencyType, 
    rateMap: Map<string, number>
  ): number | null {
    const fromRate = rateMap.get(fromCurrency);
    const toRate = rateMap.get(toCurrency);
    
    if (fromRate === undefined || toRate === undefined) {
      return null;
    }
    
    // Direct conversion through EUR
    // If converting FROM EUR, divide by the target rate
    // If converting TO EUR, use the source rate directly
    // For cross-rates, divide target by source
    
    let crossRate: number;
    
    if (fromCurrency === 'EUR') {
      // EUR to other currency
      crossRate = toRate;
    } else if (toCurrency === 'EUR') {
      // Other currency to EUR
      crossRate = 1 / fromRate;
    } else {
      // Cross-rate between two non-EUR currencies
      crossRate = toRate / fromRate;
    }
    
    // Round to reasonable precision (6 decimal places)
    return Math.round(crossRate * 1000000) / 1000000;
  }

  /**
   * Calculate inverse rate (e.g., USD/THB -> THB/USD)
   */
  calculateInverseRate(rate: number): number {
    if (rate === 0) return 0;
    return Math.round((1 / rate) * 1000000) / 1000000;
  }

  /**
   * Group rates by date for easier processing
   */
  private groupRatesByDate(rates: ECBRate[]): Record<string, ECBRate[]> {
    return rates.reduce((groups, rate) => {
      const date = rate.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(rate);
      return groups;
    }, {} as Record<string, ECBRate[]>);
  }

  /**
   * Validate that required currencies are available for calculation
   */
  validateRequiredCurrencies(rates: ECBRate[], requiredCurrencies: string[]): {
    isValid: boolean;
    missingCurrencies: string[];
  } {
    const availableCurrencies = new Set(['EUR', ...rates.map(r => r.currency)]);
    const missingCurrencies = requiredCurrencies.filter(
      currency => !availableCurrencies.has(currency)
    );
    
    return {
      isValid: missingCurrencies.length === 0,
      missingCurrencies
    };
  }

  /**
   * Get calculation details for debugging/logging
   */
  getCalculationDetails(
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType,
    eurRates: Map<string, number>
  ): CrossRateCalculation | null {
    const fromRate = eurRates.get(fromCurrency);
    const toRate = eurRates.get(toCurrency);
    
    if (fromRate === undefined || toRate === undefined) {
      return null;
    }
    
    const baseRates: { [currency: string]: number } = {};
    eurRates.forEach((rate, currency) => {
      baseRates[currency] = rate;
    });
    
    let calculatedRate: number;
    if (fromCurrency === 'EUR') {
      calculatedRate = toRate;
    } else if (toCurrency === 'EUR') {
      calculatedRate = 1 / fromRate;
    } else {
      calculatedRate = toRate / fromRate;
    }
    
    return {
      baseCurrency: 'EUR',
      targetPair: [fromCurrency, toCurrency],
      baseRates,
      calculatedRate: Math.round(calculatedRate * 1000000) / 1000000
    };
  }

  /**
   * Calculate rate with confidence interval based on historical volatility
   */
  calculateRateWithConfidence(
    historicalRates: number[],
    currentRate: number
  ): {
    rate: number;
    confidenceInterval: { lower: number; upper: number };
    volatility: number;
  } {
    if (historicalRates.length < 2) {
      return {
        rate: currentRate,
        confidenceInterval: { lower: currentRate, upper: currentRate },
        volatility: 0
      };
    }
    
    // Calculate standard deviation
    const mean = historicalRates.reduce((sum, rate) => sum + rate, 0) / historicalRates.length;
    const variance = historicalRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / historicalRates.length;
    const stdDev = Math.sqrt(variance);
    
    // 95% confidence interval (approximately 2 standard deviations)
    const marginOfError = 1.96 * stdDev;
    
    return {
      rate: currentRate,
      confidenceInterval: {
        lower: Math.max(0, currentRate - marginOfError),
        upper: currentRate + marginOfError
      },
      volatility: stdDev / mean // Coefficient of variation
    };
  }

  /**
   * Interpolate missing rate between two known rates
   */
  interpolateRate(
    startRate: number,
    endRate: number,
    startDate: Date,
    endDate: Date,
    targetDate: Date
  ): number {
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const targetDays = (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (totalDays === 0) return startRate;
    
    const ratio = targetDays / totalDays;
    const interpolatedRate = startRate + (endRate - startRate) * ratio;
    
    return Math.round(interpolatedRate * 1000000) / 1000000;
  }
}

// Singleton instance for convenience
export const rateCalculator = new RateCalculator();

// Utility functions for common rate operations
export const rateUtils = {
  /**
   * Format rate for display with appropriate decimal places
   */
  formatRate(rate: number, fromCurrency: CurrencyType, toCurrency: CurrencyType): string {
    // Some currencies need more decimal places due to large values
    let decimals = 4;
    if (toCurrency === 'VND' || fromCurrency === 'VND') decimals = 2;
    if (toCurrency === 'THB' || fromCurrency === 'THB') decimals = 4;
    
    return rate.toFixed(decimals);
  },

  /**
   * Calculate percentage change between two rates
   */
  calculatePercentageChange(oldRate: number, newRate: number): number {
    if (oldRate === 0) return 0;
    return ((newRate - oldRate) / oldRate) * 100;
  },

  /**
   * Check if rate is within reasonable bounds (basic sanity check)
   */
  isRateReasonable(rate: number, fromCurrency: CurrencyType, toCurrency: CurrencyType): boolean {
    if (rate <= 0) return false;
    
    // Define reasonable bounds for common currency pairs
    const bounds: Record<string, { min: number; max: number }> = {
      'USD-THB': { min: 20, max: 50 },
      'USD-EUR': { min: 0.7, max: 1.3 },
      'USD-GBP': { min: 0.6, max: 1.0 },
      'USD-SGD': { min: 1.0, max: 1.8 },
      'USD-VND': { min: 20000, max: 30000 },
      'USD-MYR': { min: 3.0, max: 5.0 }
    };
    
    const pairKey = `${fromCurrency}-${toCurrency}`;
    const reversePairKey = `${toCurrency}-${fromCurrency}`;
    
    if (bounds[pairKey]) {
      const { min, max } = bounds[pairKey];
      return rate >= min && rate <= max;
    }
    
    if (bounds[reversePairKey]) {
      const { min, max } = bounds[reversePairKey];
      const inverseRate = 1 / rate;
      return inverseRate >= min && inverseRate <= max;
    }
    
    // If no specific bounds defined, just check for reasonable range
    return rate > 0.001 && rate < 100000;
  },

  /**
   * Get currency pair display string
   */
  getPairDisplayString(fromCurrency: CurrencyType, toCurrency: CurrencyType): string {
    return `${fromCurrency}/${toCurrency}`;
  }
};