-- Migration: Increase exchange_rate precision for small currencies like VND
-- Date: 2025-11-05
-- Description: Change exchange_rates.rate from DECIMAL(10, 4) to DECIMAL(20, 10)
-- to support currencies with very small exchange rates like VND
--
-- Example: VND to USD = 0.0000431965 (requires at least 10 decimal places)
--
-- Before: DECIMAL(10, 4) - max 10 digits total, 4 after decimal (e.g., 123456.7890)
-- After:  DECIMAL(20, 10) - max 20 digits total, 10 after decimal (e.g., 1234567890.1234567890)

-- Change the rate column precision
ALTER TABLE public.exchange_rates
ALTER COLUMN rate TYPE DECIMAL(20, 10);

-- Drop and recreate the positive_rate constraint (to ensure it works with new precision)
ALTER TABLE public.exchange_rates
DROP CONSTRAINT IF EXISTS positive_rate;

ALTER TABLE public.exchange_rates
ADD CONSTRAINT chk_positive_rate CHECK (rate > 0);

-- Add comment explaining the precision
COMMENT ON COLUMN public.exchange_rates.rate IS 'Exchange rate with high precision (DECIMAL(20, 10)) to support currencies with very small rates like VND';
