-- Migration: allow_transfer_direction_on_payment_slips
-- Created: 2026-08-02 22:01:53
--
-- detectDirection() returns 'transfer' when both sides of a slip are the
-- user's own accounts, and every layer above the database models that value:
-- PaymentSlipUpload.detected_direction, the queue builder, the proposal
-- engines and the transaction-type filters all accept
-- 'expense' | 'income' | 'transfer' | null. Only this constraint disagreed.
--
-- The disagreement was invisible because the terminal write in
-- processPaymentSlip did not check its result: a self-transfer slip failed the
-- save, the row kept status 'processing' forever, and the caller was told
-- extraction had succeeded. IMG_1602.JPG sat that way from 2026-04-13 to
-- 2026-08-02, matching neither the 'pending' nor the 'failed' recovery scope.

BEGIN;

ALTER TABLE payment_slip_uploads
  DROP CONSTRAINT IF EXISTS payment_slip_uploads_detected_direction_check;

ALTER TABLE payment_slip_uploads
  ADD CONSTRAINT payment_slip_uploads_detected_direction_check
  CHECK (detected_direction IS NULL OR detected_direction IN ('expense', 'income', 'transfer'));

COMMIT;
