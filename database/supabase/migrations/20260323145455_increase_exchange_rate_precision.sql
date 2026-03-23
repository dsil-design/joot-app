-- Migration: increase_exchange_rate_precision
-- Created: 2026-03-23 14:54:55

BEGIN;

-- Increase precision to support very small rates (e.g. VND/USD ≈ 0.000039)
ALTER TABLE exchange_rates
  ALTER COLUMN rate TYPE DECIMAL(18, 8);

COMMIT;
