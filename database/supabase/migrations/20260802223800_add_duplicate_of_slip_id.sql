-- Migration: add_duplicate_of_slip_id
-- Created: 2026-08-02 22:38:00
--
-- Upload-time duplicate detection keys on file_hash alone, which only catches
-- byte-identical re-uploads. Re-exported photos of the same slip hash
-- differently, so uploads on 2026-04-11 and 2026-04-13 carried the same eight
-- February payments to MS. SUPAPORN KIDKLA without anything noticing.
--
-- The bank's transaction reference is unique per transfer and is the correct
-- key, but it only exists once vision extraction has run — so the check lives
-- at the end of extraction, and the result is recorded here. A nullable
-- self-reference keeps it queryable and filterable; extraction_log would have
-- worked but nothing reads slip warnings today.
--
-- ON DELETE SET NULL: deleting the original must not cascade away the copy.

BEGIN;

ALTER TABLE payment_slip_uploads
  ADD COLUMN IF NOT EXISTS duplicate_of_slip_id UUID
    REFERENCES payment_slip_uploads(id) ON DELETE SET NULL;

COMMENT ON COLUMN payment_slip_uploads.duplicate_of_slip_id IS
  'Set when extraction finds an earlier slip with the same bank transaction_reference. The referenced slip is the original.';

CREATE INDEX IF NOT EXISTS idx_payment_slip_uploads_duplicate_of
  ON public.payment_slip_uploads(user_id, duplicate_of_slip_id)
  WHERE duplicate_of_slip_id IS NOT NULL;

COMMIT;
