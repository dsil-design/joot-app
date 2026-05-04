-- Migration: sync_transaction_source_columns
-- Created: 2026-05-02
-- Description: Keep transactions.source_email_transaction_id and
--   transactions.source_payment_slip_id in sync with the reverse columns
--   email_transactions.matched_transaction_id and
--   payment_slip_uploads.matched_transaction_id.
--
--   The list page reads the forward columns; the detail page reads the reverse
--   joins. Without enforced sync the two views disagree (and duplicate
--   transactions can be created from a statement when the slip is already
--   linked to an existing transaction). These triggers make the reverse side
--   the source of truth — any change there is mirrored to the forward column.
--
--   Forward-side writes still happen (legacy code paths), so we also mirror
--   forward -> reverse to keep both directions consistent until the forward
--   columns can be removed.

------------------------------------------------------------
-- email_transactions.matched_transaction_id  ->  transactions.source_email_transaction_id
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_email_match_to_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- New/changed match: point the txn forward column at this email
  IF NEW.matched_transaction_id IS NOT NULL
     AND (OLD.matched_transaction_id IS DISTINCT FROM NEW.matched_transaction_id) THEN
    UPDATE public.transactions
       SET source_email_transaction_id = NEW.id
     WHERE id = NEW.matched_transaction_id
       AND (source_email_transaction_id IS NULL
            OR source_email_transaction_id = OLD.id);
  END IF;

  -- Unlink: if the txn was forwarding to this email, clear it
  IF OLD.matched_transaction_id IS NOT NULL
     AND NEW.matched_transaction_id IS NULL THEN
    UPDATE public.transactions
       SET source_email_transaction_id = NULL
     WHERE id = OLD.matched_transaction_id
       AND source_email_transaction_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_email_match_to_transaction ON public.email_transactions;
CREATE TRIGGER trg_sync_email_match_to_transaction
  AFTER INSERT OR UPDATE OF matched_transaction_id
  ON public.email_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_match_to_transaction();

------------------------------------------------------------
-- payment_slip_uploads.matched_transaction_id  ->  transactions.source_payment_slip_id
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_slip_match_to_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.matched_transaction_id IS NOT NULL
     AND (OLD.matched_transaction_id IS DISTINCT FROM NEW.matched_transaction_id) THEN
    UPDATE public.transactions
       SET source_payment_slip_id = NEW.id
     WHERE id = NEW.matched_transaction_id
       AND (source_payment_slip_id IS NULL
            OR source_payment_slip_id = OLD.id);
  END IF;

  IF OLD.matched_transaction_id IS NOT NULL
     AND NEW.matched_transaction_id IS NULL THEN
    UPDATE public.transactions
       SET source_payment_slip_id = NULL
     WHERE id = OLD.matched_transaction_id
       AND source_payment_slip_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_slip_match_to_transaction ON public.payment_slip_uploads;
CREATE TRIGGER trg_sync_slip_match_to_transaction
  AFTER INSERT OR UPDATE OF matched_transaction_id
  ON public.payment_slip_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_slip_match_to_transaction();

------------------------------------------------------------
-- transactions.source_email_transaction_id  ->  email_transactions.matched_transaction_id
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_transaction_source_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_email_transaction_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR OLD.source_email_transaction_id IS DISTINCT FROM NEW.source_email_transaction_id) THEN
    UPDATE public.email_transactions
       SET matched_transaction_id = NEW.id
     WHERE id = NEW.source_email_transaction_id
       AND matched_transaction_id IS DISTINCT FROM NEW.id;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.source_email_transaction_id IS NOT NULL
     AND NEW.source_email_transaction_id IS NULL THEN
    UPDATE public.email_transactions
       SET matched_transaction_id = NULL
     WHERE id = OLD.source_email_transaction_id
       AND matched_transaction_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_transaction_source_email ON public.transactions;
CREATE TRIGGER trg_sync_transaction_source_email
  AFTER INSERT OR UPDATE OF source_email_transaction_id
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transaction_source_email();

------------------------------------------------------------
-- transactions.source_payment_slip_id  ->  payment_slip_uploads.matched_transaction_id
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_transaction_source_slip()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_payment_slip_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR OLD.source_payment_slip_id IS DISTINCT FROM NEW.source_payment_slip_id) THEN
    UPDATE public.payment_slip_uploads
       SET matched_transaction_id = NEW.id
     WHERE id = NEW.source_payment_slip_id
       AND matched_transaction_id IS DISTINCT FROM NEW.id;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.source_payment_slip_id IS NOT NULL
     AND NEW.source_payment_slip_id IS NULL THEN
    UPDATE public.payment_slip_uploads
       SET matched_transaction_id = NULL
     WHERE id = OLD.source_payment_slip_id
       AND matched_transaction_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_transaction_source_slip ON public.transactions;
CREATE TRIGGER trg_sync_transaction_source_slip
  AFTER INSERT OR UPDATE OF source_payment_slip_id
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transaction_source_slip();
