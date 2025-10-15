-- Migration: Make exchange_rate column nullable
-- Date: 2025-10-15
-- Description: Make the exchange_rate column in transactions table nullable
-- as we transition to fetching rates from the exchange_rates table instead
-- of storing them on each transaction.

-- Make exchange_rate nullable
ALTER TABLE transactions
ALTER COLUMN exchange_rate DROP NOT NULL;

-- Update constraint to allow NULL values
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS positive_exchange_rate;

ALTER TABLE transactions
ADD CONSTRAINT positive_exchange_rate CHECK (exchange_rate IS NULL OR exchange_rate > 0);

-- Add a comment explaining the deprecation
COMMENT ON COLUMN transactions.exchange_rate IS 'DEPRECATED: Exchange rate is now fetched from exchange_rates table. This column will be removed in a future migration.';
