-- Migration: email_hub_indexes_and_source_fk
-- Created: 2026-03-02 14:03:23
-- Email Hub: Add indexes and source_email_transaction_id FK to transactions

BEGIN;

-- Composite index for transaction lookups by user and date
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_composite
  ON public.transactions(user_id, transaction_date DESC);

-- Partial index for email transactions waiting for statement
CREATE INDEX IF NOT EXISTS idx_email_transactions_waiting
  ON public.email_transactions(user_id, transaction_date)
  WHERE status = 'waiting_for_statement';

-- Index for email hub stats aggregation queries
CREATE INDEX IF NOT EXISTS idx_email_transactions_stats
  ON public.email_transactions(user_id, status, classification, email_date DESC);

-- Index for email hub list sorted by email_date
CREATE INDEX IF NOT EXISTS idx_email_transactions_email_date
  ON public.email_transactions(user_id, email_date DESC);

-- Add source_email_transaction_id column to transactions table
-- Links a transaction back to the email it was created from
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source_email_transaction_id UUID
  REFERENCES public.email_transactions(id) ON DELETE SET NULL;

-- Partial index on source_email_transaction_id (only non-null values)
CREATE INDEX IF NOT EXISTS idx_transactions_source_email
  ON public.transactions(source_email_transaction_id)
  WHERE source_email_transaction_id IS NOT NULL;

COMMIT;
