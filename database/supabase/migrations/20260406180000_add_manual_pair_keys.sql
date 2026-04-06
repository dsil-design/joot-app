-- Migration: add_manual_pair_keys
-- Created: 2026-04-06 18:00:00

BEGIN;

-- Add manual_pair_keys to email_transactions and payment_slip_uploads.
--
-- Mirror image of rejected_pair_keys: tracks counterpart composite keys that
-- the user has explicitly forced this source to pair with via the "Attach a
-- source" affordance on the Review Queue. Keys use the same format as
-- composite IDs elsewhere:
--   email:<emailId>
--   slip:<slipId>
--   stmt:<statementId>:<index>
--
-- The aggregator's manual-pair phase materializes these forced pairs before
-- running heuristic pairing, bypassing the usual amount/date/currency checks.

ALTER TABLE email_transactions
  ADD COLUMN IF NOT EXISTS manual_pair_keys text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN email_transactions.manual_pair_keys IS
  'Counterpart composite keys (slip:<id> or stmt:<id>:<idx>) this email has been manually paired with by the user.';

ALTER TABLE payment_slip_uploads
  ADD COLUMN IF NOT EXISTS manual_pair_keys text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN payment_slip_uploads.manual_pair_keys IS
  'Counterpart composite keys (email:<id> or stmt:<id>:<idx>) this slip has been manually paired with by the user.';

COMMIT;
