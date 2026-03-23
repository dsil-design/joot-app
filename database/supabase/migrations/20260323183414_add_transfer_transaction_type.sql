-- Migration: add_transfer_transaction_type
-- Created: 2026-03-23 18:34:14

-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'transfer';

BEGIN;

-- Add transfer metadata columns
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_from_account TEXT,
  ADD COLUMN IF NOT EXISTS transfer_to_account TEXT;

COMMENT ON COLUMN public.transactions.transfer_from_account IS 'Source account identifier for self-transfers (e.g., bank name + account)';
COMMENT ON COLUMN public.transactions.transfer_to_account IS 'Destination account identifier for self-transfers (e.g., bank name + account)';

COMMIT;
