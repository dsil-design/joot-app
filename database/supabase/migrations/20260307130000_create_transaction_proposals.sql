-- Migration: create_transaction_proposals
-- Created: 2026-03-07

BEGIN;

-- 1. Alter ai_feedback: add 'proposal_correction' to feedback_type CHECK constraint
--    and make email_transaction_id nullable (proposal corrections from statement items
--    won't have an associated email transaction)
ALTER TABLE public.ai_feedback
  DROP CONSTRAINT IF EXISTS ai_feedback_feedback_type_check;

ALTER TABLE public.ai_feedback
  ADD CONSTRAINT ai_feedback_feedback_type_check
  CHECK (feedback_type IN (
    'classification_change',
    'skip_override',
    'extraction_correction',
    'undo_skip',
    'skip_reason',
    'proposal_correction'
  ));

ALTER TABLE public.ai_feedback
  ALTER COLUMN email_transaction_id DROP NOT NULL;

-- 2. Create transaction_proposals table
CREATE TABLE public.transaction_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Source reference
  source_type TEXT NOT NULL CHECK (source_type IN ('statement', 'email', 'merged')),
  composite_id TEXT NOT NULL,
  statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE CASCADE,
  suggestion_index INTEGER,
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE CASCADE,

  -- Proposed transaction fields
  proposed_description TEXT,
  proposed_amount DECIMAL(12,2),
  proposed_currency currency_type,
  proposed_transaction_type transaction_type,
  proposed_date DATE,
  proposed_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  proposed_vendor_name_suggestion TEXT,
  proposed_payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  proposed_tag_ids UUID[] DEFAULT '{}',

  -- Per-field confidence and reasoning
  field_confidence JSONB NOT NULL DEFAULT '{}',
  overall_confidence INTEGER NOT NULL DEFAULT 0,

  -- Engine metadata
  engine TEXT NOT NULL CHECK (engine IN ('rule_based', 'llm', 'hybrid')),
  llm_model TEXT,
  llm_prompt_tokens INTEGER,
  llm_response_tokens INTEGER,
  generation_duration_ms INTEGER,

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'modified', 'rejected', 'stale')),
  accepted_at TIMESTAMPTZ,
  created_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  -- Learning: what the user changed
  user_modifications JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT proposal_source_check CHECK (
    (statement_upload_id IS NOT NULL AND suggestion_index IS NOT NULL)
    OR email_transaction_id IS NOT NULL
  ),
  UNIQUE(composite_id, user_id)
);

-- Indexes
CREATE INDEX idx_proposals_user_status ON transaction_proposals(user_id, status);
CREATE INDEX idx_proposals_composite ON transaction_proposals(composite_id);
CREATE INDEX idx_proposals_statement ON transaction_proposals(statement_upload_id, suggestion_index)
  WHERE statement_upload_id IS NOT NULL;
CREATE INDEX idx_proposals_email ON transaction_proposals(email_transaction_id)
  WHERE email_transaction_id IS NOT NULL;

-- RLS
ALTER TABLE public.transaction_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
  ON public.transaction_proposals FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own proposals"
  ON public.transaction_proposals FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own proposals"
  ON public.transaction_proposals FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own proposals"
  ON public.transaction_proposals FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access"
  ON public.transaction_proposals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER update_transaction_proposals_updated_at
  BEFORE UPDATE ON public.transaction_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
