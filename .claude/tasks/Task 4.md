# Task 4: Daily Exchange Rate Sync System

## Objective

Create automated daily synchronization of exchange rates with gap-filling logic for weekends/holidays.

## Files to Create

- `src/pages/api/cron/sync-exchange-rates.ts`
- `src/lib/services/daily-sync-service.ts`
- `src/lib/services/gap-filling-service.ts`
- `vercel.json` (cron configuration)
- `__tests__/services/daily-sync.test.ts`

## Requirements

### 1. Daily Sync Service (`src/lib/services/daily-sync-service.ts`)

#### Core Functionality

```typescript
export class DailySyncService {
  async executeDailySync(): Promise<SyncResult> {
    // 1. Determine target date (previous business day)
    // 2. Check if data already exists
    // 3. Fetch latest ECB rates
    // 4. Calculate cross-rates
    // 5. Insert new rates to database
    // 6. Trigger gap-filling service
    // 7. Return comprehensive result
  }
  
  async syncSpecificDate(date: string): Promise<SyncResult> {
    // Manual sync for specific date
  }
}
```

#### Sync Configuration

```typescript
interface SyncOptions {
  targetDate?: string;      // Default: previous business day
  forceUpdate: boolean;     // Default: false
  fillGaps: boolean;        // Default: true
  maxGapDays: number;       // Default: 7
}

interface SyncResult {
  success: boolean;
  targetDate: string;
  ratesInserted: number;
  gapsFilled: number;
  errors: SyncError[];
  duration: number;
  nextSyncDate: string;
}
```

### 2. Gap-Filling Service (`src/lib/services/gap-filling-service.ts`)

#### Gap Detection Logic

```typescript
export class GapFillingService {
  async findMissingDates(
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType,
    dayRange: number = 30
  ): Promise<string[]> {
    // Find missing rates in the last N days
    // Return array of dates with no data
  }
  
  async fillGaps(missingDates: string[]): Promise<GapFillResult> {
    // For each missing date, find most recent rate
    // Create interpolated rates
    // Mark as interpolated in database
  }
}
```

#### Weekend/Holiday Logic

```typescript
const handleWeekendGaps = async (targetDate: string): Promise<void> => {
  const dayOfWeek = new Date(targetDate).getDay();
  
  // If Monday (1), check for weekend gaps
  if (dayOfWeek === 1) {
    const saturday = getPreviousDay(targetDate, 2);
    const sunday = getPreviousDay(targetDate, 1);
    
    await fillWeekendGaps([saturday, sunday]);
  }
};

const fillWeekendGaps = async (weekendDates: string[]): Promise<void> => {
  // Use Friday's rate for Saturday and Sunday
  const friday = getPreviousBusinessDay(weekendDates[0]);
  const fridayRates = await getRatesForDate(friday);
  
  for (const date of weekendDates) {
    await storeInterpolatedRates(fridayRates, date, friday);
  }
};
```

### 3. Cron API Endpoint (`src/pages/api/cron/sync-exchange-rates.ts`)

#### Vercel Cron Handler

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Verify cron authentication
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // 2. Set timeout protection
  const timeout = setTimeout(() => {
    res.status(408).json({ error: 'Sync timeout' });
  }, 4 * 60 * 1000); // 4 minutes
  
  try {
    const syncService = new DailySyncService();
    const result = await syncService.executeDailySync();
    
    clearTimeout(timeout);
    
    // 3. Return structured response
    res.status(200).json({
      success: result.success,
      message: `Synced ${result.ratesInserted} rates for ${result.targetDate}`,
      data: result
    });
    
    // 4. Optional: Send notification if errors
    if (result.errors.length > 0) {
      await sendErrorNotification(result.errors);
    }
    
  } catch (error) {
    clearTimeout(timeout);
    console.error('Daily sync failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 4. Vercel Cron Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-exchange-rates",
      "schedule": "0 18 * * 1-5"
    }
  ]
}
```

#### Schedule Explanation

- **Time**: 18:00 UTC (6 PM UTC)
- **Days**: Monday-Friday only
- **Reasoning**: ECB updates around 16:00 CET, giving 2+ hour buffer

### 5. Date Logic & Business Day Handling

#### Target Date Calculation

```typescript
const getTargetSyncDate = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // If Monday, sync Friday's data
  if (dayOfWeek === 1) {
    return subtractBusinessDays(today, 3); // Fri
  }
  
  // Otherwise, sync previous business day
  return subtractBusinessDays(today, 1);
};

const subtractBusinessDays = (date: Date, days: number): string => {
  let current = new Date(date);
  let businessDays = 0;
  
  while (businessDays < days) {
    current.setDate(current.getDate() - 1);
    if (isBusinessDay(current)) {
      businessDays++;
    }
  }
  
  return current.toISOString().split('T')[0];
};
```

### 6. Error Handling & Retry Logic

#### Retry Configuration

```typescript
const SYNC_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 2000,      // 2 seconds
  maxDelay: 30000,      // 30 seconds
  backoffFactor: 2
};

const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= SYNC_RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < SYNC_RETRY_CONFIG.maxAttempts) {
        const delay = Math.min(
          SYNC_RETRY_CONFIG.baseDelay * Math.pow(SYNC_RETRY_CONFIG.backoffFactor, attempt - 1),
          SYNC_RETRY_CONFIG.maxDelay
        );
        
        console.warn(`${context} failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};
```

#### Error Categories

```typescript
enum SyncErrorType {
  ECB_UNAVAILABLE = 'ECB_UNAVAILABLE',
  PARSE_ERROR = 'PARSE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS'
}

interface SyncError {
  type: SyncErrorType;
  message: string;
  currency?: string;
  date?: string;
  retryable: boolean;
}
```

### 7. Duplicate Prevention & Data Integrity

#### Conflict Resolution

```typescript
const insertRatesWithConflictHandling = async (rates: ProcessedRate[]): Promise<number> => {
  // Use ON CONFLICT DO NOTHING for exact duplicates
  // Use ON CONFLICT DO UPDATE for rate corrections
  
  const { data, error } = await supabase
    .from('exchange_rates')
    .upsert(rates, {
      onConflict: 'from_currency,to_currency,date',
      ignoreDuplicates: false
    });
    
  if (error) throw new Error(`Database insert failed: ${error.message}`);
  return data?.length || 0;
};
```

#### Data Validation

```typescript
const validateSyncData = (rates: ProcessedRate[]): ValidationResult => {
  const errors: string[] = [];
  
  // Check for required currencies
  const requiredCurrencies = ['USD', 'THB', 'EUR', 'GBP'];
  const presentCurrencies = new Set(rates.map(r => r.to_currency));
  
  for (const currency of requiredCurrencies) {
    if (!presentCurrencies.has(currency)) {
      errors.push(`Missing rates for ${currency}`);
    }
  }
  
  // Validate rate ranges (basic sanity check)
  for (const rate of rates) {
    if (rate.rate <= 0 || rate.rate > 1000000) {
      errors.push(`Invalid rate for ${rate.from_currency}/${rate.to_currency}: ${rate.rate}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
```

### 8. Monitoring & Notifications

#### Success/Failure Tracking

```typescript
const logSyncResult = async (result: SyncResult): Promise<void> => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    target_date: result.targetDate,
    success: result.success,
    rates_inserted: result.ratesInserted,
    gaps_filled: result.gapsFilled,
    error_count: result.errors.length,
    duration_ms: result.duration
  };
  
  // Store in monitoring table or external service
  await storeSyncLog(logEntry);
};
```

#### Health Check Endpoint

```typescript
// src/pages/api/health/exchange-rates.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if recent data exists
    const yesterday = getPreviousBusinessDay(new Date().toISOString().split('T')[0]);
    const recentRates = await getRatesForDate(yesterday);
    
    const health = {
      status: recentRates.length > 0 ? 'healthy' : 'stale',
      lastSyncDate: yesterday,
      ratesAvailable: recentRates.length,
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Testing Strategy

### Unit Tests (`__tests__/services/daily-sync.test.ts`)

```typescript
describe('Daily Sync Service', () => {
  test('calculates correct target date', () => {
    // Test Monday -> Friday logic
    // Test Tuesday-Friday -> previous day logic
  });
  
  test('handles ECB service failures', async () => {
    // Mock ECB API failure
    // Verify retry logic
    // Check error reporting
  });
  
  test('prevents duplicate insertions', async () => {
    // Test with existing data
    // Verify conflict handling
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Sync', () => {
  test('complete sync workflow', async () => {
    // Mock ECB response
    // Execute full sync
    // Verify database state
    // Check gap filling
  });
});
```

## Performance Requirements

- Complete sync in <30 seconds
- Handle temporary ECB outages gracefully
- Process all target currencies in single operation
- Minimal database connection usage

## Success Criteria

- [ ] Runs automatically Monday-Friday at 6 PM UTC
- [ ] Processes daily rates in <30 seconds
- [ ] Handles gaps automatically with forward-fill
- [ ] Zero manual intervention required for normal operation
- [ ] Comprehensive error logging and monitoring
- [ ] Graceful handling of ECB service outages

## Manual Testing Commands

```bash
# Test cron endpoint locally
curl -X POST http://localhost:3000/api/cron/sync-exchange-rates \
  -H "Authorization: Bearer test-secret"

# Test specific date sync
curl -X POST http://localhost:3000/api/admin/sync-date \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-08-16"}'

# Check health status
curl http://localhost:3000/api/health/exchange-rates
```

## Deployment Notes

- Set `CRON_SECRET` environment variable in Vercel
- Monitor function execution in Vercel dashboard
- Set up alerts for sync failures
- Verify timezone handling (UTC vs local time)