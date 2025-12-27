-- Migration: enable_exchange_rates_rls
-- Created: 2025-12-27 17:41:31
--
-- Fixes: Supabase Security Advisor warning "Policy Exists RLS Disabled"
--
-- Policies already exist:
-- - "Authenticated users can view exchange rates" (SELECT for authenticated users)
-- - "Admins can manage exchange rates" (write operations)
--
-- This is safe because:
-- - Client-side only does SELECT (covered by existing policy)
-- - Server-side sync uses service role key (bypasses RLS)

BEGIN;

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

COMMIT;
