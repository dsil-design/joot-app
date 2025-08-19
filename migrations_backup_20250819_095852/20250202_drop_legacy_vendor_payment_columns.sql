-- Migration: Drop legacy TEXT columns after FK migration is complete
-- This should ONLY be run after:
-- 1. The payment_method_id FK migration has been applied
-- 2. All code has been updated to use the new FK relationships
-- 3. Data integrity has been verified

-- IMPORTANT: This is a destructive operation. Ensure you have backups!
-- Run this only after thoroughly testing the new FK-based system in production

-- Step 1: Drop the legacy TEXT columns
-- These columns are no longer needed since we now use proper foreign keys
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS vendor,
DROP COLUMN IF EXISTS payment_method;

-- Step 2: Drop the now-unused indexes for the TEXT columns
DROP INDEX IF EXISTS idx_transactions_vendor;
DROP INDEX IF EXISTS idx_transactions_payment_method;

-- Step 3: Optional - Add NOT NULL constraints to the FK columns
-- Only do this if you want to enforce that every transaction must have
-- a vendor and payment method. Otherwise, keep them nullable.
-- 
-- Uncomment the following lines if you want to make them required:
-- ALTER TABLE public.transactions ALTER COLUMN vendor_id SET NOT NULL;
-- ALTER TABLE public.transactions ALTER COLUMN payment_method_id SET NOT NULL;

-- Step 4: Verify the cleanup
-- After running this migration, verify that:
-- 1. All existing transactions still display correctly
-- 2. New transactions can be created successfully 
-- 3. The application functions properly without the legacy columns

DO $$
BEGIN
    RAISE NOTICE 'Legacy columns dropped successfully. Verify all functionality still works correctly.';
END $$;
