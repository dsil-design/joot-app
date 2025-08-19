-- Migration: Clean up transactions table schema
-- Remove title field and legacy text columns, keep only proper foreign keys

-- Step 1: Remove the title column (we only want description)
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS title;

-- Step 2: Remove legacy text columns (vendor and payment_method)
-- These should have been dropped in previous migration, but ensure they're gone
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS vendor,
DROP COLUMN IF EXISTS payment_method;

-- Step 3: Drop any legacy indexes that might still exist
DROP INDEX IF EXISTS idx_transactions_vendor;
DROP INDEX IF EXISTS idx_transactions_payment_method;

-- Step 4: Ensure we have proper indexes for the foreign keys
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id ON public.transactions(payment_method_id);

-- Step 5: Verify the cleanup
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    -- Check if title column still exists
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'title';
    
    IF column_count > 0 THEN
        RAISE EXCEPTION 'Title column still exists - migration may have failed';
    END IF;
    
    -- Check if legacy text columns still exist
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name IN ('vendor', 'payment_method');
    
    IF column_count > 0 THEN
        RAISE EXCEPTION 'Legacy text columns still exist - migration may have failed';
    END IF;
    
    RAISE NOTICE 'Schema cleanup completed successfully';
END $$;
