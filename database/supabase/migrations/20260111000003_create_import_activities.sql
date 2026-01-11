-- Migration: create_import_activities
-- Created: 2026-01-11
-- Description: Create import_activities table for audit trail of all import actions
-- Task: P1-003

BEGIN;

-- Import activities table - provides an audit trail of all import actions
-- Tracks email syncs, statement uploads, matches, imports, and user actions
CREATE TABLE public.import_activities (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership (for RLS)
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Activity type
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'email_sync',           -- Automatic or manual email sync
    'email_extracted',      -- Transaction data extracted from email
    'statement_uploaded',   -- Statement file uploaded
    'statement_processed',  -- Statement parsing completed
    'transaction_matched',  -- Email matched to existing transaction
    'transaction_imported', -- New transaction created from email
    'transaction_skipped',  -- User marked email as non-transaction
    'batch_import',         -- Multiple transactions imported at once
    'sync_error',           -- Error during sync process
    'extraction_error'      -- Error during data extraction
  )),

  -- Optional reference to related statement upload
  statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE SET NULL,

  -- Optional reference to related email transaction
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE SET NULL,

  -- Activity description
  description TEXT NOT NULL,

  -- Summary statistics (for batch operations)
  transactions_affected INTEGER DEFAULT 0,
  total_amount DECIMAL(12, 2),
  currency TEXT,

  -- Flexible metadata for additional context
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
-- Primary index for listing user's activities
CREATE INDEX idx_import_activities_user_id ON public.import_activities(user_id);

-- Index for filtering by activity type
CREATE INDEX idx_import_activities_type ON public.import_activities(user_id, activity_type);

-- Index for date-based sorting (most common query: recent activities)
CREATE INDEX idx_import_activities_created_at ON public.import_activities(created_at DESC);

-- Compound index for dashboard queries (user's recent activities)
CREATE INDEX idx_import_activities_user_created
  ON public.import_activities(user_id, created_at DESC);

-- Partial index for error activities (for monitoring/debugging)
CREATE INDEX idx_import_activities_errors ON public.import_activities(user_id, created_at DESC)
  WHERE activity_type IN ('sync_error', 'extraction_error');

-- Enable Row Level Security
ALTER TABLE public.import_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own import activities
CREATE POLICY "Users can view own import activities" ON public.import_activities
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Users can insert their own import activities
CREATE POLICY "Users can insert own import activities" ON public.import_activities
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Users can delete their own import activities (for cleanup)
CREATE POLICY "Users can delete own import activities" ON public.import_activities
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Note: No UPDATE policy - activities are immutable audit records

COMMIT;
