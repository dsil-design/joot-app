-- Reset Transaction Data Script
-- This script wipes and reseeds transaction-related data with realistic examples
-- Usage: Run this script against your database to get fresh, consistent data

-- Clear existing data (in dependency order)
DELETE FROM public.transactions;
DELETE FROM public.vendors;
DELETE FROM public.payment_methods;

-- Insert fresh vendors for all users
-- We'll create vendors that work across users for simplicity
INSERT INTO public.vendors (name, user_id) 
SELECT vendor_name, user_id
FROM (
    VALUES 
        ('Starbucks'),
        ('McDonald''s'),
        ('Amazon'),
        ('Target'),
        ('Whole Foods'),
        ('Uber'),
        ('Netflix'),
        ('Spotify'),
        ('Shell Gas Station'),
        ('CVS Pharmacy'),
        ('Apple Store'),
        ('Best Buy'),
        ('Home Depot'),
        ('Costco'),
        ('Trader Joe''s')
) AS vendors(vendor_name)
CROSS JOIN public.users;

-- Insert fresh payment methods for all users
INSERT INTO public.payment_methods (name, user_id)
SELECT payment_method_name, user_id
FROM (
    VALUES 
        ('Cash'),
        ('Credit Card'),
        ('Debit Card'),
        ('PayPal'),
        ('Apple Pay'),
        ('Bank Transfer'),
        ('Venmo'),
        ('Zelle')
) AS payment_methods(payment_method_name)
CROSS JOIN public.users;

-- Insert realistic example transactions for each user
INSERT INTO public.transactions (
    user_id,
    vendor_id,
    payment_method_id,
    description,
    amount_usd,
    amount_thb,
    exchange_rate,
    original_currency,
    transaction_type,
    transaction_date
)
SELECT 
    u.id as user_id,
    v.id as vendor_id,
    pm.id as payment_method_id,
    tx.description,
    tx.amount_usd,
    tx.amount_thb,
    tx.exchange_rate,
    tx.original_currency::currency_type,
    tx.transaction_type::transaction_type,
    (CURRENT_DATE - INTERVAL '1 day' * tx.days_ago)::date as transaction_date
FROM public.users u
CROSS JOIN (
    VALUES 
        -- Recent transactions (last 30 days)
        ('Coffee and pastry', 8.50, 274.25, 32.24, 'USD', 'expense', 1),
        ('Lunch combo meal', 12.99, 418.84, 32.24, 'USD', 'expense', 2),
        ('Online shopping', 45.67, 1472.20, 32.24, 'USD', 'expense', 3),
        ('Grocery shopping', 89.34, 2881.20, 32.24, 'USD', 'expense', 5),
        ('Organic groceries', 67.45, 2174.31, 32.24, 'USD', 'expense', 7),
        ('Ride to airport', 25.80, 831.79, 32.24, 'USD', 'expense', 8),
        ('Monthly subscription', 15.99, 515.72, 32.24, 'USD', 'expense', 10),
        ('Music streaming', 9.99, 322.18, 32.24, 'USD', 'expense', 12),
        ('Gas fill-up', 42.50, 1370.20, 32.24, 'USD', 'expense', 14),
        ('Pharmacy pickup', 18.75, 604.50, 32.24, 'USD', 'expense', 16),
        -- Thai Baht transactions
        ('Street food dinner', 4.65, 150.00, 32.24, 'THB', 'expense', 18),
        ('Local market shopping', 15.53, 500.95, 32.24, 'THB', 'expense', 20),
        ('Electronics purchase', 93.18, 3004.50, 32.24, 'USD', 'expense', 22),
        ('Home improvement supplies', 156.78, 5054.65, 32.24, 'USD', 'expense', 25),
        ('Bulk shopping', 234.56, 7563.02, 32.24, 'USD', 'expense', 28),
        -- Some income transactions
        ('Freelance payment', 500.00, 16120.00, 32.24, 'USD', 'income', 15),
        ('Refund from return', 67.89, 2188.47, 32.24, 'USD', 'income', 21),
        ('Cash back reward', 12.50, 403.00, 32.24, 'USD', 'income', 26)
) AS tx(description, amount_usd, amount_thb, exchange_rate, original_currency, transaction_type, days_ago)
-- Join with vendors and payment methods randomly but consistently
LEFT JOIN LATERAL (
    SELECT id FROM public.vendors 
    WHERE user_id = u.id 
    ORDER BY RANDOM() 
    LIMIT 1
) v ON true
LEFT JOIN LATERAL (
    SELECT id FROM public.payment_methods 
    WHERE user_id = u.id 
    ORDER BY RANDOM() 
    LIMIT 1
) pm ON true;

-- Verify the data was inserted correctly
SELECT 
    'Data Summary' as info,
    (SELECT COUNT(*) FROM public.vendors) as total_vendors,
    (SELECT COUNT(*) FROM public.payment_methods) as total_payment_methods,
    (SELECT COUNT(*) FROM public.transactions) as total_transactions;

-- Show a sample of recent transactions to verify
SELECT 
    t.description,
    t.amount_usd,
    t.original_currency,
    t.transaction_date,
    v.name as vendor,
    pm.name as payment_method,
    u.email as user_email
FROM public.transactions t
LEFT JOIN public.vendors v ON t.vendor_id = v.id
LEFT JOIN public.payment_methods pm ON t.payment_method_id = pm.id
LEFT JOIN public.users u ON t.user_id = u.id
ORDER BY t.transaction_date DESC
LIMIT 10;