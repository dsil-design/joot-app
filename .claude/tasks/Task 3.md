# Task 3: Historical Data Backfill System

## Objective

Create a one-time backfill function to populate exchange rates from 2015 to present using ECB historical data.

## Files to Create

- `src/pages/api/admin/backfill-rates.ts`
- `src/lib/services/backfill-service.ts`
- `src/lib/utils/date-helpers.ts`
- `scripts/run-backfill.ts` (for local execution)
- `__tests__/services/backfill-service.test.ts`

## Requirements

### 1. Backfill Service (`src/lib/services/backfill-service.ts`)

#### Core Functionality

```typescript
export class BackfillService {
  async executeBackfill(options: BackfillOptions): Promise<BackfillResult> {
    // 1. Fetch ECB historical data
    // 2. Filter data to target date range (2015-present)
    // 3. Process in chunks to avoid memory issues
    // 4. Calculate cross-rates for all currency pairs
    // 5. Batch insert to database
    // 6. Track progress and handle errors
  }
  
  async resumeBackfill(checkpointId: string): Promise<BackfillResult> {
    // Resume from last successful checkpoint
  }
}
```

#### Configuration

```typescript
interface BackfillOptions {
  startDate: string;        // '2015-01-01'
  endDate?: string;         // Default: today
  batchSize: number;        // Default: 500 records per batch
  skipExisting: boolean;    // Default: true
  dryRun: boolean;         // Default: false
}

interface BackfillResult {
  totalRecords: number;
  processedRecords: number;
  insertedRecords: number;
  skippedRecords: number;
  errorCount: number;
  duration: number;
  checkpoints: string[];
  errors: BackfillError[];
}
```

### 2. Data Processing Logic

#### Chunk Processing

```typescript
const processInChunks = async (data: ECBRate[], chunkSize: number) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  
  for (const chunk of chunks) {
    await processChunk(chunk);
    await createCheckpoint(chunk);
  }
};
```

#### Cross-Rate Calculation

```typescript
const generateCrossRates = (eurRates: ECBRate[]): ProcessedRate[] => {
  const crossRates: ProcessedRate[] = [];
  
  // Find USD rate for the date
  const usdRate = eurRates.find(r => r.currency === 'USD');
  if (!usdRate) return crossRates;
  
  // Calculate USD-based cross rates
  for (const rate of eurRates) {
    if (rate.currency === 'USD') continue;
    
    // USD/XXX = EUR/XXX ÷ EUR/USD
    const crossRate = rate.rate / usdRate.rate;
    
    crossRates.push({
      from_currency: 'USD',
      to_currency: rate.currency as CurrencyType,
      rate: crossRate,
      date: rate.date,
      source: 'ECB',
      is_interpolated: false
    });
    
    // Also add inverse rate XXX/USD
    crossRates.push({
      from_currency: rate.currency as CurrencyType,
      to_currency: 'USD',
      rate: 1 / crossRate,
      date: rate.date,
      source: 'ECB',
      is_interpolated: false
    });
  }
  
  return crossRates;
};
```

### 3. API Endpoint (`src/pages/api/admin/backfill-rates.ts`)

#### Security & Protection

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Verify admin authentication
  if (!await isAdminUser(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // 2. Prevent concurrent executions
  const lockKey = 'backfill-in-progress';
  if (await checkLock(lockKey)) {
    return res.status(429).json({ error: 'Backfill already in progress' });
  }
  
  // 3. Set execution timeout
  const timeout = setTimeout(() => {
    res.status(408).json({ error: 'Backfill timeout' });
  }, 14 * 60 * 1000); // 14 minutes (within Vercel limit)
  
  try {
    await acquireLock(lockKey);
    const result = await backfillService.executeBackfill(req.body);
    clearTimeout(timeout);
    res.status(200).json(result);
  } finally {
    await releaseLock(lockKey);
  }
}
```

#### Progress Streaming

```typescript
// Stream progress updates to client
const streamProgress = (res: NextApiResponse) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  return {
    update: (progress: BackfillProgress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    },
    end: () => res.end()
  };
};
```

### 4. Date Utilities (`src/lib/utils/date-helpers.ts`)

```typescript
export const dateHelpers = {
  // Generate business days between dates
  getBusinessDays: (startDate: string, endDate: string): string[] => {
    // Return array of YYYY-MM-DD strings
    // Skip weekends (Sat/Sun)
  },
  
  // Check if date is business day
  isBusinessDay: (date: string): boolean => {
    const day = new Date(date).getDay();
    return day >= 1 && day <= 5; // Mon-Fri
  },
  
  // Get previous business day
  getPreviousBusinessDay: (date: string): string => {
    // Walk backward until business day found
  },
  
  // Date range validation
  validateDateRange: (startDate: string, endDate: string): boolean => {
    return new Date(startDate) <= new Date(endDate);
  }
};
```

### 5. Local Execution Script (`scripts/run-backfill.ts`)

```typescript
#!/usr/bin/env ts-node

import { BackfillService } from '../src/lib/services/backfill-service';

const runBackfill = async () => {
  const backfillService = new BackfillService();
  
  console.log('🚀 Starting historical data backfill...');
  
  const options = {
    startDate: '2015-01-01',
    endDate: new Date().toISOString().split('T')[0],
    batchSize: 500,
    skipExisting: true,
    dryRun: process.argv.includes('--dry-run')
  };
  
  try {
    const result = await backfillService.executeBackfill(options);
    
    console.log('✅ Backfill completed successfully!');
    console.log(`📊 Processed: ${result.processedRecords} records`);
    console.log(`💾 Inserted: ${result.insertedRecords} records`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    
    if (result.errors.length > 0) {
      console.log(`⚠️  Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.error(error));
    }
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
};

runBackfill();
```

### 6. Error Handling & Recovery

#### Checkpoint System

```typescript
interface Checkpoint {
  id: string;
  timestamp: string;
  lastProcessedDate: string;
  totalProcessed: number;
  batchNumber: number;
}

const createCheckpoint = async (batch: ProcessedRate[]): Promise<string> => {
  // Save progress state for recovery
  // Store in database or file system
};

const loadCheckpoint = async (checkpointId: string): Promise<Checkpoint> => {
  // Load previous state for resume
};
```

#### Error Categories

```typescript
enum BackfillErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

interface BackfillError {
  type: BackfillErrorType;
  message: string;
  date?: string;
  retryable: boolean;
  context?: any;
}
```

## Performance Optimization

### Memory Management

- Process data in 500-record chunks
- Clear processed data from memory
- Use streaming for large datasets

### Database Optimization

- Use batch inserts with `bulkInsertRates()`
- Add `ON CONFLICT DO NOTHING` for duplicates
- Monitor connection pool usage

### Progress Tracking

```typescript
interface BackfillProgress {
  phase: 'fetching' | 'processing' | 'inserting' | 'complete';
  totalRecords: number;
  processedRecords: number;
  currentDate: string;
  estimatedTimeRemaining: number;
  errors: number;
}
```

## Success Criteria

- [ ] Processes 2015-2024 data successfully (~25,000 records)
- [ ] Completes within Vercel function timeout (15 minutes)
- [ ] Handles duplicate prevention correctly
- [ ] Provides comprehensive progress tracking
- [ ] Recovers gracefully from interruptions
- [ ] Validates data accuracy post-backfill

## Testing Strategy

1. **Unit Tests**: Test date calculations and rate processing
2. **Integration Tests**: Test with small date ranges
3. **Performance Tests**: Measure processing speed
4. **Recovery Tests**: Test checkpoint/resume functionality
5. **Validation Tests**: Verify database records accuracy

## Expected Data Volume

- **Date Range**: 2015-2024 (~9 years)
- **Business Days**: ~2,350 days
- **Currency Pairs**: 12 pairs
- **Total Records**: ~28,200 exchange rates

## Usage Instructions

```bash
# Local testing (dry run)
npm run backfill -- --dry-run

# Production execution
curl -X POST /api/admin/backfill-rates \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2015-01-01", "batchSize": 500}'
```