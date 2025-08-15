-- Complete migration to fix missing columns and set up FK relationships
-- This script is idempotent and safe to run multiple times

-- STEP 1: Add missing columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- STEP 2: Set title = description where title is null (for existing records)
UPDATE public.transactions 
SET title = COALESCE(description, 'Transaction')
WHERE title IS NULL;

-- STEP 3: Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id ON public.transactions(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_transactions_vendor ON public.transactions(vendor);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON public.transactions(payment_method);

-- STEP 4: Create default vendors and payment methods for all users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Create default vendors for each user
    FOR user_record IN SELECT id FROM public.users LOOP
        INSERT INTO public.vendors (name, user_id) VALUES
            ('McDonald''s', user_record.id),
            ('Starbucks', user_record.id),
            ('Amazon', user_record.id),
            ('Target', user_record.id),
            ('Uber', user_record.id),
            ('Netflix', user_record.id),
            ('Shell', user_record.id),
            ('Whole Foods', user_record.id),
            ('Gym Membership', user_record.id),
            ('Electric Company', user_record.id)
        ON CONFLICT (name, user_id) DO NOTHING;
        
        -- Create default payment methods for each user
        INSERT INTO public.payment_methods (name, user_id) VALUES
            ('Cash', user_record.id),
            ('Credit Card', user_record.id),
            ('Debit Card', user_record.id),
            ('Bank Transfer', user_record.id),
            ('Mobile Payment', user_record.id)
        ON CONFLICT (name, user_id) DO NOTHING;
    END LOOP;
END $$;

-- STEP 5: Generate some sample transactions for testing (only if no transactions exist)
DO $$
DECLARE
    user_record RECORD;
    vendor_id_val UUID;
    payment_method_id_val UUID;
    transaction_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO transaction_count FROM public.transactions;
    
    -- Only create sample data if no transactions exist
    IF transaction_count = 0 THEN
        -- Add some exchange rate data if missing
        INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) VALUES
            ('USD', 'THB', 35.50, CURRENT_DATE),
            ('THB', 'USD', 0.0282, CURRENT_DATE)
        ON CONFLICT (from_currency, to_currency, date) DO NOTHING;
        
        -- Create 5 sample transactions per user
        FOR user_record IN SELECT id FROM public.users LOOP
            FOR i IN 1..5 LOOP
                -- Get random vendor for this user
                SELECT id INTO vendor_id_val 
                FROM public.vendors 
                WHERE user_id = user_record.id 
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Get random payment method for this user
                SELECT id INTO payment_method_id_val 
                FROM public.payment_methods 
                WHERE user_id = user_record.id 
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Insert sample transaction
                INSERT INTO public.transactions (
                    user_id, vendor_id, payment_method_id, title, description,
                    amount_usd, amount_thb, exchange_rate, original_currency,
                    transaction_type, transaction_date
                ) VALUES (
                    user_record.id,
                    vendor_id_val,
                    payment_method_id_val,
                    'Sample Transaction ' || i,
                    'Sample transaction for testing',
                    (10 + random() * 90)::DECIMAL(12, 2),
                    (350 + random() * 3150)::DECIMAL(12, 2),
                    35.50,
                    CASE WHEN random() < 0.7 THEN 'USD' ELSE 'THB' END,
                    'expense',
                    CURRENT_DATE - (random() * 30)::INTEGER
                );
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Created sample transactions for testing';
    ELSE
        RAISE NOTICE 'Skipping sample data creation - transactions already exist';
    END IF;
END $$;

-- STEP 6: Report final status
DO $$
DECLARE
    total_transactions INTEGER;
    total_vendors INTEGER;
    total_payment_methods INTEGER;
    total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_transactions FROM public.transactions;
    SELECT COUNT(*) INTO total_vendors FROM public.vendors;
    SELECT COUNT(*) INTO total_payment_methods FROM public.payment_methods;
    SELECT COUNT(*) INTO total_users FROM public.users;
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '  Users: %', total_users;
    RAISE NOTICE '  Vendors: %', total_vendors;
    RAISE NOTICE '  Payment Methods: %', total_payment_methods;
    RAISE NOTICE '  Transactions: %', total_transactions;
END $$;
