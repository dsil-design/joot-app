-- Migration: Backfill vendors and payment methods from existing transaction data
-- and update transactions to use foreign key relationships
-- This script is idempotent and safe to run multiple times

-- NOTE: This migration is designed for schemas that had text columns for vendor/payment_method
-- Our current schema already uses foreign key relationships, so this is mostly a no-op

-- Ensure indexes exist for foreign key columns (idempotent)
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id ON public.transactions(payment_method_id);

-- Report migration status
DO $$
DECLARE
    total_transactions INTEGER;
    vendor_fk_count INTEGER;
    payment_fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_transactions FROM public.transactions;
    SELECT COUNT(*) INTO vendor_fk_count FROM public.transactions WHERE vendor_id IS NOT NULL;
    SELECT COUNT(*) INTO payment_fk_count FROM public.transactions WHERE payment_method_id IS NOT NULL;
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '  Total transactions: %', total_transactions;
    RAISE NOTICE '  Transactions with vendor FK: %', vendor_fk_count;
    RAISE NOTICE '  Transactions with payment method FK: %', payment_fk_count;
END $$;
