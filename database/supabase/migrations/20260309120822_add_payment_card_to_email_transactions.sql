-- Migration: add_payment_card_to_email_transactions
-- Created: 2026-03-09 12:08:22
-- Stores payment card info extracted from email receipts (e.g., "Visa •••• 0005")

BEGIN;

ALTER TABLE public.email_transactions
  ADD COLUMN payment_card_last_four TEXT DEFAULT NULL
    CHECK (payment_card_last_four IS NULL OR payment_card_last_four ~ '^\d{4}$'),
  ADD COLUMN payment_card_type TEXT DEFAULT NULL;

COMMENT ON COLUMN public.email_transactions.payment_card_last_four IS
  'Last 4 digits of payment card extracted from email receipt';
COMMENT ON COLUMN public.email_transactions.payment_card_type IS
  'Card type extracted from email receipt (e.g., Visa, Mastercard)';

COMMIT;
