-- Migration: ai_journal_tables
-- Created: 2026-03-04
-- Adds tables for AI journal logging, analysis runs, and actionable insights

BEGIN;

-- ============================================================================
-- AI Journal: Logs every Gemini invocation
-- ============================================================================

CREATE TABLE public.ai_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invocation_type TEXT NOT NULL,
  email_id UUID,
  email_transaction_id UUID,
  from_address TEXT,
  from_name TEXT,
  subject TEXT,
  email_date TIMESTAMPTZ,
  body_length INTEGER,
  regex_parser_attempted TEXT,
  regex_extraction_success BOOLEAN,
  ai_classification TEXT,
  ai_suggested_skip BOOLEAN,
  ai_reasoning TEXT,
  ai_extracted_vendor TEXT,
  ai_extracted_amount DECIMAL(12,2),
  ai_extracted_currency TEXT,
  ai_extracted_date DATE,
  ai_confidence INTEGER,
  final_parser_key TEXT,
  final_confidence INTEGER,
  final_status TEXT,
  duration_ms INTEGER,
  prompt_tokens INTEGER,
  response_tokens INTEGER,
  feedback_examples_used INTEGER DEFAULT 0,
  feedback_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_journal_user_created ON public.ai_journal (user_id, created_at DESC);
CREATE INDEX idx_ai_journal_user_sender ON public.ai_journal (user_id, from_address);
CREATE INDEX idx_ai_journal_user_parser ON public.ai_journal (user_id, final_parser_key);

-- ============================================================================
-- AI Analysis Runs: Tracks each analysis execution
-- ============================================================================

CREATE TABLE public.ai_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  journal_entries_analyzed INTEGER DEFAULT 0,
  journal_from TIMESTAMPTZ,
  journal_to TIMESTAMPTZ,
  previous_run_id UUID,
  summary JSONB,
  patterns JSONB,
  recommendations JSONB,
  duration_ms INTEGER,
  ai_calls_made INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_analysis_runs_user ON public.ai_analysis_runs (user_id, created_at DESC);

-- ============================================================================
-- AI Insights: Individual actionable recommendations
-- ============================================================================

CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  analysis_run_id UUID REFERENCES public.ai_analysis_runs(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB,
  target_sender TEXT,
  email_count INTEGER,
  format_consistency_pct DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'active',
  dismissed_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_user_status ON public.ai_insights (user_id, status);
CREATE INDEX idx_ai_insights_run ON public.ai_insights (analysis_run_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.ai_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal entries"
  ON public.ai_journal FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert journal entries"
  ON public.ai_journal FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update journal entries"
  ON public.ai_journal FOR UPDATE
  USING (true);

CREATE POLICY "Users can view their own analysis runs"
  ON public.ai_analysis_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert analysis runs"
  ON public.ai_analysis_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update analysis runs"
  ON public.ai_analysis_runs FOR UPDATE
  USING (true);

CREATE POLICY "Users can view their own insights"
  ON public.ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert insights"
  ON public.ai_insights FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own insights"
  ON public.ai_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can update insights"
  ON public.ai_insights FOR UPDATE
  USING (true);

COMMIT;
