-- Migration: add_waiting_for_email_status
-- Created: 2026-03-13 20:14:26
-- Add 'waiting_for_email' status to email_transactions
-- Used when a transaction proposal is rejected because it needs an email receipt

BEGIN;

-- Drop and recreate the CHECK constraint to include the new status
ALTER TABLE public.email_transactions
  DROP CONSTRAINT IF EXISTS email_transactions_status_check;

ALTER TABLE public.email_transactions
  ADD CONSTRAINT email_transactions_status_check CHECK (status IN (
    'pending_review',
    'matched',
    'waiting_for_statement',
    'waiting_for_email',
    'ready_to_import',
    'imported',
    'skipped'
  ));

-- Index for efficient lookup of waiting-for-email items
CREATE INDEX IF NOT EXISTS idx_email_trans_waiting_email
  ON public.email_transactions(user_id)
  WHERE status = 'waiting_for_email';

COMMIT;
