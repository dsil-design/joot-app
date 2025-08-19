-- Create default vendors and payment methods for all existing users
-- This assumes users exist in both auth.users and public.users tables

DO $$
DECLARE
    user_record RECORD;
    vendor_count INTEGER;
    payment_count INTEGER;
BEGIN
    -- Get count of existing users (this works even with RLS)
    SELECT COUNT(*) INTO vendor_count FROM public.vendors LIMIT 1;
    SELECT COUNT(*) INTO payment_count FROM public.payment_methods LIMIT 1;
    
    RAISE NOTICE 'Found % vendors and % payment methods', vendor_count, payment_count;
    
    -- Create default vendors and payment methods for each user in public.users table
    FOR user_record IN SELECT id, email FROM public.users LOOP
        RAISE NOTICE 'Setting up data for user: %', user_record.email;
        
        -- Create default vendors
        INSERT INTO public.vendors (name, user_id) VALUES
            ('McDonald''s', user_record.id),
            ('Starbucks', user_record.id),
            ('Amazon', user_record.id),
            ('Target', user_record.id),
            ('Uber', user_record.id),
            ('Netflix', user_record.id),
            ('Shell', user_record.id),
            ('Whole Foods', user_record.id),
            ('Subway', user_record.id),
            ('Gym Membership', user_record.id),
            ('Electric Company', user_record.id),
            ('Internet Provider', user_record.id)
        ON CONFLICT (name, user_id) DO NOTHING;
        
        -- Create default payment methods
        INSERT INTO public.payment_methods (name, user_id) VALUES
            ('Cash', user_record.id),
            ('Credit Card', user_record.id),
            ('Debit Card', user_record.id),
            ('Bank Transfer', user_record.id),
            ('Mobile Payment', user_record.id),
            ('PayPal', user_record.id)
        ON CONFLICT (name, user_id) DO NOTHING;
        
        RAISE NOTICE 'Created default data for user %', user_record.email;
    END LOOP;
    
    -- Add exchange rates if they don't exist
    INSERT INTO public.exchange_rates (from_currency, to_currency, rate, date) VALUES
        ('USD', 'THB', 35.50, CURRENT_DATE),
        ('THB', 'USD', 0.0282, CURRENT_DATE)
    ON CONFLICT (from_currency, to_currency, date) DO NOTHING;
    
    -- Report final counts
    SELECT COUNT(*) INTO vendor_count FROM public.vendors;
    SELECT COUNT(*) INTO payment_count FROM public.payment_methods;
    
    RAISE NOTICE 'Setup complete! Total vendors: %, Total payment methods: %', vendor_count, payment_count;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE NOTICE 'This might mean no users exist yet. Try logging in with the demo account first.';
END $$;
