-- Migration: Add payment_method_id foreign key to transactions table
-- This replaces the TEXT payment_method column with proper FK relationship

-- Step 1: Add the new payment_method_id column
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- Step 2: Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id 
ON public.transactions(payment_method_id);

-- Step 3: Migrate existing data from payment_method (TEXT) to payment_method_id (UUID FK)
-- This will match existing payment method names to the user's payment_methods table
DO $$
DECLARE
    transaction_record RECORD;
    payment_method_id_val UUID;
BEGIN
    -- Loop through all transactions that have a payment_method but no payment_method_id
    FOR transaction_record IN 
        SELECT t.id, t.user_id, t.payment_method
        FROM public.transactions t
        WHERE t.payment_method IS NOT NULL 
        AND t.payment_method != ''
        AND t.payment_method_id IS NULL
    LOOP
        -- Try to find matching payment method for this user
        SELECT pm.id INTO payment_method_id_val
        FROM public.payment_methods pm
        WHERE pm.user_id = transaction_record.user_id 
        AND pm.name = transaction_record.payment_method
        LIMIT 1;

        -- If found, update the transaction
        IF payment_method_id_val IS NOT NULL THEN
            UPDATE public.transactions 
            SET payment_method_id = payment_method_id_val
            WHERE id = transaction_record.id;
            
            RAISE NOTICE 'Migrated payment method "%" for transaction %', transaction_record.payment_method, transaction_record.id;
        ELSE
            -- Create the missing payment method for this user
            INSERT INTO public.payment_methods (name, user_id)
            VALUES (transaction_record.payment_method, transaction_record.user_id)
            ON CONFLICT (name, user_id) DO NOTHING
            RETURNING id INTO payment_method_id_val;
            
            -- If we just created it, get the ID
            IF payment_method_id_val IS NULL THEN
                SELECT id INTO payment_method_id_val
                FROM public.payment_methods
                WHERE name = transaction_record.payment_method 
                AND user_id = transaction_record.user_id;
            END IF;
            
            -- Update the transaction with the new payment method ID
            IF payment_method_id_val IS NOT NULL THEN
                UPDATE public.transactions 
                SET payment_method_id = payment_method_id_val
                WHERE id = transaction_record.id;
                
                RAISE NOTICE 'Created and linked payment method "%" for user % and transaction %', 
                    transaction_record.payment_method, transaction_record.user_id, transaction_record.id;
            END IF;
        END IF;
        
        -- Reset for next iteration
        payment_method_id_val := NULL;
    END LOOP;
END $$;

-- Step 4: Handle any transactions that have NULL/empty payment methods
-- Give them a default "Unknown Payment" method per user
DO $$
DECLARE
    user_record RECORD;
    unknown_payment_id UUID;
BEGIN
    -- For each user that has transactions with NULL payment methods
    FOR user_record IN 
        SELECT DISTINCT t.user_id
        FROM public.transactions t
        WHERE (t.payment_method IS NULL OR t.payment_method = '') 
        AND t.payment_method_id IS NULL
    LOOP
        -- Create or get "Unknown Payment" method for this user
        INSERT INTO public.payment_methods (name, user_id)
        VALUES ('Unknown Payment', user_record.user_id)
        ON CONFLICT (name, user_id) DO NOTHING;
        
        -- Get the ID
        SELECT id INTO unknown_payment_id
        FROM public.payment_methods
        WHERE name = 'Unknown Payment' AND user_id = user_record.user_id;
        
        -- Update all transactions for this user that have no payment method
        UPDATE public.transactions 
        SET payment_method_id = unknown_payment_id
        WHERE user_id = user_record.user_id 
        AND (payment_method IS NULL OR payment_method = '') 
        AND payment_method_id IS NULL;
        
        RAISE NOTICE 'Assigned "Unknown Payment" to transactions for user %', user_record.user_id;
    END LOOP;
END $$;

-- Step 5: Add NOT NULL constraint after migration (optional, can be done later)
-- We'll keep it nullable for now to be safe during deployment
-- ALTER TABLE public.transactions ALTER COLUMN payment_method_id SET NOT NULL;

-- Step 6: Note about legacy columns - will be dropped in Phase 5
-- DO NOT DROP YET: payment_method (TEXT) column - needed until code migration complete
-- The following will be done in Phase 5 after code migration:
-- ALTER TABLE public.transactions DROP COLUMN payment_method;
-- DROP INDEX IF EXISTS idx_transactions_payment_method;

RAISE NOTICE 'Migration complete: payment_method_id foreign key added and data migrated';
