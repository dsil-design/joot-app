# Task 5: Bitcoin Exchange Rate Integration

## Objective

Integrate Bitcoin/USD rates using CoinGecko API as ECB doesn't provide cryptocurrency data.

## Files to Create

- `src/lib/services/coingecko-fetcher.ts`
- `src/lib/services/crypto-rate-service.ts`
- `src/pages/api/cron/sync-crypto-rates.ts`
- `src/lib/utils/rate-limit-helper.ts`
- `__tests__/services/crypto-rates.test.ts`

## Requirements

### 1. CoinGecko Fetcher Service (`src/lib/services/coingecko-fetcher.ts`)

#### Core API Integration

```typescript
export class CoinGeckoFetcher {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly rateLimiter: RateLimiter;
  
  constructor() {
    // Free tier: 50 requests/minute
    this.rateLimiter = new RateLimiter(50, 60000);
  }
  
  // Fetch current BTC price
  async getCurrentPrice(): Promise<BTCPrice> {
    // GET /simple/price?ids=bitcoin&vs_currencies=usd
  }
  
  // Fetch historical BTC price for specific date
  async getHistoricalPrice(date: string): Promise<BTCPrice> {
    // GET /coins/bitcoin/history?date={dd-mm-yyyy}
    // Format: "18-08-2024"
  }
  
  // Fetch price range for multiple dates
  async getPriceRange(startDate: string, endDate: string): Promise<BTCPrice[]> {
    // GET /coins/bitcoin/market_chart/range
  }
}
```

#### Data Structures

```typescript
interface BTCPrice {
  date: string;           // YYYY-MM-DD format
  price_usd: number;      // Bitcoin price in USD
  timestamp: number;      // Unix timestamp
  source: 'COINGECKO';
}

interface CoinGeckoResponse {
  bitcoin: {
    usd: number;
  };
}

interface HistoricalResponse {
  id: string;
  symbol: string;
  name: string;
  market_data: {
    current_price: {
      usd: number;
    };
  };
}
```

### 2. Rate Limiting Helper (`src/lib/utils/rate-limit-helper.ts`)

#### Rate Limiter Implementation

```typescript
export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  async waitForNextSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );
    
    // If at limit, wait until oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // 100ms buffer
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Record this request
    this.requests.push(now);
  }
}
```

### 3. Crypto Rate Service (`src/lib/services/crypto-rate-service.ts`)

#### Bitcoin Rate Processing

```typescript
export class CryptoRateService {
  constructor(
    private coinGeckoFetcher: CoinGeckoFetcher,
    private rateCalculator: RateCalculator
  ) {}
  
  async syncBitcoinRates(date?: string): Promise<CryptoSyncResult> {
    const targetDate = date || this.getTargetDate();
    
    try {
      // 1. Fetch BTC/USD rate
      const btcPrice = await this.coinGeckoFetcher.getHistoricalPrice(targetDate);
      
      // 2. Get existing fiat rates for cross-calculation
      const fiatRates = await this.getFiatRatesForDate(targetDate);
      
      // 3. Calculate BTC cross-rates
      const btcCrossRates = this.calculateBTCCrossRates(btcPrice, fiatRates);
      
      // 4. Store in database
      const insertedCount = await this.storeBTCRates(btcCrossRates);
      
      return {
        success: true,
        date: targetDate,
        btcPrice: btcPrice.price_usd,
        ratesInserted: insertedCount,
        errors: []
      };
      
    } catch (error) {
      return {
        success: false,
        date: targetDate,
        btcPrice: null,
        ratesInserted: 0,
        errors: [error.message]
      };
    }
  }
  
  // Calculate BTC against all fiat currencies
  private calculateBTCCrossRates(
    btcPrice: BTCPrice, 
    fiatRates: ProcessedRate[]
  ): ProcessedRate[] {
    const crossRates: ProcessedRate[] = [];
    
    // BTC/USD (direct)
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
    
    // BTC against other fiat currencies
    for (const fiatRate of fiatRates) {
      if (fiatRate.from_currency === 'USD') {
        // BTC/XXX = BTC/USD * USD/XXX
        const btcToFiat = btcPrice.price_usd * fiatRate.rate;
        
        crossRates.push({
          from_currency: 'BTC',
          to_currency: fiatRate.to_currency,
          rate: btcToFiat,
          date: btcPrice.date,
          source: 'COINGECKO',
          is_interpolated: false
        });
        
        // XXX/BTC (inverse)
        crossRates.push({
          from_currency: fiatRate.to_currency,
          to_currency: 'BTC',
          rate: 1 / btcToFiat,
          date: btcPrice.date,
          source: 'COINGECKO',
          is_interpolated: false
        });
      }
    }
    
    return crossRates;
  }
}
```

### 4. Historical Bitcoin Backfill

#### Backfill Strategy

```typescript
export class BitcoinBackfillService {
  async backfillBitcoinRates(
    startDate: string, 
    endDate: string
  ): Promise<BackfillResult> {
    const dates = this.generateDateRange(startDate, endDate);
    
    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process dates sequentially to respect rate limits
    for (const date of dates) {
      try {
        await this.rateLimiter.waitForNextSlot();
        
        const result = await this.cryptoRateService.syncBitcoinRates(date);
        
        if (result.success) {
          processedCount++;
          console.log(`✅ Processed BTC rates for ${date}: $${result.btcPrice}`);
        } else {
          errorCount++;
          errors.push(`${date}: ${result.errors.join(', ')}`);
        }
        
        // Additional delay between requests (conservative approach)
        await new Promise(resolve => setTimeout(resolve, 1200));
        
      } catch (error) {
        errorCount++;
        errors.push(`${date}: ${error.message}`);
        console.error(`❌ Failed to process ${date}:`, error.message);
      }
    }
    
    return {
      totalDates: dates.length,
      processedCount,
      errorCount,
      errors
    };
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
}
```

### 5. Crypto Sync Cron Job (`src/pages/api/cron/sync-crypto-rates.ts`)

#### Dedicated Crypto Endpoint

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron authentication
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const cryptoService = new CryptoRateService(
      new CoinGeckoFetcher(),
      new RateCalculator()
    );
    
    // Get yesterday's date (crypto markets operate 24/7)
    const targetDate = getPreviousDay();
    
    const result = await cryptoService.syncBitcoinRates(targetDate);
    
    res.status(200).json({
      success: result.success,
      message: result.success 
        ? `Synced BTC rates for ${result.date}: $${result.btcPrice}`
        : `Failed to sync BTC rates: ${result.errors.join(', ')}`,
      data: result
    });
    
  } catch (error) {
    console.error('Crypto sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

#### Updated Vercel Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-exchange-rates",
      "schedule": "0 18 * * 1-5"
    },
    {
      "path": "/api/cron/sync-crypto-rates", 
      "schedule": "15 18 * * *"
    }
  ]
}
```

### 6. Error Handling & Fallbacks

#### CoinGecko API Error Handling

```typescript
const fetchWithErrorHandling = async (url: string): Promise<any> => {
  const response = await fetch(url);
  
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
};
```

#### Missing Data Handling

```typescript
const handleMissingBTCData = async (date: string): Promise<ProcessedRate[]> => {
  // For missing crypto data, look backward up to 3 days
  for (let i = 1; i <= 3; i++) {
    const fallbackDate = subtractDays(date, i);
    
    try {
      const btcPrice = await coinGeckoFetcher.getHistoricalPrice(fallbackDate);
      
      // Store as interpolated rate
      return await storeInterpolatedBTCRates(btcPrice, date, fallbackDate);
      
    } catch (error) {
      continue; // Try next day back
    }
  }
  
  throw new Error(`No BTC data available within 3 days of ${date}`);
};
```

### 7. Data Validation & Quality Checks

#### Bitcoin Price Validation

```typescript
const validateBTCPrice = (price: number, date: string): boolean => {
  // Basic sanity checks for BTC price
  const minPrice = 100;     // $100 minimum (historical low)
  const maxPrice = 500000;  // $500k maximum (reasonable ceiling)
  
  if (price < minPrice || price > maxPrice) {
    console.warn(`Suspicious BTC price for ${date}: $${price}`);
    return false;
  }
  
  return true;
};

// Validate against recent price trends
const validatePriceMovement = async (
  currentPrice: number, 
  date: string
): Promise<boolean> => {
  // Get price from previous day
  const previousDay = subtractDays(date, 1);
  const previousPrice = await getStoredBTCPrice(previousDay);
  
  if (previousPrice) {
    const changePercent = Math.abs((currentPrice - previousPrice) / previousPrice);
    
    // Flag if price changed more than 50% in one day
    if (changePercent > 0.5) {
      console.warn(`Large BTC price movement: ${(changePercent * 100).toFixed(1)}% on ${date}`);
      return false;
    }
  }
  
  return true;
};
```

### 8. Integration with Main Sync System

#### Modified Daily Sync to Include Crypto

```typescript
// In daily-sync-service.ts
export class DailySyncService {
  async executeDailySync(): Promise<SyncResult> {
    // 1. Sync fiat currencies (ECB)
    const fiatResult = await this.syncFiatCurrencies();
    
    // 2. Sync cryptocurrencies (CoinGecko)
    const cryptoResult = await this.syncCryptocurrencies();
    
    // 3. Combine results
    return {
      success: fiatResult.success && cryptoResult.success,
      targetDate: fiatResult.targetDate,
      ratesInserted: fiatResult.ratesInserted + cryptoResult.ratesInserted,
      errors: [...fiatResult.errors, ...cryptoResult.errors],
      duration: fiatResult.duration + cryptoResult.duration,
      nextSyncDate: fiatResult.nextSyncDate
    };
  }
}
```

## Testing Strategy

### Unit Tests (`__tests__/services/crypto-rates.test.ts`)

```typescript
describe('Crypto Rate Service', () => {
  test('calculates BTC cross-rates correctly', () => {
    // Test BTC/USD to BTC/THB calculation
    // Verify rate precision and accuracy
  });
  
  test('handles CoinGecko API failures', async () => {
    // Mock API failure responses
    // Test retry logic and error handling
  });
  
  test('respects rate limits', async () => {
    // Test rate limiter functionality
    // Verify proper delays between requests
  });
});
```

### Integration Tests

```typescript
describe('Bitcoin Integration', () => {
  test('syncs BTC rates end-to-end', async () => {
    // Mock CoinGecko response
    // Execute full BTC sync
    // Verify database storage
    // Check cross-rate calculations
  });
});
```

## Performance Considerations

### API Usage Optimization

- **Free Tier Limit**: 50 requests/minute
- **Daily Usage**: ~1 request/day for current sync
- **Backfill Usage**: ~3,650 requests for 10 years (spread over hours)
- **Buffer Strategy**: 1.2-second delays between requests

### Memory Management

- Process BTC data separately from fiat data
- Minimal memory footprint for single-date operations
- Efficient cross-rate calculation

## Success Criteria

- [ ] Integrates BTC rates without affecting fiat currency sync
- [ ] Respects CoinGecko rate limits (never exceeds 50/min)
- [ ] Handles crypto market volatility appropriately
- [ ] Successfully backfills BTC data from 2015 to present
- [ ] Updates daily with accurate BTC cross-rates
- [ ] Graceful degradation when CoinGecko API unavailable

## Environment Variables

```bash
# Optional: CoinGecko Pro API key for higher limits
COINGECKO_API_KEY=your_api_key_here

# Cron secret for authentication
CRON_SECRET=your_cron_secret_here
```

## Manual Testing

```bash
# Test Bitcoin sync
curl -X POST http://localhost:3000/api/cron/sync-crypto-rates \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Test specific date
curl -X POST http://localhost:3000/api/admin/sync-btc-date \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-08-16"}'
```