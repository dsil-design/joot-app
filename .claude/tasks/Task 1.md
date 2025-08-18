# Task 1: Enhanced Database Schema for Multi-Currency Exchange Rates

## Objective

Enhance the existing exchange_rates table to support multiple currencies, data sources, and interpolated rates.

## Files to Modify/Create

- `supabase/migrations/002_enhanced_exchange_rates.sql`
- `src/lib/supabase/types.ts` (update types)
- `src/lib/supabase/database.ts` (add new functions)

## Requirements

### 1. Database Schema Changes

Add columns to exchange_rates table:

```sql
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'ECB';
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS is_interpolated BOOLEAN DEFAULT FALSE;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS interpolated_from_date DATE;
```

### 2. Performance Indexes

```sql
-- Multi-column index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
ON exchange_rates(from_currency, to_currency, date DESC);

-- Index on source for filtering by data provider
CREATE INDEX IF NOT EXISTS idx_exchange_rates_source 
ON exchange_rates(source);

-- Index on date for time-series queries
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
ON exchange_rates(date DESC);

-- Index for interpolated rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_interpolated 
ON exchange_rates(is_interpolated, interpolated_from_date);
```

### 3. Currency Type Expansion

Update currency enum to include all target currencies:

```sql
-- Drop existing enum and recreate with new values
DROP TYPE IF EXISTS currency_type CASCADE;
CREATE TYPE currency_type AS ENUM ('USD', 'THB', 'EUR', 'GBP', 'SGD', 'VND', 'MYR', 'BTC');

-- Recreate affected columns
ALTER TABLE exchange_rates 
  ALTER COLUMN from_currency TYPE currency_type USING from_currency::text::currency_type,
  ALTER COLUMN to_currency TYPE currency_type USING to_currency::text::currency_type;
```

### 4. TypeScript Type Updates

Update `src/lib/supabase/types.ts`:

```typescript
export type CurrencyType = 'USD' | 'THB' | 'EUR' | 'GBP' | 'SGD' | 'VND' | 'MYR' | 'BTC';

export interface ExchangeRate {
  id: string;
  from_currency: CurrencyType;
  to_currency: CurrencyType;
  rate: number;
  date: string;
  source: string;
  is_interpolated: boolean;
  interpolated_from_date?: string;
  created_at: string;
}
```

### 5. Database Utility Functions

Add to `src/lib/supabase/database.ts`:

```typescript
// Get exchange rate with automatic fallback to interpolated data
const getExchangeRateWithFallback = async (
  fromCurrency: CurrencyType, 
  toCurrency: CurrencyType, 
  date: string
): Promise<ExchangeRate | null> => {
  // First try exact date
  // Then try interpolated rates
  // Finally try last available rate within 7 days
};

// Store interpolated rate
const storeInterpolatedRate = async (
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType, 
  date: string,
  rate: number,
  sourceDate: string
): Promise<void> => {
  // Insert with is_interpolated = true
  // Set interpolated_from_date = sourceDate
};

// Bulk insert rates for performance
const bulkInsertRates = async (rates: ExchangeRateInsert[]): Promise<void> => {
  // Batch insert 500 records at a time
  // Handle conflicts with ON CONFLICT DO NOTHING
};
```

## Success Criteria

- [ ] Migration runs without errors in Supabase
- [ ] TypeScript types compile successfully
- [ ] All new utility functions are properly typed
- [ ] Backward compatibility maintained with existing code
- [ ] Performance indexes improve query speed

## Testing

1. Run migration in Supabase SQL Editor
2. Verify types with `npm run type-check`
3. Test utility functions with sample data
4. Check query performance with EXPLAIN ANALYZE

## Notes

- Preserve existing data during migration
- Add proper error handling for type conversions
- Consider adding database constraints for data validation
- Document any breaking changes for other developers