-- Migration: create_statement_uploads
-- Created: 2026-01-11
-- Description: Create statement_uploads table for storing uploaded statement file metadata
-- Task: P1-002

BEGIN;

-- Statement uploads table - stores metadata for uploaded statement files and processing results
-- Files are stored in Supabase Storage; this table tracks metadata and processing status
CREATE TABLE public.statement_uploads (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership (for RLS)
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  filename TEXT NOT NULL,              -- Original uploaded filename
  file_path TEXT NOT NULL,             -- Path in Supabase Storage bucket
  file_size INTEGER,                   -- File size in bytes
  file_type TEXT,                      -- MIME type (e.g., 'application/pdf', 'text/csv')

  -- Statement metadata
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  statement_period_start DATE,         -- Start of statement period
  statement_period_end DATE,           -- End of statement period

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',     -- Uploaded, not yet processed
    'processing',  -- Currently being processed
    'completed',   -- Processing finished successfully
    'failed'       -- Processing failed
  )),

  -- Processing results
  transactions_extracted INTEGER DEFAULT 0,  -- Number of transactions found in statement
  transactions_matched INTEGER DEFAULT 0,    -- Number matched to email transactions
  transactions_new INTEGER DEFAULT 0,        -- Number that are new (no email match)

  -- Processing timestamps and logs
  extraction_started_at TIMESTAMPTZ,         -- When processing began
  extraction_completed_at TIMESTAMPTZ,       -- When processing finished
  extraction_error TEXT,                     -- Error message if failed
  extraction_log JSONB,                      -- Detailed processing log

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
-- Primary index for listing user's statement uploads
CREATE INDEX idx_statement_uploads_user_id ON public.statement_uploads(user_id);

-- Index for filtering by payment method
CREATE INDEX idx_statement_uploads_payment_method ON public.statement_uploads(payment_method_id)
  WHERE payment_method_id IS NOT NULL;

-- Index for date-based sorting
CREATE INDEX idx_statement_uploads_uploaded_at ON public.statement_uploads(uploaded_at DESC);

-- Index for filtering by status
CREATE INDEX idx_statement_uploads_status ON public.statement_uploads(user_id, status);

-- Compound index for common dashboard queries (user's recent uploads by status)
CREATE INDEX idx_statement_uploads_user_status_date
  ON public.statement_uploads(user_id, status, uploaded_at DESC);

-- Enable Row Level Security
ALTER TABLE public.statement_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own statement uploads
CREATE POLICY "Users can view own statement uploads" ON public.statement_uploads
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Users can insert their own statement uploads
CREATE POLICY "Users can insert own statement uploads" ON public.statement_uploads
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own statement uploads
CREATE POLICY "Users can update own statement uploads" ON public.statement_uploads
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Users can delete their own statement uploads
CREATE POLICY "Users can delete own statement uploads" ON public.statement_uploads
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Trigger for automatic updated_at timestamp
CREATE TRIGGER update_statement_uploads_updated_at
  BEFORE UPDATE ON public.statement_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
