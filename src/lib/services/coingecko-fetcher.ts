import { RateLimiter } from '@/lib/utils/rate-limit-helper';

export interface BTCPrice {
  date: string;           // YYYY-MM-DD format
  price_usd: number;      // Bitcoin price in USD
  timestamp: number;      // Unix timestamp
  source: 'COINGECKO';
}

export interface CoinGeckoResponse {
  bitcoin: {
    usd: number;
  };
}

export interface HistoricalResponse {
  id: string;
  symbol: string;
  name: string;
  market_data: {
    current_price: {
      usd: number;
    };
  };
}

export interface PriceRangeResponse {
  prices: [number, number][];  // [timestamp, price] pairs
}

export class CoinGeckoFetcher {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly rateLimiter: RateLimiter;
  
  constructor() {
    // Free tier: 50 requests/minute
    this.rateLimiter = new RateLimiter(50, 60000);
  }
  
  // Fetch current BTC price
  async getCurrentPrice(): Promise<BTCPrice> {
    await this.rateLimiter.waitForNextSlot();
    
    const url = `${this.baseUrl}/simple/price?ids=bitcoin&vs_currencies=usd`;
    const response = await this.fetchWithErrorHandling(url);
    
    const data: CoinGeckoResponse = response;
    const now = new Date();
    
    return {
      date: now.toISOString().split('T')[0],
      price_usd: data.bitcoin.usd,
      timestamp: Math.floor(now.getTime() / 1000),
      source: 'COINGECKO'
    };
  }
  
  // Fetch historical BTC price for specific date
  async getHistoricalPrice(date: string): Promise<BTCPrice> {
    await this.rateLimiter.waitForNextSlot();
    
    // Format date as dd-mm-yyyy for CoinGecko API
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}-${month}-${year}`;
    
    const url = `${this.baseUrl}/coins/bitcoin/history?date=${formattedDate}`;
    const response = await this.fetchWithErrorHandling(url);
    
    const data: HistoricalResponse = response;
    
    if (!data.market_data?.current_price?.usd) {
      throw new Error(`No BTC price data available for ${date}`);
    }
    
    const dateObj = new Date(date + 'T00:00:00Z');
    
    return {
      date: date,
      price_usd: data.market_data.current_price.usd,
      timestamp: Math.floor(dateObj.getTime() / 1000),
      source: 'COINGECKO'
    };
  }
  
  // Fetch price range for multiple dates
  async getPriceRange(startDate: string, endDate: string): Promise<BTCPrice[]> {
    await this.rateLimiter.waitForNextSlot();
    
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    
    const url = `${this.baseUrl}/coins/bitcoin/market_chart/range?vs_currency=usd&from=${startTimestamp}&to=${endTimestamp}`;
    const response = await this.fetchWithErrorHandling(url);
    
    const data: PriceRangeResponse = response;
    
    return data.prices.map(([timestamp, price]) => {
      const date = new Date(timestamp).toISOString().split('T')[0];
      return {
        date,
        price_usd: price,
        timestamp: Math.floor(timestamp / 1000),
        source: 'COINGECKO'
      };
    });
  }
  
  private async fetchWithErrorHandling(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...(process.env.COINGECKO_API_KEY && {
            'x-cg-pro-api-key': process.env.COINGECKO_API_KEY
          })
        }
      });
      
      // Handle specific CoinGecko error codes
      switch (response.status) {
        case 429: // Rate limit exceeded
          throw new Error('RATE_LIMIT_EXCEEDED');
        case 404: // Data not found
          throw new Error('DATA_NOT_FOUND');
        case 500: // Server error
          throw new Error('SERVER_ERROR');
        default:
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
      }
      
      return response.json();
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error('NETWORK_ERROR');
      }
      throw error;
    }
  }
  
  // Validation helpers
  validateBTCPrice(price: number, date: string): boolean {
    // Basic sanity checks for BTC price
    const minPrice = 100;     // $100 minimum (historical low)
    const maxPrice = 500000;  // $500k maximum (reasonable ceiling)
    
    if (price < minPrice || price > maxPrice) {
      console.warn(`Suspicious BTC price for ${date}: $${price}`);
      return false;
    }
    
    return true;
  }
  
  // Get rate limiter status
  getRateLimitStatus() {
    return {
      remainingRequests: this.rateLimiter.getRemainingRequests(),
      resetTime: this.rateLimiter.getResetTime()
    };
  }
}