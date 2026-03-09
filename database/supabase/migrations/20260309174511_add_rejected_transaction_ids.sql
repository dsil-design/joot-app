-- Migration: add_rejected_transaction_ids
-- Created: 2026-03-09
-- Description: Track which transaction matches a user has rejected for each email,
--              so the rematch engine can exclude them from future proposals.

BEGIN;

ALTER TABLE public.email_transactions
  ADD COLUMN rejected_transaction_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.email_transactions.rejected_transaction_ids IS
  'Transaction IDs that the user has rejected as matches for this email. The rematch engine excludes these from future candidates.';

COMMIT;
