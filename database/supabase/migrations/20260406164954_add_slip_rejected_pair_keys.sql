-- Migration: add_slip_rejected_pair_keys
-- Created: 2026-04-06 16:49:54

BEGIN;

-- Add rejected_pair_keys to payment_slip_uploads
--
-- Tracks counterpart composite keys this slip has been rejected from pairing
-- with. Keys use the same format as composite IDs elsewhere:
--   email:<emailId>
--   stmt:<statementId>:<index>
-- The slip-pairing logic in queue-aggregator.ts skips candidate pairs whose
-- key is in this set, preserving surgical per-source rejections on 3-way
-- slip+email+statement groupings.

ALTER TABLE payment_slip_uploads
  ADD COLUMN IF NOT EXISTS rejected_pair_keys text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN payment_slip_uploads.rejected_pair_keys IS
  'Counterpart composite keys (email:<id> or stmt:<id>:<idx>) this slip has been rejected from pairing with.';

COMMIT;
