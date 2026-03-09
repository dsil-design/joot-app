-- Migration: reset_email_status_on_transaction_delete
-- Created: 2026-03-09
--
-- When a transaction is deleted, the FK ON DELETE SET NULL clears
-- email_transactions.matched_transaction_id, but the status stays 'matched'.
-- This trigger resets it to 'pending_review' so the email reappears in the queue.

BEGIN;

CREATE OR REPLACE FUNCTION public.reset_email_transaction_on_unlink()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when matched_transaction_id is cleared (set to NULL from a non-NULL value)
  IF OLD.matched_transaction_id IS NOT NULL AND NEW.matched_transaction_id IS NULL THEN
    NEW.status := 'pending_review';
    NEW.match_method := NULL;
    NEW.match_confidence := NULL;
    NEW.matched_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fire BEFORE UPDATE so we can modify the row in-place
CREATE TRIGGER trg_reset_email_transaction_on_unlink
  BEFORE UPDATE OF matched_transaction_id
  ON public.email_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_email_transaction_on_unlink();

COMMIT;
