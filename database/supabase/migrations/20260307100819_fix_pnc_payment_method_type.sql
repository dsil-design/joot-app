-- Migration: fix_pnc_payment_method_type
-- Created: 2026-03-07 10:08:19

BEGIN;

-- Fix PNC Personal Account payment method type from default 'credit_card' to 'bank_account'
UPDATE public.payment_methods
SET type = 'bank_account'
WHERE name ILIKE '%PNC%'
  AND type = 'credit_card';

COMMIT;
