-- Simple data population that only uses basic transaction columns
-- This works with the basic transaction table structure

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
            ('Starbucks', user_record.id),
            ('McDonald''s', user_record.id),
            ('Pizza Hut', user_record.id),
            ('Whole Foods', user_record.id),
            ('Amazon', user_record.id),
            ('Target', user_record.id),
            ('Uber', user_record.id),
            ('Netflix', user_record.id),
            ('Gym Membership', user_record.id),
            ('Electric Company', user_record.id),
            ('Shell', user_record.id),
            ('Chevron', user_record.id);
    END LOOP;
END $$;

-- Then, populate basic transactions
DO $$
DECLARE
    user_record RECORD;
    transaction_count INTEGER;
    random_amount DECIMAL(12, 2);
    random_currency currency_type;
    usd_amount DECIMAL(12, 2);
    thb_amount DECIMAL(12, 2);
    exchange_rate DECIMAL(10, 4);
    random_date DATE;
    transaction_type_val transaction_type;
    transaction_titles TEXT[] := ARRAY[
        'Groceries', 'Lunch', 'Coffee', 'Gas', 'Dinner', 'Shopping', 
        'Uber ride', 'Phone bill', 'Internet bill', 'Electricity bill',
        'Streaming service', 'Gym membership', 'Freelance payment', 
        'Salary', 'Refund', 'Car wash'
    ];
    descriptions TEXT[] := ARRAY[
        'Monthly payment', 'One-time purchase', 'Weekly expense',
        'Emergency expense', 'Regular payment', 'Necessary expense',
        'Business expense', 'Personal expense'
    ];
BEGIN
    -- Clear existing transaction data to avoid duplicates
    DELETE FROM public.transactions;
    
    -- Set default exchange rate
    exchange_rate := 35.50;
    
    -- Insert basic exchange rates if they don't exist
    INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) VALUES
        ('USD', 'THB', 35.50, CURRENT_DATE),
        ('THB', 'USD', 0.0282, CURRENT_DATE)
    ON CONFLICT (from_currency, to_currency, date) DO NOTHING;

    -- Loop through all existing users
    FOR user_record IN SELECT id FROM public.users LOOP
        
        -- Generate 15-20 transactions per user
        transaction_count := 15 + floor(random() * 6)::INTEGER;
        
        FOR i IN 1..transaction_count LOOP
            
            -- Generate random date within last 60 days
            random_date := CURRENT_DATE - (random() * 60)::INTEGER;
            
            -- 90% expenses, 10% income
            IF random() < 0.1 THEN
                transaction_type_val := 'income';
                random_amount := 500 + (random() * 4500)::DECIMAL(12, 2);
            ELSE
                transaction_type_val := 'expense';
                random_amount := 10 + (random() * 290)::DECIMAL(12, 2);
            END IF;
            
            -- 70% USD, 30% THB
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
            
            -- Insert basic transaction with only core columns
            INSERT INTO public.transactions (
                user_id,
                title,
                description,
                amount_usd,
                amount_thb,
                exchange_rate,
                original_currency,
                transaction_type,
                transaction_date
            ) VALUES (
                user_record.id,
                transaction_titles[1 + floor(random() * array_length(transaction_titles, 1))::INTEGER],
                descriptions[1 + floor(random() * array_length(descriptions, 1))::INTEGER],
                usd_amount,
                thb_amount,
                exchange_rate,
                random_currency,
                transaction_type_val,
                random_date
            );
            
        END LOOP;
        
    END LOOP;
    
END $$;