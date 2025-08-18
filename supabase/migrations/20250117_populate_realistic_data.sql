-- Migration: Populate database with realistic dummy transaction data
-- This provides better examples for users to see how the app works

-- Step 1: Clear existing dummy data (optional - comment out if you want to keep existing data)
-- DELETE FROM public.transactions WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE '%@example.com');

-- Step 2: Insert realistic vendors for better user experience
INSERT INTO public.vendors (name, user_id) VALUES
  -- Food & Dining
  ('Starbucks', (SELECT id FROM public.users LIMIT 1)),
  ('McDonald''s', (SELECT id FROM public.users LIMIT 1)),
  ('Subway', (SELECT id FROM public.users LIMIT 1)),
  ('Pizza Hut', (SELECT id FROM public.users LIMIT 1)),
  ('KFC', (SELECT id FROM public.users LIMIT 1)),
  ('Domino''s', (SELECT id FROM public.users LIMIT 1)),
  ('Chipotle', (SELECT id FROM public.users LIMIT 1)),
  ('Taco Bell', (SELECT id FROM public.users LIMIT 1)),
  
  -- Transportation
  ('Uber', (SELECT id FROM public.users LIMIT 1)),
  ('Lyft', (SELECT id FROM public.users LIMIT 1)),
  ('Shell Gas Station', (SELECT id FROM public.users LIMIT 1)),
  ('ExxonMobil', (SELECT id FROM public.users LIMIT 1)),
  ('BP Gas Station', (SELECT id FROM public.users LIMIT 1)),
  ('Public Transit', (SELECT id FROM public.users LIMIT 1)),
  
  -- Shopping & Retail
  ('Amazon', (SELECT id FROM public.users LIMIT 1)),
  ('Target', (SELECT id FROM public.users LIMIT 1)),
  ('Walmart', (SELECT id FROM public.users LIMIT 1)),
  ('Best Buy', (SELECT id FROM public.users LIMIT 1)),
  ('Home Depot', (SELECT id FROM public.users LIMIT 1)),
  ('Costco', (SELECT id FROM public.users LIMIT 1)),
  ('Trader Joe''s', (SELECT id FROM public.users LIMIT 1)),
  ('Whole Foods', (SELECT id FROM public.users LIMIT 1)),
  
  -- Entertainment & Services
  ('Netflix', (SELECT id FROM public.users LIMIT 1)),
  ('Spotify', (SELECT id FROM public.users LIMIT 1)),
  ('Hulu', (SELECT id FROM public.users LIMIT 1)),
  ('Disney+', (SELECT id FROM public.users LIMIT 1)),
  ('Apple Music', (SELECT id FROM public.users LIMIT 1)),
  ('YouTube Premium', (SELECT id FROM public.users LIMIT 1)),
  ('Gym Membership', (SELECT id FROM public.users LIMIT 1)),
  ('Movie Theater', (SELECT id FROM public.users LIMIT 1)),
  
  -- Bills & Utilities
  ('Electric Company', (SELECT id FROM public.users LIMIT 1)),
  ('Water Company', (SELECT id FROM public.users LIMIT 1)),
  ('Internet Provider', (SELECT id FROM public.users LIMIT 1)),
  ('Phone Company', (SELECT id FROM public.users LIMIT 1)),
  ('Insurance Company', (SELECT id FROM public.users LIMIT 1)),
  ('Property Tax', (SELECT id FROM public.users LIMIT 1)),
  
  -- Healthcare
  ('CVS Pharmacy', (SELECT id FROM public.users LIMIT 1)),
  ('Walgreens', (SELECT id FROM public.users LIMIT 1)),
  ('Doctor''s Office', (SELECT id FROM public.users LIMIT 1)),
  ('Dentist', (SELECT id FROM public.users LIMIT 1)),
  ('Hospital', (SELECT id FROM public.users LIMIT 1)),
  
  -- Income Sources
  ('Employer', (SELECT id FROM public.users LIMIT 1)),
  ('Freelance Client', (SELECT id FROM public.users LIMIT 1)),
  ('Investment Dividends', (SELECT id FROM public.users LIMIT 1)),
  ('Side Business', (SELECT id FROM public.users LIMIT 1))
ON CONFLICT (name, user_id) DO NOTHING;

-- Step 3: Insert realistic payment methods
INSERT INTO public.payment_methods (name, user_id) VALUES
  ('Chase Credit Card', (SELECT id FROM public.users LIMIT 1)),
  ('Bank of America Debit', (SELECT id FROM public.users LIMIT 1)),
  ('Wells Fargo Checking', (SELECT id FROM public.users LIMIT 1)),
  ('American Express', (SELECT id FROM public.users LIMIT 1)),
  ('Cash', (SELECT id FROM public.users LIMIT 1)),
  ('Venmo', (SELECT id FROM public.users LIMIT 1)),
  ('PayPal', (SELECT id FROM public.users LIMIT 1)),
  ('Apple Pay', (SELECT id FROM public.users LIMIT 1)),
  ('Google Pay', (SELECT id FROM public.users LIMIT 1)),
  ('Zelle', (SELECT id FROM public.users LIMIT 1))
ON CONFLICT (name, user_id) DO NOTHING;

-- Step 4: Insert realistic transactions for the past 30 days
-- Get user ID and vendor/payment method IDs for reference
DO $$
DECLARE
    user_id_val UUID;
    starbucks_id UUID;
    mcdonalds_id UUID;
    uber_id UUID;
    amazon_id UUID;
    netflix_id UUID;
    chase_card_id UUID;
    boa_debit_id UUID;
    cash_id UUID;
    venmo_id UUID;
    employer_id UUID;
    freelance_id UUID;
    current_date DATE := CURRENT_DATE;
    transaction_date DATE;
    amount_usd DECIMAL(12, 2);
    amount_thb DECIMAL(12, 2);
    exchange_rate DECIMAL(10, 4) := 35.50; -- Approximate USD to THB rate
BEGIN
    -- Get user ID
    SELECT id INTO user_id_val FROM public.users LIMIT 1;
    
    -- Get vendor IDs
    SELECT id INTO starbucks_id FROM public.vendors WHERE name = 'Starbucks' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO mcdonalds_id FROM public.vendors WHERE name = 'McDonald''s' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO uber_id FROM public.vendors WHERE name = 'Uber' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO amazon_id FROM public.vendors WHERE name = 'Amazon' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO netflix_id FROM public.vendors WHERE name = 'Netflix' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO employer_id FROM public.vendors WHERE name = 'Employer' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO freelance_id FROM public.vendors WHERE name = 'Freelance Client' AND user_id = user_id_val LIMIT 1;
    
    -- Get payment method IDs
    SELECT id INTO chase_card_id FROM public.payment_methods WHERE name = 'Chase Credit Card' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO boa_debit_id FROM public.payment_methods WHERE name = 'Bank of America Debit' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO cash_id FROM public.payment_methods WHERE name = 'Cash' AND user_id = user_id_val LIMIT 1;
    SELECT id INTO venmo_id FROM public.payment_methods WHERE name = 'Venmo' AND user_id = user_id_val LIMIT 1;
    
    -- Insert realistic transactions for the past 30 days
    FOR i IN 0..29 LOOP
        transaction_date := current_date - i;
        
        -- Skip weekends for some transactions (like work-related)
        IF EXTRACT(DOW FROM transaction_date) NOT IN (0, 6) THEN
            -- Morning coffee (most weekdays)
            IF i % 3 = 0 THEN
                amount_usd := 5.75;
                amount_thb := amount_usd * exchange_rate;
                INSERT INTO public.transactions (
                    user_id, vendor_id, payment_method_id, description, 
                    amount_usd, amount_thb, exchange_rate, original_currency, 
                    transaction_type, transaction_date
                ) VALUES (
                    user_id_val, starbucks_id, chase_card_id, 'Morning coffee',
                    amount_usd, amount_thb, exchange_rate, 'USD', 'expense', transaction_date
                );
            END IF;
            
            -- Lunch (most weekdays)
            IF i % 2 = 0 THEN
                amount_usd := 12.50;
                amount_thb := amount_usd * exchange_rate;
                INSERT INTO public.transactions (
                    user_id, vendor_id, payment_method_id, description, 
                    amount_usd, amount_thb, exchange_rate, original_currency, 
                    transaction_type, transaction_date
                ) VALUES (
                    user_id_val, mcdonalds_id, boa_debit_id, 'Lunch break',
                    amount_usd, amount_thb, exchange_rate, 'USD', 'expense', transaction_date
                );
            END IF;
            
            -- Uber ride (occasionally)
            IF i % 5 = 0 THEN
                amount_usd := 18.75;
                amount_thb := amount_usd * exchange_rate;
                INSERT INTO public.transactions (
                    user_id, vendor_id, payment_method_id, description, 
                    amount_usd, amount_thb, exchange_rate, original_currency, 
                    transaction_type, transaction_date
                ) VALUES (
                    user_id_val, uber_id, venmo_id, 'Ride to meeting',
                    amount_usd, amount_thb, exchange_rate, 'USD', 'expense', transaction_date
                );
            END IF;
        END IF;
        
        -- Weekend activities
        IF EXTRACT(DOW FROM transaction_date) IN (0, 6) THEN
            -- Weekend coffee
            amount_usd := 6.25;
            amount_thb := amount_usd * exchange_rate;
            INSERT INTO public.transactions (
                user_id, vendor_id, payment_method_id, description, 
                amount_usd, amount_thb, exchange_rate, original_currency, 
                transaction_type, transaction_date
            ) VALUES (
                user_id_val, starbucks_id, cash_id, 'Weekend coffee',
                amount_usd, amount_thb, exchange_rate, 'USD', 'expense', transaction_date
            );
        END IF;
        
        -- Monthly subscriptions (on 1st of month)
        IF EXTRACT(DAY FROM transaction_date) = 1 THEN
            -- Netflix subscription
            amount_usd := 15.99;
            amount_thb := amount_usd * exchange_rate;
            INSERT INTO public.transactions (
                user_id, vendor_id, payment_method_id, description, 
                amount_usd, amount_thb, exchange_rate, original_currency, 
                transaction_type, transaction_date
            ) VALUES (
                user_id_val, netflix_id, chase_card_id, 'Monthly subscription',
                amount_usd, amount_thb, exchange_rate, 'USD', 'expense', transaction_date
            );
        END IF;
        
        -- Online shopping (occasionally)
        IF i % 7 = 0 THEN
            amount_usd := 45.00;
            amount_thb := amount_usd * exchange_rate;
            INSERT INTO public.transactions (
                user_id, vendor_id, payment_method_id, description, 
                amount_usd, amount_thb, exchange_rate, original_currency, 
                transaction_type, transaction_date
            ) VALUES (
                user_id_val, amazon_id, chase_card_id, 'Online purchase',
                amount_usd, amount_thb, exchange_rate, 'USD', 'expense', transaction_date
            );
        END IF;
        
        -- Income (bi-weekly paycheck)
        IF i % 14 = 0 THEN
            amount_usd := 2500.00;
            amount_thb := amount_usd * exchange_rate;
            INSERT INTO public.transactions (
                user_id, vendor_id, payment_method_id, description, 
                amount_usd, amount_thb, exchange_rate, original_currency, 
                transaction_type, transaction_date
            ) VALUES (
                user_id_val, employer_id, boa_debit_id, 'Bi-weekly salary',
                amount_usd, amount_thb, exchange_rate, 'USD', 'income', transaction_date
            );
        END IF;
        
        -- Freelance income (occasionally)
        IF i % 10 = 0 THEN
            amount_usd := 350.00;
            amount_thb := amount_usd * exchange_rate;
            INSERT INTO public.transactions (
                user_id, vendor_id, payment_method_id, description, 
                amount_usd, amount_thb, exchange_rate, original_currency, 
                transaction_type, transaction_date
            ) VALUES (
                user_id_val, freelance_id, venmo_id, 'Freelance project',
                amount_usd, amount_thb, exchange_rate, 'USD', 'income', transaction_date
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Realistic dummy data inserted successfully for user %', user_id_val;
END $$;
