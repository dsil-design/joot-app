-- Migration: add_billing_cycle_start_day
-- Created: 2026-03-01 18:09:06

BEGIN;

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS billing_cycle_start_day INTEGER DEFAULT NULL
  CHECK (billing_cycle_start_day BETWEEN 1 AND 28);

COMMIT;
