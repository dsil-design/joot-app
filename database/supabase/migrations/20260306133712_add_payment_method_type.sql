-- Migration: add_payment_method_type
-- Created: 2026-03-06 13:37:12

BEGIN;

-- Add type column to payment_methods to differentiate credit cards from bank accounts
ALTER TABLE public.payment_methods
  ADD COLUMN type TEXT NOT NULL DEFAULT 'credit_card'
  CHECK (type IN ('credit_card', 'bank_account', 'debit_card', 'other'));

COMMIT;
