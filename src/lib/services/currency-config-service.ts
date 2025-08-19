import { createClient } from '../supabase/client';

export interface TrackedCurrency {
  currency_code: string;
  display_name: string;
  currency_symbol: string;
  source: 'ECB' | 'COINGECKO';
  is_crypto: boolean;
}

export interface CurrencyConfig {
  ecbCurrencies: string[];
  cryptoCurrencies: string[];
  allTracked: string[];
  currencyPairs: [string, string][];
}

class CurrencyConfigService {
  private cachedConfig: CurrencyConfig | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get tracked currencies from database
   */
  async getTrackedCurrencies(): Promise<TrackedCurrency[]> {
    // Temporarily use fallback config until currency_configuration migration is deployed
    // This prevents TypeScript errors during build when the migration hasn't been applied yet
    console.warn('Using fallback currency configuration until migration is deployed');
    return this.getDefaultCurrencies();
    
    // TODO: Uncomment this after the migration is successfully deployed
    /*
    try {
      const supabase = createClient();
      
      // First try to call the RPC function which is type-safe
      let { data, error } = await supabase
        .rpc('get_tracked_currencies');
      
      if (error) {
        console.warn('RPC function not available, using fallback:', error.message);
        return this.getDefaultCurrencies();
      }
      
      return data || this.getDefaultCurrencies();
    } catch (error) {
      console.error('Failed to fetch tracked currencies:', error);
      return this.getDefaultCurrencies();
    }
    */
  }

  /**
   * Get currency configuration with caching
   */
  async getCurrencyConfig(): Promise<CurrencyConfig> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.cachedConfig && (now - this.lastFetch) < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      const trackedCurrencies = await this.getTrackedCurrencies();
      
      const ecbCurrencies: string[] = [];
      const cryptoCurrencies: string[] = [];
      const allTracked: string[] = [];

      for (const currency of trackedCurrencies) {
        allTracked.push(currency.currency_code);
        
        if (currency.is_crypto) {
          cryptoCurrencies.push(currency.currency_code);
        } else {
          ecbCurrencies.push(currency.currency_code);
        }
      }

      // Generate currency pairs (all combinations)
      const currencyPairs: [string, string][] = [];
      for (const from of allTracked) {
        for (const to of allTracked) {
          if (from !== to) {
            currencyPairs.push([from, to]);
          }
        }
      }

      this.cachedConfig = {
        ecbCurrencies,
        cryptoCurrencies,
        allTracked,
        currencyPairs
      };
      
      this.lastFetch = now;

      console.log(`📋 Currency config loaded: ${ecbCurrencies.length} fiat, ${cryptoCurrencies.length} crypto currencies`);
      
      return this.cachedConfig;
    } catch (error) {
      console.error('Failed to build currency config:', error);
      
      // Return fallback config
      const fallbackConfig: CurrencyConfig = {
        ecbCurrencies: ['USD', 'GBP', 'THB', 'SGD', 'MYR'],
        cryptoCurrencies: ['BTC'],
        allTracked: ['USD', 'EUR', 'GBP', 'THB', 'SGD', 'MYR', 'BTC'],
        currencyPairs: [
          ['USD', 'THB'], ['USD', 'EUR'], ['USD', 'GBP'], ['USD', 'SGD'], ['USD', 'MYR'],
          ['THB', 'USD'], ['EUR', 'USD'], ['GBP', 'USD'], ['SGD', 'USD'], ['MYR', 'USD']
        ]
      };
      
      return fallbackConfig;
    }
  }

  /**
   * Clear cache to force refresh on next call
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastFetch = 0;
  }

  /**
   * Get default currencies for fallback
   */
  private getDefaultCurrencies(): TrackedCurrency[] {
    return [
      { currency_code: 'USD', display_name: 'US Dollar', currency_symbol: '$', source: 'ECB', is_crypto: false },
      { currency_code: 'EUR', display_name: 'Euro', currency_symbol: '€', source: 'ECB', is_crypto: false },
      { currency_code: 'GBP', display_name: 'British Pound', currency_symbol: '£', source: 'ECB', is_crypto: false },
      { currency_code: 'THB', display_name: 'Thai Baht', currency_symbol: '฿', source: 'ECB', is_crypto: false },
      { currency_code: 'SGD', display_name: 'Singapore Dollar', currency_symbol: 'S$', source: 'ECB', is_crypto: false },
      { currency_code: 'MYR', display_name: 'Malaysian Ringgit', currency_symbol: 'RM', source: 'ECB', is_crypto: false },
      { currency_code: 'BTC', display_name: 'Bitcoin', currency_symbol: '₿', source: 'COINGECKO', is_crypto: true }
    ];
  }

  /**
   * Check if a specific currency is tracked
   */
  async isCurrencyTracked(currencyCode: string): Promise<boolean> {
    const config = await this.getCurrencyConfig();
    return config.allTracked.includes(currencyCode);
  }

  /**
   * Get ECB currencies that should be fetched
   */
  async getECBCurrencies(): Promise<string[]> {
    const config = await this.getCurrencyConfig();
    return config.ecbCurrencies;
  }

  /**
   * Get crypto currencies that should be fetched
   */
  async getCryptoCurrencies(): Promise<string[]> {
    const config = await this.getCurrencyConfig();
    return config.cryptoCurrencies;
  }

  /**
   * Get all currency pairs that should be calculated
   */
  async getCurrencyPairs(): Promise<[string, string][]> {
    const config = await this.getCurrencyConfig();
    return config.currencyPairs;
  }
}

// Singleton instance
export const currencyConfigService = new CurrencyConfigService();