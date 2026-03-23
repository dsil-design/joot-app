-- Migration: add_slip_parity_fields
-- Created: 2026-03-23 16:56:07

BEGIN;

-- Add rejected_transaction_ids tracking to payment_slip_uploads (parity with email_transactions)
ALTER TABLE public.payment_slip_uploads
  ADD COLUMN rejected_transaction_ids UUID[] NOT NULL DEFAULT '{}';

-- Create trigger function to reset payment slip state when matched_transaction_id is cleared
-- (e.g., linked transaction deleted or manually unlinked)
-- Mirrors reset_email_transaction_on_unlink() for email_transactions
CREATE OR REPLACE FUNCTION public.reset_payment_slip_on_unlink()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.matched_transaction_id IS NOT NULL AND NEW.matched_transaction_id IS NULL THEN
    NEW.review_status := 'pending';
    NEW.status := 'ready_for_review';
    NEW.match_confidence := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reset_payment_slip_on_unlink
  BEFORE UPDATE OF matched_transaction_id
  ON public.payment_slip_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_payment_slip_on_unlink();

COMMIT;
