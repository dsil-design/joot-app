-- This will be executed via API calls since direct DB connection failed
-- Adding more vendors per user
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all existing users and add more vendors
    FOR user_record IN SELECT id FROM public.users LOOP
        INSERT INTO public.vendors (name, user_id) VALUES
            ('McDonald''s', user_record.id),
            ('Pizza Hut', user_record.id),
            ('Whole Foods', user_record.id),
            ('Amazon', user_record.id),
            ('Target', user_record.id),
            ('Uber', user_record.id),
            ('Netflix', user_record.id),
            ('Gym Membership', user_record.id),
            ('Electric Company', user_record.id),
            ('Shell', user_record.id)
        ON CONFLICT (name, user_id) DO NOTHING;
    END LOOP;
END $$;

-- Add realistic transactions
DO $$
DECLARE
    user_record RECORD;
    vendor_record RECORD;
    transaction_count INTEGER;
    random_amount DECIMAL(12, 2);
    random_currency currency_type;
    usd_amount DECIMAL(12, 2);
    thb_amount DECIMAL(12, 2);
    exchange_rate DECIMAL(10, 4);
    random_date DATE;
    transaction_type_val transaction_type;
    descriptions TEXT[] := ARRAY[
        'Groceries', 'Lunch', 'Coffee', 'Gas', 'Dinner', 'Shopping', 
        'Uber ride', 'Phone bill', 'Internet bill', 'Electricity bill',
        'Streaming service', 'Gym membership', 'Freelance payment', 
        'Salary', 'Refund', 'Car wash', 'Books', 'Clothing'
    ];
    payment_methods TEXT[] := ARRAY[
        'Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Mobile Payment'
    ];
BEGIN
    -- Set default exchange rate
    exchange_rate := 35.50;

    -- Loop through all existing users
    FOR user_record IN SELECT id FROM public.users LOOP
        
        -- Generate 10-15 transactions per user
        transaction_count := 10 + floor(random() * 6)::INTEGER;
        
        FOR i IN 1..transaction_count LOOP
            
            -- Pick random vendor for this user
            SELECT id INTO vendor_record 
            FROM public.vendors 
            WHERE user_id = user_record.id 
            ORDER BY RANDOM() 
            LIMIT 1;
            
            -- Generate random date within last 60 days
            random_date := CURRENT_DATE - (random() * 60)::INTEGER;
            
            -- 85% expenses, 15% income
            IF random() < 0.15 THEN
                transaction_type_val := 'income';
                random_amount := 500 + (random() * 3000)::DECIMAL(12, 2);
            ELSE
                transaction_type_val := 'expense';
                random_amount := 10 + (random() * 200)::DECIMAL(12, 2);
            END IF;
            
            -- 60% USD, 40% THB
            IF random() < 0.6 THEN
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
            
            -- Insert transaction
            INSERT INTO public.transactions (
                user_id,
                vendor_id,
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
                vendor_record,
                descriptions[1 + floor(random() * array_length(descriptions, 1))::INTEGER],
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
    
END $$;