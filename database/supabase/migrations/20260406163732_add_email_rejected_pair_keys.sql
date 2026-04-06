-- Migration: add_email_rejected_pair_keys
-- Created: 2026-04-06 16:37:32

BEGIN;

-- Add rejected_pair_keys to email_transactions
--
-- Tracks statement-suggestion composite keys (`${statementUploadId}:${index}`)
-- that the user has rejected as a cross-source pairing for this email. The
-- cross-source pairer skips candidate pairs whose statement key is in this
-- set, so a previously-rejected merged pairing won't immediately re-pair on
-- the next queue load — while still allowing the email to pair with other
-- statement suggestions.

ALTER TABLE email_transactions
  ADD COLUMN IF NOT EXISTS rejected_pair_keys text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN email_transactions.rejected_pair_keys IS
  'Statement-suggestion composite keys (statementUploadId:index) this email has been rejected from pairing with.';

COMMIT;
