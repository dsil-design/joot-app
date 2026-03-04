-- Enhanced AI Classification, Email Consolidation & Feedback Loop
--
-- Adds:
-- 1. AI classification columns to email_transactions
-- 2. email_groups table for consolidating related emails
-- 3. ai_feedback table for user corrections (few-shot prompt injection)
-- 4. Updated email_hub_unified view

-- ============================================================================
-- 1. New table: email_groups (must exist before FK on email_transactions)
-- ============================================================================

CREATE TABLE public.email_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  group_key TEXT NOT NULL,
  vendor_name TEXT,
  amount DECIMAL(12, 2),
  currency TEXT,
  transaction_date DATE,
  email_count INTEGER NOT NULL DEFAULT 1,
  primary_email_transaction_id UUID,  -- FK added after email_transactions columns exist
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, group_key)
);

-- Indexes
CREATE INDEX idx_email_groups_user_id ON public.email_groups(user_id);
CREATE INDEX idx_email_groups_group_key ON public.email_groups(group_key);
CREATE INDEX idx_email_groups_vendor ON public.email_groups(user_id, vendor_name);

-- RLS
ALTER TABLE public.email_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email groups" ON public.email_groups
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own email groups" ON public.email_groups
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own email groups" ON public.email_groups
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own email groups" ON public.email_groups
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_email_groups_updated_at BEFORE UPDATE ON public.email_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. New columns on email_transactions
-- ============================================================================

-- AI classification (granular, 13 types)
ALTER TABLE public.email_transactions
  ADD COLUMN ai_classification TEXT CHECK (ai_classification IS NULL OR ai_classification IN (
    'transaction_receipt',
    'subscription_charge',
    'bank_transfer_confirmation',
    'bill_payment_confirmation',
    'upcoming_charge_notice',
    'invoice_available',
    'refund_notification',
    'delivery_status',
    'order_status',
    'account_notification',
    'marketing_promotional',
    'otp_verification',
    'other_non_transaction'
  ));

-- AI skip suggestion
ALTER TABLE public.email_transactions
  ADD COLUMN ai_suggested_skip BOOLEAN DEFAULT FALSE;

-- AI reasoning
ALTER TABLE public.email_transactions
  ADD COLUMN ai_reasoning TEXT;

-- Which parser extracted data (null = none matched)
ALTER TABLE public.email_transactions
  ADD COLUMN parser_key TEXT;

-- Email group reference
ALTER TABLE public.email_transactions
  ADD COLUMN email_group_id UUID REFERENCES public.email_groups(id) ON DELETE SET NULL;

-- Whether this is the primary email in its group
ALTER TABLE public.email_transactions
  ADD COLUMN is_group_primary BOOLEAN DEFAULT TRUE;

-- Indexes for new columns
CREATE INDEX idx_email_trans_ai_classification
  ON public.email_transactions(user_id, ai_classification);
CREATE INDEX idx_email_trans_ai_skip
  ON public.email_transactions(user_id, ai_suggested_skip)
  WHERE ai_suggested_skip = TRUE;
CREATE INDEX idx_email_trans_group
  ON public.email_transactions(email_group_id)
  WHERE email_group_id IS NOT NULL;
CREATE INDEX idx_email_trans_parser_key
  ON public.email_transactions(parser_key);

-- Now add the FK from email_groups back to email_transactions
ALTER TABLE public.email_groups
  ADD CONSTRAINT email_groups_primary_email_fkey
  FOREIGN KEY (primary_email_transaction_id)
  REFERENCES public.email_transactions(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. New table: ai_feedback
-- ============================================================================

CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE CASCADE NOT NULL,

  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'classification_change',
    'skip_override',
    'extraction_correction',
    'undo_skip'
  )),

  -- Original AI output
  original_ai_classification TEXT,
  original_ai_suggested_skip BOOLEAN,

  -- User corrections
  corrected_classification TEXT,
  corrected_skip BOOLEAN,

  -- Email context for prompt injection
  email_subject TEXT,
  email_from TEXT,
  email_body_preview TEXT,  -- First 500 chars

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_feedback_user_id ON public.ai_feedback(user_id);
CREATE INDEX idx_ai_feedback_email_tx ON public.ai_feedback(email_transaction_id);
CREATE INDEX idx_ai_feedback_user_recent
  ON public.ai_feedback(user_id, created_at DESC);

-- RLS
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI feedback" ON public.ai_feedback
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own AI feedback" ON public.ai_feedback
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own AI feedback" ON public.ai_feedback
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 4. Update email_hub_unified view
-- ============================================================================

CREATE OR REPLACE VIEW public.email_hub_unified
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.user_id,
  e.message_id,
  e.uid,
  e.folder,
  e.subject,
  e.from_address,
  e.from_name,
  e.date AS email_date,
  e.seen,
  e.has_attachments,
  e.synced_at,
  e.created_at,
  et.id AS email_transaction_id,
  et.vendor_id,
  et.vendor_name_raw,
  et.amount,
  et.currency,
  et.transaction_date,
  et.description,
  et.order_id,
  et.matched_transaction_id,
  et.match_confidence,
  et.match_method,
  COALESCE(et.status, 'unprocessed') AS status,
  et.classification,
  et.extraction_confidence,
  et.extraction_notes,
  et.processed_at,
  et.matched_at,
  et.updated_at,
  (et.id IS NOT NULL) AS is_processed,
  COALESCE(et.transaction_date, e.date::date) AS effective_date,
  -- New AI classification columns
  et.ai_classification,
  et.ai_suggested_skip,
  et.ai_reasoning,
  et.parser_key,
  et.email_group_id,
  et.is_group_primary,
  eg.email_count AS group_email_count
FROM public.emails e
LEFT JOIN public.email_transactions et
  ON e.message_id = et.message_id
  AND e.user_id = et.user_id
LEFT JOIN public.email_groups eg
  ON et.email_group_id = eg.id;
