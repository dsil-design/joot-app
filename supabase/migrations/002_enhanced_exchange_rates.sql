-- Migration: Enhanced Exchange Rates Schema
-- This migration enhances the existing exchange_rates table to support multiple currencies,
-- data sources, and interpolated rates for improved currency conversion capabilities.

-- 1. Add new columns to exchange_rates table
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'ECB';
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS is_interpolated BOOLEAN DEFAULT FALSE;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS interpolated_from_date DATE;

-- 2. Update currency enum to include all target currencies
-- Drop existing enum and recreate with new values
DROP TYPE IF EXISTS currency_type CASCADE;
CREATE TYPE currency_type AS ENUM ('USD', 'THB', 'EUR', 'GBP', 'SGD', 'VND', 'MYR', 'BTC');

-- 3. Recreate affected columns with the new enum type
ALTER TABLE exchange_rates 
  ALTER COLUMN from_currency TYPE currency_type USING from_currency::text::currency_type,
  ALTER COLUMN to_currency TYPE currency_type USING to_currency::text::currency_type;

-- Also update other tables that use currency_type
ALTER TABLE transactions 
  ALTER COLUMN original_currency TYPE currency_type USING original_currency::text::currency_type;

ALTER TABLE users 
  ALTER COLUMN preferred_currency TYPE currency_type USING preferred_currency::text::currency_type;

-- 4. Create performance indexes for efficient lookups
-- Multi-column index for efficient currency pair and date lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
ON exchange_rates(from_currency, to_currency, date DESC);

-- Index on source for filtering by data provider
CREATE INDEX IF NOT EXISTS idx_exchange_rates_source 
ON exchange_rates(source);

-- Index on date for time-series queries
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
ON exchange_rates(date DESC);

-- Index for interpolated rates queries
CREATE INDEX IF NOT EXISTS idx_exchange_rates_interpolated 
ON exchange_rates(is_interpolated, interpolated_from_date);

-- Index for finding the most recent non-interpolated rate
CREATE INDEX IF NOT EXISTS idx_exchange_rates_recent_actual
ON exchange_rates(from_currency, to_currency, date DESC) 
WHERE is_interpolated = FALSE;

-- 5. Add constraints for data integrity
-- Ensure rates are positive
ALTER TABLE exchange_rates ADD CONSTRAINT chk_positive_rate CHECK (rate > 0);

-- Ensure interpolated_from_date is set when is_interpolated is true
ALTER TABLE exchange_rates ADD CONSTRAINT chk_interpolated_date 
CHECK (
  (is_interpolated = FALSE AND interpolated_from_date IS NULL) OR
  (is_interpolated = TRUE AND interpolated_from_date IS NOT NULL)
);

-- Ensure source is not empty
ALTER TABLE exchange_rates ADD CONSTRAINT chk_source_not_empty 
CHECK (source IS NOT NULL AND LENGTH(TRIM(source)) > 0);

-- 6. Add comments for documentation
COMMENT ON COLUMN exchange_rates.source IS 'Data source provider (e.g., ECB, Yahoo Finance)';
COMMENT ON COLUMN exchange_rates.is_interpolated IS 'True if this rate was calculated/interpolated from other dates';
COMMENT ON COLUMN exchange_rates.interpolated_from_date IS 'The date from which this rate was interpolated';

-- 7. Create a function to get exchange rate with fallback logic
CREATE OR REPLACE FUNCTION get_exchange_rate_with_fallback(
  p_from_currency currency_type,
  p_to_currency currency_type,
  p_date DATE,
  p_max_days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  rate NUMERIC,
  actual_date DATE,
  source VARCHAR(50),
  is_interpolated BOOLEAN
) AS $$
BEGIN
  -- First try exact date match
  RETURN QUERY
  SELECT er.rate, er.date, er.source, er.is_interpolated
  FROM exchange_rates er
  WHERE er.from_currency = p_from_currency
    AND er.to_currency = p_to_currency
    AND er.date = p_date
  ORDER BY er.is_interpolated ASC  -- Prefer actual rates over interpolated
  LIMIT 1;
  
  -- If no exact match found, try finding the most recent rate within the specified range
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT er.rate, er.date, er.source, er.is_interpolated
    FROM exchange_rates er
    WHERE er.from_currency = p_from_currency
      AND er.to_currency = p_to_currency
      AND er.date >= p_date - p_max_days_back
      AND er.date <= p_date
    ORDER BY er.date DESC, er.is_interpolated ASC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_exchange_rate_with_fallback IS 
'Get exchange rate with fallback logic: exact date first, then most recent within specified range';