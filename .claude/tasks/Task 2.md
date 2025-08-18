# Task 2: European Central Bank Data Fetcher

## Objective

Create a robust service to fetch and parse ECB exchange rate data (both current and historical).

## Files to Create

- `src/lib/services/ecb-fetcher.ts`
- `src/lib/services/rate-calculator.ts`
- `src/lib/types/exchange-rates.ts`
- `__tests__/services/ecb-fetcher.test.ts`

## Requirements

### 1. ECB Fetcher Service (`src/lib/services/ecb-fetcher.ts`)

#### Core Functions

```typescript
class ECBFetcher {
  // Fetch daily rates
  async fetchDailyRates(): Promise<ECBRate[]> {
    // URL: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
  }
  
  // Fetch historical rates (full dataset)
  async fetchHistoricalRates(): Promise<ECBRate[]> {
    // URL: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml
  }
  
  // Fetch rates for specific date range
  async fetchRatesForDateRange(startDate: string, endDate: string): Promise<ECBRate[]> {
    // Use historical endpoint and filter dates
  }
}
```

#### Requirements

1. **XML Parsing**: Parse ECB XML format to extract currency rates
2. **Error Handling**: Exponential backoff retry (3 attempts max)
3. **Validation**: Verify data structure and currency codes
4. **Network Resilience**: Handle timeouts and connection issues
5. **Data Transformation**: Convert XML to structured objects

#### Expected XML Structure

```xml
<Envelope>
  <Cube>
    <Cube time="2024-08-16">
      <Cube currency="USD" rate="1.0945"/>
      <Cube currency="THB" rate="39.755"/>
      <!-- ... other currencies ... -->
    </Cube>
  </Cube>
</Envelope>
```

### 2. Rate Calculator Service (`src/lib/services/rate-calculator.ts`)

#### Currency Conversion Logic

```typescript
class RateCalculator {
  // Convert EUR-based rates to USD cross-rates
  calculateCrossRates(eurRates: ECBRate[]): ProcessedRate[] {
    // EUR/USD = 1.0945, EUR/THB = 39.755
    // Calculate USD/THB = 39.755 / 1.0945 = 36.32
  }
  
  // Generate all required currency pairs
  generateAllPairs(baseRates: ECBRate[]): ProcessedRate[] {
    // Create matrix of all combinations
    // Include inverse rates (THB/USD from USD/THB)
  }
}
```

#### Target Currency Pairs

```typescript
const CURRENCY_PAIRS = [
  ['USD', 'THB'], ['USD', 'EUR'], ['USD', 'GBP'],
  ['USD', 'SGD'], ['USD', 'VND'], ['USD', 'MYR'],
  // Include reverse pairs
  ['THB', 'USD'], ['EUR', 'USD'], ['GBP', 'USD'],
  ['SGD', 'USD'], ['VND', 'USD'], ['MYR', 'USD']
];
```

### 3. Type Definitions (`src/lib/types/exchange-rates.ts`)

```typescript
// Raw data from ECB
export interface ECBRate {
  date: string;          // YYYY-MM-DD format
  currency: string;      // ISO currency code
  rate: number;         // Rate against EUR
}

// Processed rate ready for database
export interface ProcessedRate {
  from_currency: CurrencyType;
  to_currency: CurrencyType;
  rate: number;
  date: string;
  source: 'ECB';
  is_interpolated: false;
}

// Service response wrapper
export interface FetchResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
  timestamp: string;
}
```

### 4. Error Handling Strategy

```typescript
// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,     // 1 second
  maxDelay: 10000,     // 10 seconds
  backoffFactor: 2
};

// Error types
export enum ECBErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT'
}
```

### 5. Data Validation

```typescript
// Validate fetched data
const validateECBData = (rates: ECBRate[]): boolean => {
  // Check required currencies are present
  // Verify rate values are positive numbers
  // Ensure date format is correct
  // Validate currency codes against known list
};

// Currency code validation
const VALID_CURRENCIES = ['USD', 'THB', 'GBP', 'SGD', 'VND', 'MYR'];
```

## Testing Requirements (`__tests__/services/ecb-fetcher.test.ts`)

### Unit Tests

1. **XML Parsing Tests**
   - Valid XML response parsing
   - Malformed XML handling
   - Missing currency handling
2. **Rate Calculation Tests**
   - EUR to USD cross-rate calculation
   - Inverse rate calculation
   - Edge cases (zero rates, missing currencies)
3. **Error Handling Tests**
   - Network timeout simulation
   - Invalid XML response
   - Missing ECB service
4. **Mock Data Tests**
   - Use sample ECB XML responses
   - Test with known historical rates
   - Verify calculation accuracy

### Integration Tests

```typescript
describe('ECB Integration', () => {
  test('fetches real ECB data', async () => {
    // Test against actual ECB endpoint
    // Verify response structure
    // Check calculation accuracy
  });
});
```

## Performance Requirements

- Process ~100 rates in <5 seconds
- Handle large historical dataset (10+ years)
- Memory efficient XML parsing
- Concurrent request handling

## Success Criteria

- [ ] Successfully fetches and parses ECB XML data
- [ ] Converts EUR rates to USD cross-rates correctly
- [ ] Handles all error scenarios gracefully
- [ ] 90%+ test coverage achieved
- [ ] Performance targets met
- [ ] Validates data integrity

## API Endpoints Used

1. **Daily**: `https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml`
2. **Historical**: `https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml`

## Dependencies

- `xml2js` or native XML parsing
- `date-fns` for date manipulation
- Built-in `fetch` for HTTP requests

## Notes

- ECB updates rates around 16:00 CET on business days
- Historical data goes back to 1999
- All rates are against EUR as base currency
- Weekend/holiday gaps are normal and expected