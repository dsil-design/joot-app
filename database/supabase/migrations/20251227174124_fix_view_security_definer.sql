-- Migration: fix_view_security_definer
-- Created: 2025-12-27 17:41:24
--
-- Fixes Supabase Security Advisor warning:
-- "View public.available_currency_pairs is defined with the SECURITY DEFINER property"
--
-- SECURITY DEFINER views run with the creator's permissions, bypassing RLS.
-- SECURITY INVOKER (the safer default) runs with the caller's permissions.

BEGIN;

-- Recreate the view with explicit SECURITY INVOKER
CREATE OR REPLACE VIEW available_currency_pairs
WITH (security_invoker = true) AS
SELECT DISTINCT
  c1.currency_code as from_currency,
  c2.currency_code as to_currency,
  c1.display_name as from_display_name,
  c2.display_name as to_display_name
FROM currency_configuration c1
CROSS JOIN currency_configuration c2
WHERE c1.currency_code != c2.currency_code
  AND c1.is_tracked = TRUE
  AND c2.is_tracked = TRUE
ORDER BY c1.currency_code, c2.currency_code;

COMMIT;
