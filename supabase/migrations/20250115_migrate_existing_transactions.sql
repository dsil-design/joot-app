-- Migration: Backfill vendors and payment methods from existing transaction data
-- and update transactions to use foreign key relationships
-- This script is idempotent and safe to run multiple times

-- PART 1: Create missing vendors from existing transaction data
INSERT INTO public.vendors (name, user_id)
SELECT DISTINCT t.vendor, t.user_id 
FROM public.transactions t
WHERE t.vendor IS NOT NULL 
  AND t.vendor != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.vendors v 
    WHERE v.name = t.vendor AND v.user_id = t.user_id
  )
ON CONFLICT (name, user_id) DO NOTHING;

-- PART 2: Create missing payment methods from existing transaction data
INSERT INTO public.payment_methods (name, user_id)
SELECT DISTINCT t.payment_method, t.user_id 
FROM public.transactions t
WHERE t.payment_method IS NOT NULL 
  AND t.payment_method != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_methods pm 
    WHERE pm.name = t.payment_method AND pm.user_id = t.user_id
  )
ON CONFLICT (name, user_id) DO NOTHING;

-- PART 3: Update transactions to link to vendor foreign keys
UPDATE public.transactions t
SET vendor_id = v.id
FROM public.vendors v
WHERE t.vendor = v.name 
  AND t.user_id = v.user_id 
  AND t.vendor_id IS NULL
  AND t.vendor IS NOT NULL
  AND t.vendor != '';

-- PART 4: Update transactions to link to payment method foreign keys  
UPDATE public.transactions t
SET payment_method_id = pm.id
FROM public.payment_methods pm
WHERE t.payment_method = pm.name 
  AND t.user_id = pm.user_id 
  AND t.payment_method_id IS NULL
  AND t.payment_method IS NOT NULL
  AND t.payment_method != '';

-- PART 5: Add indexes for the new foreign key columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id ON public.transactions(payment_method_id);

-- Report migration status
DO $$
DECLARE
    total_transactions INTEGER;
    vendor_fk_count INTEGER;
    payment_fk_count INTEGER;
    vendor_text_count INTEGER;
    payment_text_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_transactions FROM public.transactions;
    SELECT COUNT(*) INTO vendor_fk_count FROM public.transactions WHERE vendor_id IS NOT NULL;
    SELECT COUNT(*) INTO payment_fk_count FROM public.transactions WHERE payment_method_id IS NOT NULL;
    SELECT COUNT(*) INTO vendor_text_count FROM public.transactions WHERE vendor IS NOT NULL AND vendor != '';
    SELECT COUNT(*) INTO payment_text_count FROM public.transactions WHERE payment_method IS NOT NULL AND payment_method != '';
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '  Total transactions: %', total_transactions;
    RAISE NOTICE '  Transactions with vendor FK: %', vendor_fk_count;
    RAISE NOTICE '  Transactions with payment method FK: %', payment_fk_count;
    RAISE NOTICE '  Transactions with vendor text: %', vendor_text_count;
    RAISE NOTICE '  Transactions with payment method text: %', payment_text_count;
END $$;
