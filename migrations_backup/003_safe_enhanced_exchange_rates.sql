-- Migration: Safe Enhanced Exchange Rates Schema
-- This migration safely enhances the existing exchange_rates table
-- by checking current state and only making necessary changes

-- 1. Check if new columns exist and add them if missing
DO $$
BEGIN
    -- Add source column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchange_rates' 
        AND column_name = 'source'
    ) THEN
        ALTER TABLE exchange_rates ADD COLUMN source VARCHAR(50) DEFAULT 'ECB';
    END IF;
    
    -- Add is_interpolated column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchange_rates' 
        AND column_name = 'is_interpolated'
    ) THEN
        ALTER TABLE exchange_rates ADD COLUMN is_interpolated BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add interpolated_from_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchange_rates' 
        AND column_name = 'interpolated_from_date'
    ) THEN
        ALTER TABLE exchange_rates ADD COLUMN interpolated_from_date DATE;
    END IF;
END $$;

-- 2. Handle currency_type enum safely
DO $$
BEGIN
    -- Check if currency_type enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
        -- Create the enum if it doesn't exist
        CREATE TYPE currency_type AS ENUM ('USD', 'THB', 'EUR', 'GBP', 'SGD', 'VND', 'MYR', 'BTC');
    ELSE
        -- If enum exists, check if we need to add new values
        -- This is more complex and safer to handle manually if needed
        RAISE NOTICE 'currency_type enum already exists. Please check if it includes all required currencies: USD, THB, EUR, GBP, SGD, VND, MYR, BTC';
    END IF;
    
    -- Only alter column types if they're not already using currency_type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchange_rates' 
        AND column_name = 'from_currency' 
        AND data_type != 'USER-DEFINED'
    ) THEN
        -- Convert from_currency to enum type
        ALTER TABLE exchange_rates 
        ALTER COLUMN from_currency TYPE currency_type USING from_currency::text::currency_type;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchange_rates' 
        AND column_name = 'to_currency' 
        AND data_type != 'USER-DEFINED'
    ) THEN
        -- Convert to_currency to enum type
        ALTER TABLE exchange_rates 
        ALTER COLUMN to_currency TYPE currency_type USING to_currency::text::currency_type;
    END IF;
END $$;

-- 3. Handle other tables with currency columns (only if they exist)
DO $$
BEGIN
    -- Update transactions table if it exists and has original_currency column
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'transactions'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'original_currency'
        AND data_type != 'USER-DEFINED'
    ) THEN
        ALTER TABLE transactions 
        ALTER COLUMN original_currency TYPE currency_type USING original_currency::text::currency_type;
    END IF;
    
    -- Update users table if it exists and has preferred_currency column
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'preferred_currency'
        AND data_type != 'USER-DEFINED'
    ) THEN
        ALTER TABLE users 
        ALTER COLUMN preferred_currency TYPE currency_type USING preferred_currency::text::currency_type;
    END IF;
END $$;

-- 4. Create performance indexes (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
ON exchange_rates(from_currency, to_currency, date DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_source 
ON exchange_rates(source);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
ON exchange_rates(date DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_interpolated 
ON exchange_rates(is_interpolated, interpolated_from_date);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_recent_actual
ON exchange_rates(from_currency, to_currency, date DESC) 
WHERE is_interpolated = FALSE;

-- 5. Add constraints safely (only if they don't exist)
DO $$
BEGIN
    -- Ensure rates are positive
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'chk_positive_rate'
    ) THEN
        ALTER TABLE exchange_rates ADD CONSTRAINT chk_positive_rate CHECK (rate > 0);
    END IF;
    
    -- Ensure interpolated_from_date is set when is_interpolated is true
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'chk_interpolated_date'
    ) THEN
        ALTER TABLE exchange_rates ADD CONSTRAINT chk_interpolated_date 
        CHECK (
            (is_interpolated = FALSE AND interpolated_from_date IS NULL) OR
            (is_interpolated = TRUE AND interpolated_from_date IS NOT NULL)
        );
    END IF;
    
    -- Ensure source is not empty
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'chk_source_not_empty'
    ) THEN
        ALTER TABLE exchange_rates ADD CONSTRAINT chk_source_not_empty 
        CHECK (source IS NOT NULL AND LENGTH(TRIM(source)) > 0);
    END IF;
END $$;

-- 6. Add comments for documentation
COMMENT ON COLUMN exchange_rates.source IS 'Data source provider (e.g., ECB, Yahoo Finance)';
COMMENT ON COLUMN exchange_rates.is_interpolated IS 'True if this rate was calculated/interpolated from other dates';
COMMENT ON COLUMN exchange_rates.interpolated_from_date IS 'The date from which this rate was interpolated';

-- 7. Create the fallback function (replace if exists)
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