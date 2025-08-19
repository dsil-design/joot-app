-- Populate existing tables with dummy data
-- This assumes vendors and transactions tables already exist

-- First, populate vendors for existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Clear existing vendor data to avoid duplicates
    DELETE FROM public.vendors;
    
    -- Loop through all existing users and create vendor data for each
    FOR user_record IN SELECT id FROM public.users LOOP
        -- Insert dummy vendors for each user
        INSERT INTO public.vendors (name, user_id) VALUES
            -- Restaurants
            ('Starbucks', user_record.id),
            ('McDonald''s', user_record.id),
            ('Pizza Hut', user_record.id),
            ('Subway', user_record.id),
            
            -- Grocery
            ('Whole Foods', user_record.id),
            ('Trader Joe''s', user_record.id),
            ('Costco', user_record.id),
            
            -- Retail
            ('Amazon', user_record.id),
            ('Target', user_record.id),
            ('Best Buy', user_record.id),
            ('Nike', user_record.id),
            
            -- Services
            ('Uber', user_record.id),
            ('Lyft', user_record.id),
            ('Netflix', user_record.id),
            ('Spotify', user_record.id),
            ('Gym Membership', user_record.id),
            
            -- Utilities
            ('Electric Company', user_record.id),
            ('Internet Provider', user_record.id),
            ('Phone Company', user_record.id),
            
            -- Gas stations
            ('Shell', user_record.id),
            ('Chevron', user_record.id);
    END LOOP;
END $$;

-- Then, populate transactions using the vendors we just created
DO $$
DECLARE
    user_record RECORD;
    vendor_id_val UUID;
    transaction_count INTEGER;
    random_amount DECIMAL(12, 2);
    random_currency currency_type;
    usd_amount DECIMAL(12, 2);
    thb_amount DECIMAL(12, 2);
    exchange_rate DECIMAL(10, 4);
    random_date DATE;
    transaction_type_val transaction_type;
    vendor_name TEXT;
    transaction_titles TEXT[] := ARRAY[
        'Groceries', 'Lunch', 'Coffee', 'Gas', 'Dinner', 'Shopping', 'Movie tickets', 
        'Uber ride', 'Pharmacy', 'Gym membership', 'Phone bill', 'Internet bill',
        'Electricity bill', 'Weekly groceries', 'Takeout', 'Office supplies',
        'Books', 'Clothing', 'Electronics', 'Home maintenance', 'Streaming service',
        'Insurance payment', 'Parking fee', 'Car wash', 'Birthday gift',
        'Freelance payment', 'Salary', 'Bonus', 'Refund', 'Investment dividend'
    ];
    payment_methods TEXT[] := ARRAY[
        'Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Mobile Payment', 'Check'
    ];
    descriptions TEXT[] := ARRAY[
        'Monthly recurring payment', 'One-time purchase', 'Weekly expense',
        'Emergency expense', 'Planned purchase', 'Impulse buy', 'Necessary expense',
        'Business expense', 'Personal treat', 'Gift for family', 'Investment',
        'Maintenance cost', 'Educational expense', 'Health-related expense'
    ];
BEGIN
    -- Clear existing transaction data to avoid duplicates
    DELETE FROM public.transactions;
    
    -- Get current exchange rate for calculations
    SELECT rate INTO exchange_rate 
    FROM public.exchange_rates 
    WHERE from_currency = 'USD' AND to_currency = 'THB' 
    ORDER BY date DESC LIMIT 1;
    
    -- If no exchange rate found, use default
    IF exchange_rate IS NULL THEN
        exchange_rate := 35.50;
        -- Insert default exchange rates
        INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) VALUES
            ('USD', 'THB', 35.50, CURRENT_DATE),
            ('THB', 'USD', 0.0282, CURRENT_DATE)
        ON CONFLICT (from_currency, to_currency, date) DO NOTHING;
    END IF;

    -- Loop through all existing users
    FOR user_record IN SELECT id FROM public.users LOOP
        
        -- Generate 20-25 transactions per user for realistic data volume
        transaction_count := 20 + floor(random() * 6)::INTEGER;
        
        FOR i IN 1..transaction_count LOOP
            
            -- Pick random vendor for this user and get its name
            SELECT v.id INTO vendor_id_val
            FROM public.vendors v
            WHERE user_id = user_record.id 
            ORDER BY RANDOM() 
            LIMIT 1;
            
            -- Get the vendor name for amount logic
            SELECT name INTO vendor_name
            FROM public.vendors
            WHERE id = vendor_id_val;
            
            -- Generate random date within last 90 days
            random_date := CURRENT_DATE - (random() * 90)::INTEGER;
            
            -- Determine transaction type and amount based on vendor name patterns
            IF vendor_name ILIKE '%salary%' OR vendor_name ILIKE '%bonus%' OR vendor_name ILIKE '%freelance%' OR random() < 0.1 THEN
                -- 10% chance of income transactions
                transaction_type_val := 'income';
                random_amount := 500 + (random() * 4500)::DECIMAL(12, 2);
            ELSE
                -- Most transactions are expenses
                transaction_type_val := 'expense';
                
                -- Amount based on vendor name patterns
                IF vendor_name ILIKE '%starbucks%' OR vendor_name ILIKE '%mcdonald%' OR vendor_name ILIKE '%pizza%' OR vendor_name ILIKE '%subway%' THEN
                    -- Restaurant vendors
                    random_amount := 5 + (random() * 95)::DECIMAL(12, 2);
                ELSIF vendor_name ILIKE '%whole foods%' OR vendor_name ILIKE '%trader%' OR vendor_name ILIKE '%costco%' THEN
                    -- Grocery vendors
                    random_amount := 20 + (random() * 180)::DECIMAL(12, 2);
                ELSIF vendor_name ILIKE '%amazon%' OR vendor_name ILIKE '%target%' OR vendor_name ILIKE '%best buy%' OR vendor_name ILIKE '%nike%' THEN
                    -- Retail vendors
                    random_amount := 15 + (random() * 485)::DECIMAL(12, 2);
                ELSIF vendor_name ILIKE '%uber%' OR vendor_name ILIKE '%lyft%' OR vendor_name ILIKE '%netflix%' OR vendor_name ILIKE '%spotify%' OR vendor_name ILIKE '%gym%' THEN
                    -- Service vendors
                    random_amount := 25 + (random() * 275)::DECIMAL(12, 2);
                ELSIF vendor_name ILIKE '%electric%' OR vendor_name ILIKE '%internet%' OR vendor_name ILIKE '%phone%' THEN
                    -- Utility vendors
                    random_amount := 50 + (random() * 300)::DECIMAL(12, 2);
                ELSIF vendor_name ILIKE '%shell%' OR vendor_name ILIKE '%chevron%' THEN
                    -- Fuel vendors
                    random_amount := 30 + (random() * 120)::DECIMAL(12, 2);
                ELSE
                    -- Default range for other vendors
                    random_amount := 10 + (random() * 290)::DECIMAL(12, 2);
                END IF;
            END IF;
            
            -- Randomly choose original currency (70% USD, 30% THB)
            IF random() < 0.7 THEN
                random_currency := 'USD';
                usd_amount := random_amount;
                thb_amount := random_amount * exchange_rate;
            ELSE
                random_currency := 'THB';
                thb_amount := random_amount;
                usd_amount := random_amount / exchange_rate;
            END IF;
            
            -- Round amounts to 2 decimal places
            usd_amount := ROUND(usd_amount, 2);
            thb_amount := ROUND(thb_amount, 2);
            
            -- Insert the transaction (using vendor name instead of vendor_id since table still uses text)
            INSERT INTO public.transactions (
                user_id,
                vendor,
                description,
                amount_usd,
                amount_thb,
                exchange_rate,
                original_currency,
                transaction_type,
                transaction_date,
                payment_method
            ) VALUES (
                user_record.id,
                vendor_name,
                transaction_titles[1 + floor(random() * array_length(transaction_titles, 1))::INTEGER] || ' - ' || descriptions[1 + floor(random() * array_length(descriptions, 1))::INTEGER],
                usd_amount,
                thb_amount,
                exchange_rate,
                random_currency,
                transaction_type_val,
                random_date,
                payment_methods[1 + floor(random() * array_length(payment_methods, 1))::INTEGER]
            );
            
        END LOOP;
        
    END LOOP;
    
    -- Add some additional exchange rate history for more realistic data
    FOR i IN 1..30 LOOP
        DECLARE
            historical_date DATE;
            usd_to_thb_rate DECIMAL(10, 4);
            thb_to_usd_rate DECIMAL(10, 4);
        BEGIN
            historical_date := CURRENT_DATE - i;
            
            -- Generate realistic exchange rate fluctuation (35.00 - 36.00 range)
            usd_to_thb_rate := 35.00 + (random() * 1.00);
            thb_to_usd_rate := 1.0 / usd_to_thb_rate;
            
            -- Round to 4 decimal places
            usd_to_thb_rate := ROUND(usd_to_thb_rate, 4);
            thb_to_usd_rate := ROUND(thb_to_usd_rate, 4);
            
            INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) 
            VALUES 
                ('USD', 'THB', usd_to_thb_rate, historical_date),
                ('THB', 'USD', thb_to_usd_rate, historical_date)
            ON CONFLICT (from_currency, to_currency, date) DO NOTHING;
        END;
    END LOOP;
    
END $$;