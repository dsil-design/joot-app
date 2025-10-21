-- Migration: Remove unused columns from database
-- Created: 2025-10-16
-- Description: Removes columns that are not used in the application codebase

-- =============================================================================
-- ANALYSIS SUMMARY
-- =============================================================================
-- This migration removes 3 unused columns:
--
-- 1. transactions.exchange_rate
--    - Marked as DEPRECATED in schema
--    - Has data in 63/66 records but NOT used in code
--    - Exchange rates now fetched from exchange_rates table
--
-- 2. transactions.title
--    - NOT in schema.sql (added manually at some point)
--    - Has 0/66 records with values
--    - NOT used anywhere in codebase
--
-- 3. users.preferred_currency
--    - All 3 users have values BUT not used in application logic
--    - Only exists in type definitions
-- =============================================================================

BEGIN;

-- Step 1: Drop exchange_rate from transactions table
-- This column was used in old implementation but is now deprecated
-- Exchange rates are now fetched dynamically from exchange_rates table
ALTER TABLE public.transactions
DROP COLUMN IF EXISTS exchange_rate;

-- Step 2: Drop title from transactions table
-- This column was never used and has no data
ALTER TABLE public.transactions
DROP COLUMN IF EXISTS title;

-- Step 3: Drop preferred_currency from users table
-- This column has data but is not used in the application
ALTER TABLE public.users
DROP COLUMN IF EXISTS preferred_currency;

COMMIT;

-- Verification queries (run after migration)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND table_schema = 'public';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public';
