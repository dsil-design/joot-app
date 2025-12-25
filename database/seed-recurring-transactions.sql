-- Seed file for Recurring Transactions and Month Template System
-- Created: 2025-11-05
-- Description: Sample data for testing recurring transaction templates,
--              month plans, and expected transactions

-- ============================================================================
-- PREREQUISITES
-- ============================================================================
-- This seed file assumes:
-- 1. The migration 20251105000000_add_recurring_transactions.sql has been run
-- 2. A user exists in auth.users (using: a1c3caff-a5de-4898-be7d-ab4b76247ae6)
-- 3. Some vendors exist in public.vendors
-- 4. Some payment_methods exist in public.payment_methods

-- ============================================================================
-- VARIABLE SETUP
-- ============================================================================
-- For easy modification, define key IDs here
DO $$
DECLARE
  v_user_id UUID := 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';
  v_current_month DATE := DATE_TRUNC('month', CURRENT_DATE);

  -- Template IDs (will be generated)
  v_rent_template_id UUID;
  v_gym_template_id UUID;
  v_netflix_template_id UUID;
  v_utility_template_id UUID;
  v_phone_template_id UUID;

  -- Month plan ID
  v_month_plan_id UUID;

  -- Vendor IDs (from existing data)
  v_vendor_24seven UUID := 'd0dca341-7549-4e42-8ffd-f75ee314cda4'; -- 24Seven Fitness

  -- Payment method IDs (from existing data)
  v_payment_pnc UUID := '2caabb4d-f9bc-4418-b5cc-4e0adf3fb0c6'; -- PNC: Personal
  v_payment_cash UUID := '1a1ec0c3-31a2-4c20-85b1-f8c860a828ff'; -- Cash
  v_payment_wise UUID := '013e515b-59c3-46db-98c7-19d7aa44a9c4'; -- Wise
  v_payment_amex UUID := 'ca2273b3-3231-4b7d-9aeb-4030fd1bf20f'; -- American Express

BEGIN
  -- ============================================================================
  -- 1. CREATE TRANSACTION TEMPLATES
  -- ============================================================================

  -- Template 1: Monthly Rent
  INSERT INTO public.transaction_templates (
    user_id, name, description, is_active,
    amount, original_currency, transaction_type,
    frequency, frequency_interval, day_of_month,
    start_date, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    'Monthly Rent',
    'Apartment rent payment',
    true,
    15000.00,
    'THB',
    'expense',
    'monthly',
    1,
    1, -- First of month
    '2025-01-01',
    NULL, -- Create generic landlord vendor if needed
    v_payment_pnc
  ) RETURNING id INTO v_rent_template_id;

  -- Template 2: Gym Membership
  INSERT INTO public.transaction_templates (
    user_id, name, description, is_active,
    amount, original_currency, transaction_type,
    frequency, frequency_interval, day_of_month,
    start_date, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    'Gym Membership - 24Seven',
    'Monthly gym membership at 24Seven Fitness',
    true,
    1200.00,
    'THB',
    'expense',
    'monthly',
    1,
    15, -- 15th of month
    '2025-01-01',
    v_vendor_24seven,
    v_payment_wise
  ) RETURNING id INTO v_gym_template_id;

  -- Template 3: Netflix Subscription
  INSERT INTO public.transaction_templates (
    user_id, name, description, is_active,
    amount, original_currency, transaction_type,
    frequency, frequency_interval, day_of_month,
    start_date, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    'Netflix Subscription',
    'Monthly Netflix Premium subscription',
    true,
    419.00,
    'THB',
    'expense',
    'monthly',
    1,
    22, -- 22nd of month
    '2025-01-01',
    NULL,
    v_payment_amex
  ) RETURNING id INTO v_netflix_template_id;

  -- Template 4: Electricity Bill
  INSERT INTO public.transaction_templates (
    user_id, name, description, is_active,
    amount, original_currency, transaction_type,
    frequency, frequency_interval, day_of_month,
    start_date, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    'Electricity Bill',
    'Monthly electricity usage (varies)',
    true,
    800.00,
    'THB',
    'expense',
    'monthly',
    1,
    10, -- 10th of month
    '2025-01-01',
    NULL,
    v_payment_cash
  ) RETURNING id INTO v_utility_template_id;

  -- Template 5: Phone Bill
  INSERT INTO public.transaction_templates (
    user_id, name, description, is_active,
    amount, original_currency, transaction_type,
    frequency, frequency_interval, day_of_month,
    start_date, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    'Phone Bill - AIS',
    'Monthly phone plan with AIS',
    true,
    599.00,
    'THB',
    'expense',
    'monthly',
    1,
    5, -- 5th of month
    '2025-01-01',
    NULL,
    v_payment_pnc
  ) RETURNING id INTO v_phone_template_id;

  -- ============================================================================
  -- 2. CREATE MONTH PLAN FOR CURRENT MONTH
  -- ============================================================================

  INSERT INTO public.month_plans (
    user_id,
    month_year,
    status,
    notes
  ) VALUES (
    v_user_id,
    v_current_month,
    'active',
    'Monthly budget plan for ' || TO_CHAR(v_current_month, 'YYYY-MM')
  ) RETURNING id INTO v_month_plan_id;

  -- ============================================================================
  -- 3. CREATE EXPECTED TRANSACTIONS FOR CURRENT MONTH
  -- ============================================================================

  -- Expected Transaction 1: Rent (1st of month)
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    v_rent_template_id,
    v_month_plan_id,
    'Monthly Rent',
    15000.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '0 days', -- 1st of month
    CASE WHEN CURRENT_DATE > v_current_month THEN 'overdue' ELSE 'pending' END,
    NULL,
    v_payment_pnc
  );

  -- Expected Transaction 2: Phone Bill (5th of month)
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    v_phone_template_id,
    v_month_plan_id,
    'Phone Bill - AIS',
    599.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '4 days', -- 5th of month
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '4 days') THEN 'overdue' ELSE 'pending' END,
    NULL,
    v_payment_pnc
  );

  -- Expected Transaction 3: Electricity (10th of month)
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    v_utility_template_id,
    v_month_plan_id,
    'Electricity Bill',
    800.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '9 days', -- 10th of month
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '9 days') THEN 'overdue' ELSE 'pending' END,
    NULL,
    v_payment_cash
  );

  -- Expected Transaction 4: Gym (15th of month)
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    v_gym_template_id,
    v_month_plan_id,
    'Gym Membership - 24Seven',
    1200.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '14 days', -- 15th of month
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '14 days') THEN 'overdue' ELSE 'pending' END,
    v_vendor_24seven,
    v_payment_wise
  );

  -- Expected Transaction 5: Netflix (22nd of month)
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, vendor_id, payment_method_id
  ) VALUES (
    v_user_id,
    v_netflix_template_id,
    v_month_plan_id,
    'Netflix Subscription',
    419.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '21 days', -- 22nd of month
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '21 days') THEN 'overdue' ELSE 'pending' END,
    NULL,
    v_payment_amex
  );

  -- Additional Manual Expected Transactions (no template)

  -- Expected Transaction 6: Groceries (weekly budget)
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL, -- Manual entry, no template
    v_month_plan_id,
    'Weekly Groceries - Week 1',
    2500.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '2 days', -- 3rd
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '2 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_cash,
    'Budget for weekly grocery shopping'
  );

  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Weekly Groceries - Week 2',
    2500.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '9 days', -- 10th
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '9 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_cash,
    'Budget for weekly grocery shopping'
  );

  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Weekly Groceries - Week 3',
    2500.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '16 days', -- 17th
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '16 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_cash,
    'Budget for weekly grocery shopping'
  );

  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Weekly Groceries - Week 4',
    2500.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '23 days', -- 24th
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '23 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_cash,
    'Budget for weekly grocery shopping'
  );

  -- Expected Transaction 10: Dining Out Budget
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Dining Out Budget',
    3000.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '7 days', -- 8th
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '7 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_wise,
    'Monthly dining out budget'
  );

  -- Expected Transaction 11: Transportation Budget
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Transportation Budget',
    1500.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '4 days', -- 5th
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '4 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_cash,
    'Monthly transportation (Grab, BTS, etc.)'
  );

  -- Expected Transaction 12: Freelance Income
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Freelance Income - Project X',
    25000.00,
    'THB',
    'income',
    v_current_month + INTERVAL '14 days', -- 15th
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '14 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_pnc,
    'Expected payment for ongoing project'
  );

  -- Expected Transaction 13: Coffee Shop Budget
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Coffee Shop Budget',
    1200.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '2 days', -- 3rd
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '2 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_wise,
    'Monthly coffee shop budget (coworking)'
  );

  -- Expected Transaction 14: Healthcare/Pharmacy
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Healthcare Budget',
    500.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '11 days', -- 12th
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '11 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_cash,
    'Monthly healthcare/pharmacy budget'
  );

  -- Expected Transaction 15: Entertainment Budget
  INSERT INTO public.expected_transactions (
    user_id, template_id, month_plan_id,
    description, expected_amount, original_currency, transaction_type,
    expected_date, status, payment_method_id, notes
  ) VALUES (
    v_user_id,
    NULL,
    v_month_plan_id,
    'Entertainment Budget',
    2000.00,
    'THB',
    'expense',
    v_current_month + INTERVAL '18 days', -- 19th
    CASE WHEN CURRENT_DATE > (v_current_month + INTERVAL '18 days') THEN 'overdue' ELSE 'pending' END,
    v_payment_wise,
    'Monthly entertainment (movies, events, etc.)'
  );

  RAISE NOTICE 'Seed data created successfully!';
  RAISE NOTICE '  - 5 transaction templates';
  RAISE NOTICE '  - 1 month plan for %', TO_CHAR(v_current_month, 'YYYY-MM');
  RAISE NOTICE '  - 15 expected transactions';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment these to verify the seed data was created correctly:

-- SELECT COUNT(*) as template_count FROM public.transaction_templates;
-- SELECT COUNT(*) as month_plan_count FROM public.month_plans;
-- SELECT COUNT(*) as expected_transaction_count FROM public.expected_transactions;

-- View all templates:
-- SELECT name, amount, original_currency, frequency, day_of_month
-- FROM public.transaction_templates
-- ORDER BY day_of_month;

-- View month plan with summary:
-- SELECT
--   mp.*,
--   COUNT(et.id) as expected_count,
--   SUM(CASE WHEN et.transaction_type = 'expense' THEN et.expected_amount ELSE 0 END) as total_expected_expenses,
--   SUM(CASE WHEN et.transaction_type = 'income' THEN et.expected_amount ELSE 0 END) as total_expected_income
-- FROM public.month_plans mp
-- LEFT JOIN public.expected_transactions et ON et.month_plan_id = mp.id
-- GROUP BY mp.id;

-- View expected transactions for current month:
-- SELECT
--   expected_date,
--   description,
--   expected_amount,
--   original_currency,
--   transaction_type,
--   status,
--   CASE WHEN template_id IS NOT NULL THEN 'From Template' ELSE 'Manual' END as source
-- FROM public.expected_transactions
-- WHERE month_plan_id IN (SELECT id FROM public.month_plans WHERE month_year = DATE_TRUNC('month', CURRENT_DATE))
-- ORDER BY expected_date;
