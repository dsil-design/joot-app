-- Migration: add_payment_method_to_user_bank_accounts
-- Created: 2026-03-23 14:24:03
-- Links user bank accounts to payment methods so payment slips
-- auto-assign the correct payment method on transaction creation.

BEGIN;

ALTER TABLE public.user_bank_accounts
  ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;

CREATE INDEX idx_user_bank_accounts_payment_method ON public.user_bank_accounts(payment_method_id)
  WHERE payment_method_id IS NOT NULL;

-- Also add payment_method_id to payment_slip_uploads so the detected
-- payment method is stored on the slip and used when creating transactions.
ALTER TABLE public.payment_slip_uploads
  ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;

COMMIT;
