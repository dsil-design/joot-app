-- Migration: add_payment_slip_uploads
-- Created: 2026-03-23 13:59:27

BEGIN;

-- ============================================================================
-- PAYMENT SLIP UPLOADS TABLE
-- ============================================================================

CREATE TABLE public.payment_slip_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  file_hash TEXT,

  -- Extracted transaction fields (flattened from Claude Vision response)
  transaction_date DATE,
  transaction_time TIME,
  amount DECIMAL(12, 2),
  fee DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'THB',
  sender_name TEXT,
  sender_bank TEXT,
  sender_account TEXT,
  recipient_name TEXT,
  recipient_bank TEXT,
  recipient_account TEXT,
  transaction_reference TEXT,
  bank_reference TEXT,
  memo TEXT,
  bank_detected TEXT,
  transfer_type TEXT,
  detected_direction TEXT CHECK (detected_direction IS NULL OR detected_direction IN ('expense', 'income')),

  -- Full extraction data from Claude Vision (JSONB)
  extraction_data JSONB,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'ready_for_review',
    'done',
    'failed'
  )),

  -- Processing metadata
  extraction_started_at TIMESTAMPTZ,
  extraction_completed_at TIMESTAMPTZ,
  extraction_error TEXT,
  extraction_log JSONB,
  extraction_confidence INTEGER CHECK (
    extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 100)
  ),
  ai_prompt_tokens INTEGER,
  ai_response_tokens INTEGER,
  ai_duration_ms INTEGER,

  -- Matched transaction
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_confidence INTEGER CHECK (
    match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100)
  ),

  -- Review status (for queue)
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_slip_uploads_user_id ON public.payment_slip_uploads(user_id);
CREATE INDEX idx_payment_slip_uploads_status ON public.payment_slip_uploads(user_id, status);
CREATE INDEX idx_payment_slip_uploads_review ON public.payment_slip_uploads(user_id, review_status)
  WHERE review_status = 'pending';
CREATE INDEX idx_payment_slip_uploads_uploaded_at ON public.payment_slip_uploads(uploaded_at DESC);
CREATE INDEX idx_payment_slip_uploads_file_hash ON public.payment_slip_uploads(file_hash)
  WHERE file_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_payment_slip_uploads_user_file_hash_unique
  ON public.payment_slip_uploads(user_id, file_hash)
  WHERE file_hash IS NOT NULL;
CREATE INDEX idx_payment_slip_uploads_transaction_ref ON public.payment_slip_uploads(transaction_reference)
  WHERE transaction_reference IS NOT NULL;

-- RLS
ALTER TABLE public.payment_slip_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment slip uploads" ON public.payment_slip_uploads
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own payment slip uploads" ON public.payment_slip_uploads
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own payment slip uploads" ON public.payment_slip_uploads
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own payment slip uploads" ON public.payment_slip_uploads
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Updated_at trigger
CREATE TRIGGER update_payment_slip_uploads_updated_at BEFORE UPDATE ON public.payment_slip_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USER BANK ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE public.user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  bank_name TEXT NOT NULL,
  account_identifier TEXT NOT NULL,
  account_holder_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_bank_accounts_user ON public.user_bank_accounts(user_id);
CREATE UNIQUE INDEX idx_user_bank_accounts_unique
  ON public.user_bank_accounts(user_id, bank_name, account_identifier);

ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank accounts" ON public.user_bank_accounts
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.user_bank_accounts
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own bank accounts" ON public.user_bank_accounts
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own bank accounts" ON public.user_bank_accounts
  FOR DELETE USING ((select auth.uid()) = user_id);

CREATE TRIGGER update_user_bank_accounts_updated_at BEFORE UPDATE ON public.user_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXTEND TRANSACTIONS TABLE
-- ============================================================================

ALTER TABLE public.transactions
  ADD COLUMN source_payment_slip_id UUID REFERENCES public.payment_slip_uploads(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_source_payment_slip ON public.transactions(source_payment_slip_id)
  WHERE source_payment_slip_id IS NOT NULL;

-- ============================================================================
-- EXTEND IMPORT ACTIVITIES
-- ============================================================================

ALTER TABLE public.import_activities
  ADD COLUMN payment_slip_upload_id UUID REFERENCES public.payment_slip_uploads(id) ON DELETE SET NULL;

-- Drop and recreate the activity_type check constraint to include new types
ALTER TABLE public.import_activities
  DROP CONSTRAINT IF EXISTS import_activities_activity_type_check;

ALTER TABLE public.import_activities
  ADD CONSTRAINT import_activities_activity_type_check CHECK (activity_type IN (
    'email_sync',
    'email_extracted',
    'statement_uploaded',
    'statement_processed',
    'transaction_matched',
    'transaction_imported',
    'transaction_skipped',
    'batch_import',
    'sync_error',
    'extraction_error',
    'slip_uploaded',
    'slip_processed'
  ));

-- ============================================================================
-- EXTEND TRANSACTION PROPOSALS
-- ============================================================================

ALTER TABLE public.transaction_proposals
  ADD COLUMN payment_slip_upload_id UUID REFERENCES public.payment_slip_uploads(id) ON DELETE CASCADE;

-- Drop and recreate source_type check to include payment_slip
ALTER TABLE public.transaction_proposals
  DROP CONSTRAINT IF EXISTS transaction_proposals_source_type_check;

ALTER TABLE public.transaction_proposals
  ADD CONSTRAINT transaction_proposals_source_type_check CHECK (source_type IN ('statement', 'email', 'merged', 'payment_slip'));

-- Relax the source check constraint to allow payment_slip source
ALTER TABLE public.transaction_proposals
  DROP CONSTRAINT IF EXISTS proposal_source_check;

ALTER TABLE public.transaction_proposals
  ADD CONSTRAINT proposal_source_check CHECK (
    (statement_upload_id IS NOT NULL AND suggestion_index IS NOT NULL)
    OR email_transaction_id IS NOT NULL
    OR payment_slip_upload_id IS NOT NULL
  );

CREATE INDEX idx_proposals_payment_slip ON transaction_proposals(payment_slip_upload_id)
  WHERE payment_slip_upload_id IS NOT NULL;

COMMIT;
