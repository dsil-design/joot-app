-- Final migration that matches your exact table structure
-- Run this in Supabase SQL Editor

-- Add more vendors for all users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM public.users LOOP
        INSERT INTO public.vendors (name, user_id) VALUES
            ('McDonald''s', user_record.id),
            ('Pizza Hut', user_record.id),
            ('Subway', user_record.id),
            ('Whole Foods', user_record.id),
            ('Trader Joe''s', user_record.id),
            ('Costco', user_record.id),
            ('Amazon', user_record.id),
            ('Target', user_record.id),
            ('Best Buy', user_record.id),
            ('Nike', user_record.id),
            ('Uber', user_record.id),
            ('Lyft', user_record.id),
            ('Netflix', user_record.id),
            ('Spotify', user_record.id),
            ('Gym Membership', user_record.id),
            ('Electric Company', user_record.id),
            ('Internet Provider', user_record.id),
            ('Phone Company', user_record.id),
            ('Shell', user_record.id),
            ('Chevron', user_record.id)
        ON CONFLICT (name, user_id) DO NOTHING;
    END LOOP;
END $$;

-- Add realistic transactions
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
    descriptions TEXT[] := ARRAY[
        'Groceries at store', 'Quick lunch', 'Morning coffee', 'Gas fill-up', 
        'Dinner out', 'Online shopping', 'Ride to work', 'Monthly phone bill', 
        'Internet payment', 'Electricity bill', 'Streaming subscription', 
        'Gym monthly fee', 'Freelance work', 'Salary deposit', 'Purchase refund', 
        'Car wash', 'Book purchase', 'New clothes', 'Electronics', 'Home supplies'
    ];
    payment_methods TEXT[] := ARRAY[
        'Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Mobile Payment'
    ];
BEGIN
    exchange_rate := 35.50;
    
    -- Add some exchange rates if none exist
    INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) VALUES
        ('USD', 'THB', 35.50, CURRENT_DATE),
        ('THB', 'USD', 0.0282, CURRENT_DATE)
    ON CONFLICT (from_currency, to_currency, date) DO NOTHING;

    FOR user_record IN SELECT id FROM public.users LOOP
        transaction_count := 15 + floor(random() * 10)::INTEGER;
        
        FOR i IN 1..transaction_count LOOP
            -- Get random vendor for this user
            SELECT v.id INTO vendor_id_val 
            FROM public.vendors v 
            WHERE v.user_id = user_record.id 
            ORDER BY RANDOM() 
            LIMIT 1;
            
            random_date := CURRENT_DATE - (random() * 90)::INTEGER;
            
            -- 85% expenses, 15% income
            IF random() < 0.15 THEN
                transaction_type_val := 'income';
                random_amount := 800 + (random() * 3200)::DECIMAL(12, 2);
            ELSE
                transaction_type_val := 'expense';
                random_amount := 5 + (random() * 195)::DECIMAL(12, 2);
            END IF;
            
            -- 65% USD, 35% THB
            IF random() < 0.65 THEN
                random_currency := 'USD';
                usd_amount := random_amount;
                thb_amount := random_amount * exchange_rate;
            ELSE
                random_currency := 'THB';
                thb_amount := random_amount;
                usd_amount := random_amount / exchange_rate;
            END IF;
            
            usd_amount := ROUND(usd_amount, 2);
            thb_amount := ROUND(thb_amount, 2);
            
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
                vendor_id_val,
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