-- Migration: add_card_last_four_to_payment_methods
-- Created: 2026-03-09 12:05:19
-- Allows matching payment methods by the last 4 digits of a card number
-- extracted from email receipts (e.g., "Visa •••• 0005")

BEGIN;

ALTER TABLE public.payment_methods
  ADD COLUMN card_last_four TEXT DEFAULT NULL
  CHECK (card_last_four IS NULL OR card_last_four ~ '^\d{4}$');

COMMENT ON COLUMN public.payment_methods.card_last_four IS
  'Last 4 digits of the card number, used for matching payment methods from email receipts';

COMMIT;
