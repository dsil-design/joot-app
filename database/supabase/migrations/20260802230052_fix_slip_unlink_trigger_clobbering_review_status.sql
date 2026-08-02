-- Migration: fix_slip_unlink_trigger_clobbering_review_status
-- Created: 2026-08-02 23:00:52
--
-- reset_payment_slip_on_unlink() exists so that a slip whose transaction was
-- deleted or manually unlinked returns to the review queue. But it fired on
-- *any* statement that nulled matched_transaction_id, including one that was
-- simultaneously recording a decision — and because it is a BEFORE trigger,
-- its assignment won.
--
-- /api/imports/reject clears the link and sets review_status in a single
-- update:
--
--   .update({ review_status: 'rejected', matched_transaction_id: null, ... })
--
-- so rejecting a slip that had a matched transaction silently did nothing:
-- the row came back with the link cleared and review_status still 'pending',
-- and the slip reappeared in the queue. Slips with no link rejected fine,
-- which is why it looked intermittent rather than broken.
--
-- The reset now only applies when the statement is not itself changing
-- review_status. An explicit decision wins; an incidental unlink still sends
-- the slip back for review.

BEGIN;

CREATE OR REPLACE FUNCTION public.reset_payment_slip_on_unlink()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.matched_transaction_id IS NOT NULL
     AND NEW.matched_transaction_id IS NULL
     -- Only when the caller is not stating a review outcome of its own.
     AND NEW.review_status IS NOT DISTINCT FROM OLD.review_status
  THEN
    NEW.review_status := 'pending';
    NEW.status := 'ready_for_review';
    NEW.match_confidence := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
