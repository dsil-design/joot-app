-- Migration: unified_learning_pipeline
-- Created: 2026-04-05 11:47:31
--
-- Records every user decision (approve/reject/link) across all import sources
-- and learns statement description → vendor mappings.

BEGIN;

-- ============================================================================
-- Table: user_decision_log
-- ============================================================================

CREATE TABLE public.user_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'approve_match',
    'approve_create',
    'reject',
    'link'
  )),
  source_type TEXT NOT NULL CHECK (source_type IN (
    'statement', 'email', 'payment_slip',
    'merged', 'merged_slip_email', 'merged_slip_stmt', 'self_transfer'
  )),
  composite_id TEXT NOT NULL,

  -- Source identifiers
  statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE SET NULL,
  suggestion_index INTEGER,
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE SET NULL,
  payment_slip_id UUID REFERENCES public.payment_slip_uploads(id) ON DELETE SET NULL,

  -- Decision outcome
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  tag_ids UUID[] DEFAULT '{}',

  -- Source data snapshot
  statement_description TEXT,
  email_from_address TEXT,
  email_vendor_name_raw TEXT,
  email_parser_key TEXT,
  slip_counterparty_name TEXT,
  amount DECIMAL(12, 2),
  currency TEXT,

  -- Match quality
  match_confidence INTEGER CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100)),
  was_auto_matched BOOLEAN DEFAULT false,

  -- For rejections
  rejected_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_decision_log_user_created
  ON public.user_decision_log (user_id, created_at DESC);

CREATE INDEX idx_user_decision_log_user_source
  ON public.user_decision_log (user_id, source_type);

CREATE INDEX idx_user_decision_log_user_vendor
  ON public.user_decision_log (user_id, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_user_decision_log_user_stmt_desc
  ON public.user_decision_log (user_id, statement_description)
  WHERE statement_description IS NOT NULL;

ALTER TABLE public.user_decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decision log"
  ON public.user_decision_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decision log"
  ON public.user_decision_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on decision log"
  ON public.user_decision_log FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Table: statement_description_mappings
-- ============================================================================

CREATE TABLE public.statement_description_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  description_normalized TEXT NOT NULL,
  description_raw TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,

  match_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (user_id, description_normalized, payment_method_id)
);

CREATE INDEX idx_stmt_desc_mappings_user
  ON public.statement_description_mappings (user_id);

CREATE INDEX idx_stmt_desc_mappings_vendor
  ON public.statement_description_mappings (user_id, vendor_id);

ALTER TABLE public.statement_description_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statement description mappings"
  ON public.statement_description_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own statement description mappings"
  ON public.statement_description_mappings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on statement description mappings"
  ON public.statement_description_mappings FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
