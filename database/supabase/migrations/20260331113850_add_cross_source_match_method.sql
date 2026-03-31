-- Migration: add_cross_source_match_method
-- Created: 2026-03-31 11:38:50

BEGIN;

-- Add 'cross_source' to the allowed match_method values for email_transactions
ALTER TABLE public.email_transactions
  DROP CONSTRAINT email_transactions_match_method_check;

ALTER TABLE public.email_transactions
  ADD CONSTRAINT email_transactions_match_method_check
  CHECK (match_method IS NULL OR match_method IN ('auto', 'manual', 'cross_source'));

COMMIT;
