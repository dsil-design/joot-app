-- Migration: Populate database with realistic dummy transaction data
-- This provides better examples for users to see how the app works
-- This migration only runs if users exist in the database

DO $$
DECLARE
    user_count INTEGER;
    user_id_val UUID;
    current_date DATE := CURRENT_DATE;
    transaction_date DATE;
    amount_usd DECIMAL(12, 2);
    amount_thb DECIMAL(12, 2);
    exchange_rate DECIMAL(10, 4) := 35.50;
BEGIN
    -- Check if any users exist
    SELECT COUNT(*) INTO user_count FROM public.users;
    
    IF user_count > 0 THEN
        RAISE NOTICE 'Found % users, populating realistic data', user_count;
        
        -- Get the first user
        SELECT id INTO user_id_val FROM public.users LIMIT 1;
        
        -- Insert realistic vendors for better user experience
        INSERT INTO public.vendors (name, user_id) VALUES
          ('Starbucks', user_id_val),
          ('McDonald''s', user_id_val),
          ('Amazon', user_id_val),
          ('Netflix', user_id_val),
          ('Uber', user_id_val),
          ('Employer', user_id_val)
        ON CONFLICT (name, user_id) DO NOTHING;

        -- Insert realistic payment methods
        INSERT INTO public.payment_methods (name, user_id) VALUES
          ('Chase Credit Card', user_id_val),
          ('Bank of America Debit', user_id_val),
          ('Cash', user_id_val),
          ('Venmo', user_id_val)
        ON CONFLICT (name, user_id) DO NOTHING;
        
        RAISE NOTICE 'Realistic data setup completed for user %', user_id_val;
    ELSE
        RAISE NOTICE 'No users found, skipping realistic data population';
    END IF;
END $$;
