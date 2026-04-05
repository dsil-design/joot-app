-- Migration: add_waiting_for_slip_status
-- Created: 2026-04-05 13:14:23
-- Description: Add 'waiting_for_slip' status to email_transactions for items
-- that need a payment slip before they can be processed.

BEGIN;

-- Update the CHECK constraint on email_transactions.status
ALTER TABLE public.email_transactions
  DROP CONSTRAINT IF EXISTS email_transactions_status_check;

ALTER TABLE public.email_transactions
  ADD CONSTRAINT email_transactions_status_check
  CHECK (status IN (
    'pending_review',
    'matched',
    'waiting_for_statement',
    'waiting_for_email',
    'waiting_for_slip',
    'ready_to_import',
    'imported',
    'skipped'
  ));

-- Add partial index for the new status
CREATE INDEX IF NOT EXISTS idx_email_transactions_waiting_slip
  ON public.email_transactions(user_id, transaction_date)
  WHERE status = 'waiting_for_slip';

COMMIT;
