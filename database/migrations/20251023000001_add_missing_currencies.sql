-- Migration: Add Missing Currencies (VND, MYR, CNY)
-- This migration adds support for Vietnamese Dong, Malaysian Ringgit, and Chinese Yuan

-- 1. Add new currency values to the currency_type enum
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'VND';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'MYR';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'CNY';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'GBP';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'SGD';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'EUR';

-- 2. Add VND to currency_configuration (MYR and CNY already exist but are not tracked)
INSERT INTO currency_configuration (currency_code, display_name, currency_symbol, source, is_crypto, is_tracked, decimal_places) VALUES
  ('VND', 'Vietnamese Dong', '₫', 'ECB', FALSE, TRUE, 0)
ON CONFLICT (currency_code) DO UPDATE
  SET is_tracked = TRUE, updated_at = NOW();

-- 3. Enable tracking for MYR and CNY
UPDATE currency_configuration
SET is_tracked = TRUE, updated_at = NOW()
WHERE currency_code IN ('MYR', 'CNY');

-- 4. Add comment
COMMENT ON TYPE currency_type IS 'Supported currency types including USD, EUR, GBP, THB, SGD, MYR, CNY, VND';
