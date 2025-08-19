import { 
  ECBRate, 
  FetchResult, 
  ECBError, 
  ECBErrorType, 
  RetryConfig, 
  DEFAULT_RETRY_CONFIG, 
  ECB_ENDPOINTS,
  ValidationResult,
  ECBFetchMetrics,
  DateRange,
  ECBXMLData
} from '../types/exchange-rates';
import { currencyConfigService } from './currency-config-service';

// XML parsing library - we'll use native DOMParser for browser compatibility
const parseXML = (xmlString: string): Document => {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(xmlString, 'text/xml');
  } else {
    // Node.js environment fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require('jsdom');
    return new JSDOM(xmlString, { contentType: 'text/xml' }).window.document;
  }
};

export class ECBFetcher {
  private retryConfig: RetryConfig;
  private metrics: ECBFetchMetrics;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
    this.metrics = {
      startTime: 0,
      endTime: 0,
      duration: 0,
      ratesProcessed: 0,
      apiCalls: 0,
      errors: 0,
      retries: 0
    };
  }

  /**
   * Fetch daily exchange rates from ECB
   */
  async fetchDailyRates(): Promise<FetchResult<ECBRate>> {
    this.resetMetrics();
    
    try {
      const rates = await this.fetchWithRetry(ECB_ENDPOINTS.DAILY);
      return this.createSuccessResult(rates);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Fetch historical exchange rates from ECB
   */
  async fetchHistoricalRates(): Promise<FetchResult<ECBRate>> {
    this.resetMetrics();
    
    try {
      const rates = await this.fetchWithRetry(ECB_ENDPOINTS.HISTORICAL);
      return this.createSuccessResult(rates);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Fetch exchange rates for a specific date range
   */
  async fetchRatesForDateRange(startDate: string, endDate: string): Promise<FetchResult<ECBRate>> {
    this.resetMetrics();
    
    try {
      // ECB historical endpoint contains all data, so we fetch it and filter
      const allRates = await this.fetchWithRetry(ECB_ENDPOINTS.HISTORICAL);
      
      const filteredRates = allRates.filter(rate => {
        return rate.date >= startDate && rate.date <= endDate;
      });
      
      this.metrics.ratesProcessed = filteredRates.length;
      return this.createSuccessResult(filteredRates);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Fetch data with exponential backoff retry
   */
  private async fetchWithRetry(url: string): Promise<ECBRate[]> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        this.metrics.apiCalls++;
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/xml, text/xml',
            'User-Agent': 'ECB-Fetcher/1.0'
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new ECBError(ECBErrorType.RATE_LIMIT, `Rate limited: ${response.status}`);
          }
          throw new ECBError(ECBErrorType.NETWORK_ERROR, `HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlText = await response.text();
        const rates = await this.parseECBXML(xmlText);
        
        this.metrics.ratesProcessed = rates.length;
        return rates;

      } catch (error) {
        lastError = error as Error;
        this.metrics.errors++;
        
        if (attempt < this.retryConfig.maxAttempts) {
          this.metrics.retries++;
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
            this.retryConfig.maxDelay
          );
          
          console.warn(`ECB fetch attempt ${attempt} failed, retrying in ${delay}ms:`, error);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new ECBError(ECBErrorType.NETWORK_ERROR, 'Max retries exceeded');
  }

  /**
   * Parse ECB XML response
   */
  private async parseECBXML(xmlString: string): Promise<ECBRate[]> {
    try {
      const doc = parseXML(xmlString);
      
      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new ECBError(ECBErrorType.PARSE_ERROR, 'XML parsing failed');
      }

      const rates: ECBRate[] = [];
      
      // Navigate the XML structure: Envelope > Cube > Cube (with time) > Cube (with currency/rate)
      const timeCubes = Array.from(doc.querySelectorAll('Cube[time]'));
      
      for (const timeCube of timeCubes) {
        const date = timeCube.getAttribute('time');
        if (!date) continue;

        const rateCubes = Array.from(timeCube.querySelectorAll('Cube[currency][rate]'));
        
        for (const rateCube of rateCubes) {
          const currency = rateCube.getAttribute('currency');
          const rateStr = rateCube.getAttribute('rate');
          
          if (currency && rateStr) {
            const rate = parseFloat(rateStr);
            
            if (!isNaN(rate) && rate > 0) {
              rates.push({
                date,
                currency,
                rate
              });
            }
          }
        }
      }

      // Filter rates based on tracked currencies
      const filteredRates = await this.filterTrackedCurrencies(rates);

      // Validate the parsed data
      const validation = await this.validateECBData(filteredRates);
      if (!validation.isValid) {
        throw new ECBError(
          ECBErrorType.VALIDATION_ERROR, 
          `Data validation failed: ${validation.errors.join(', ')}`
        );
      }

      console.log(`📊 Filtered ECB rates: ${filteredRates.length} tracked currencies from ${rates.length} total`);

      return filteredRates;

    } catch (error) {
      if (error instanceof ECBError) {
        throw error;
      }
      throw new ECBError(ECBErrorType.PARSE_ERROR, `XML parsing error: ${error instanceof Error ? error.message : String(error)}`, error as Error);
    }
  }

  /**
   * Filter rates to only include tracked currencies
   */
  private async filterTrackedCurrencies(rates: ECBRate[]): Promise<ECBRate[]> {
    try {
      const trackedECBCurrencies = await currencyConfigService.getECBCurrencies();
      
      return rates.filter(rate => trackedECBCurrencies.includes(rate.currency));
    } catch (error) {
      console.warn('Failed to get tracked currencies, using all rates:', error);
      return rates;
    }
  }

  /**
   * Validate fetched ECB data
   */
  private async validateECBData(rates: ECBRate[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (rates.length === 0) {
      result.isValid = false;
      result.errors.push('No rates found in response after filtering');
      return result;
    }

    // Check for required currencies
    const latestDate = rates.reduce((latest, rate) => 
      rate.date > latest ? rate.date : latest, rates[0].date
    );
    
    const latestRates = rates.filter(rate => rate.date === latestDate);
    const availableCurrencies = new Set(latestRates.map(rate => rate.currency));
    
    // Check that we have the currencies we expect to track
    try {
      const trackedECBCurrencies = await currencyConfigService.getECBCurrencies();
      
      for (const requiredCurrency of trackedECBCurrencies) {
        if (!availableCurrencies.has(requiredCurrency)) {
          // This is an error since ECB should provide these tracked currencies
          result.errors.push(`Required tracked currency not found in ECB data: ${requiredCurrency}`);
          result.isValid = false;
        }
      }
    } catch (error) {
      result.warnings.push('Could not verify tracked currencies against ECB data');
    }

    // Validate rate values
    for (const rate of rates) {
      if (rate.rate <= 0) {
        result.errors.push(`Invalid rate value for ${rate.currency} on ${rate.date}: ${rate.rate}`);
      }
      
      if (!rate.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        result.errors.push(`Invalid date format: ${rate.date}`);
      }
      
      if (!rate.currency.match(/^[A-Z]{3}$/)) {
        result.errors.push(`Invalid currency code: ${rate.currency}`);
      }
    }

    if (result.errors.length > 0) {
      result.isValid = false;
    }

    return result;
  }

  /**
   * Get performance metrics from last operation
   */
  getMetrics(): ECBFetchMetrics {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    return { ...this.metrics };
  }

  /**
   * Reset metrics for new operation
   */
  private resetMetrics(): void {
    this.metrics = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      ratesProcessed: 0,
      apiCalls: 0,
      errors: 0,
      retries: 0
    };
  }

  /**
   * Create successful result
   */
  private createSuccessResult(data: ECBRate[]): FetchResult<ECBRate> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(error: unknown): FetchResult<ECBRate> {
    const message = error instanceof Error ? error.message : String(error) || 'Unknown error';
    return {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for convenience
export const ecbFetcher = new ECBFetcher();

// Utility functions for common operations
export const ecbUtils = {
  /**
   * Check if ECB is likely to have updated rates (weekdays around 16:00 CET)
   */
  isECBUpdateTime(): boolean {
    const now = new Date();
    const cetHour = now.getUTCHours() + (now.getTimezoneOffset() / 60) + 1; // Approximate CET conversion
    const dayOfWeek = now.getDay();
    
    // ECB updates around 16:00 CET on weekdays
    return dayOfWeek >= 1 && dayOfWeek <= 5 && cetHour >= 16;
  },

  /**
   * Get the most recent ECB business day
   */
  getMostRecentECBDate(): string {
    const now = new Date();
    
    // Go back to find the most recent weekday
    while (now.getDay() === 0 || now.getDay() === 6) {
      now.setDate(now.getDate() - 1);
    }
    
    return now.toISOString().split('T')[0];
  },

  /**
   * Generate date range for bulk fetching
   */
  generateDateRange(startDate: string, endDate: string): DateRange {
    return { startDate, endDate };
  }
};