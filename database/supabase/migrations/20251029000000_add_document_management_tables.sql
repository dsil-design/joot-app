-- Migration: Document Management and Reconciliation System
-- Created: 2025-10-29
-- Description: Adds 8 tables for document upload, OCR processing, AI extraction,
--              transaction matching, and vendor enrichment

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. DOCUMENTS TABLE
-- ============================================================================
-- Stores metadata for uploaded documents (receipts, invoices, bank statements)

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'image/jpeg', 'image/png', 'email'
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  thumbnail_path TEXT, -- Path to compressed thumbnail

  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'processing', 'completed', 'failed'
  processing_error TEXT,
  ocr_confidence DECIMAL(5, 2), -- 0-100

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(processing_status);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. DOCUMENT_EXTRACTIONS TABLE
-- ============================================================================
-- Stores OCR text and AI-extracted structured data from documents

CREATE TABLE IF NOT EXISTS public.document_extractions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Raw OCR output
  raw_text TEXT,

  -- Extracted transaction details
  merchant_name TEXT,
  merchant_name_normalized TEXT, -- Cleaned version for matching
  amount DECIMAL(12, 2),
  currency TEXT,
  transaction_date DATE,

  -- Confidence scores (0-100)
  merchant_confidence DECIMAL(5, 2),
  amount_confidence DECIMAL(5, 2),
  date_confidence DECIMAL(5, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(document_id) -- One extraction per document
);

-- Indexes
CREATE INDEX idx_extractions_document_id ON public.document_extractions(document_id);
CREATE INDEX idx_extractions_user_id ON public.document_extractions(user_id);
CREATE INDEX idx_extractions_date ON public.document_extractions(transaction_date DESC);
CREATE INDEX idx_extractions_merchant ON public.document_extractions(merchant_name_normalized);

-- RLS
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extractions" ON public.document_extractions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own extractions" ON public.document_extractions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own extractions" ON public.document_extractions
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. TRANSACTION_DOCUMENT_MATCHES TABLE
-- ============================================================================
-- Links documents to transactions with confidence scoring

CREATE TABLE IF NOT EXISTS public.transaction_document_matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,

  -- Match scoring
  match_confidence DECIMAL(5, 2) NOT NULL, -- 0-100
  match_score_breakdown JSONB, -- {amount: 95, date: 90, vendor: 85}

  -- Review status
  review_status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'approved', 'rejected', 'auto_approved'
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_matches_document_id ON public.transaction_document_matches(document_id);
CREATE INDEX idx_matches_transaction_id ON public.transaction_document_matches(transaction_id);
CREATE INDEX idx_matches_status ON public.transaction_document_matches(review_status);
CREATE INDEX idx_matches_confidence ON public.transaction_document_matches(match_confidence DESC);

-- RLS
ALTER TABLE public.transaction_document_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches" ON public.transaction_document_matches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own matches" ON public.transaction_document_matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own matches" ON public.transaction_document_matches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own matches" ON public.transaction_document_matches
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. RECONCILIATION_QUEUE TABLE
-- ============================================================================
-- Tracks documents that need manual review for matching

CREATE TABLE IF NOT EXISTS public.reconciliation_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,

  priority INT DEFAULT 50, -- 0-100, higher = more urgent
  queue_status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'in_review', 'completed', 'skipped'
  suggested_matches JSONB, -- Array of top 5 potential matches with scores

  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(document_id) -- One queue entry per document
);

-- Indexes
CREATE INDEX idx_queue_user_id ON public.reconciliation_queue(user_id);
CREATE INDEX idx_queue_status ON public.reconciliation_queue(queue_status);
CREATE INDEX idx_queue_priority ON public.reconciliation_queue(priority DESC, created_at ASC);

-- RLS
ALTER TABLE public.reconciliation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items" ON public.reconciliation_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue items" ON public.reconciliation_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items" ON public.reconciliation_queue
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 5. VENDOR_PROFILES TABLE
-- ============================================================================
-- Enhanced vendor data with logos and enrichment metadata

CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Enrichment data
  display_name TEXT, -- Override vendor name
  logo_url TEXT, -- URL to vendor logo
  brand_color TEXT, -- Hex color code
  business_category TEXT, -- e.g., 'restaurant', 'retail', 'service'
  website_domain TEXT, -- For logo fetching

  last_enriched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(vendor_id) -- One profile per vendor
);

-- Indexes
CREATE INDEX idx_vendor_profiles_vendor_id ON public.vendor_profiles(vendor_id);
CREATE INDEX idx_vendor_profiles_user_id ON public.vendor_profiles(user_id);
CREATE INDEX idx_vendor_profiles_domain ON public.vendor_profiles(website_domain);

-- RLS
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vendor profiles" ON public.vendor_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vendor profiles" ON public.vendor_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendor profiles" ON public.vendor_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. VENDOR_ENRICHMENT_JOBS TABLE
-- ============================================================================
-- Tracks background jobs for fetching vendor logos and data

CREATE TABLE IF NOT EXISTS public.vendor_enrichment_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  job_status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'processing', 'completed', 'failed'
  job_type TEXT NOT NULL DEFAULT 'logo_fetch',
  -- Values: 'logo_fetch', 'full_enrichment'

  attempt_count INT DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_enrichment_jobs_vendor_id ON public.vendor_enrichment_jobs(vendor_id);
CREATE INDEX idx_enrichment_jobs_status ON public.vendor_enrichment_jobs(job_status);
CREATE INDEX idx_enrichment_jobs_created_at ON public.vendor_enrichment_jobs(created_at ASC);

-- RLS
ALTER TABLE public.vendor_enrichment_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrichment jobs" ON public.vendor_enrichment_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrichment jobs" ON public.vendor_enrichment_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrichment jobs" ON public.vendor_enrichment_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 7. RECONCILIATION_AUDIT_LOG TABLE
-- ============================================================================
-- Tracks all reconciliation actions for audit trail and undo functionality

CREATE TABLE IF NOT EXISTS public.reconciliation_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.transaction_document_matches(id) ON DELETE SET NULL,

  action_type TEXT NOT NULL,
  -- Values: 'auto_match', 'manual_match', 'unmatch', 'reject', 'approve'
  action_metadata JSONB, -- Additional context about the action

  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  performed_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX idx_audit_log_user_id ON public.reconciliation_audit_log(user_id);
CREATE INDEX idx_audit_log_document_id ON public.reconciliation_audit_log(document_id);
CREATE INDEX idx_audit_log_transaction_id ON public.reconciliation_audit_log(transaction_id);
CREATE INDEX idx_audit_log_performed_at ON public.reconciliation_audit_log(performed_at DESC);

-- RLS
ALTER TABLE public.reconciliation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs" ON public.reconciliation_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs" ON public.reconciliation_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. PROCESSING_JOBS TABLE (Optional - for pg-boss tracking)
-- ============================================================================
-- Note: pg-boss creates its own tables. This table is for custom job metadata only.

CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,

  job_type TEXT NOT NULL,
  -- Values: 'ocr', 'extraction', 'matching', 'enrichment'
  job_status TEXT NOT NULL DEFAULT 'queued',
  -- Values: 'queued', 'processing', 'completed', 'failed', 'retrying'

  pg_boss_job_id TEXT, -- Reference to pg-boss job
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  result_data JSONB, -- Store job results
  error_data JSONB, -- Store error details

  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_processing_jobs_user_id ON public.processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_document_id ON public.processing_jobs(document_id);
CREATE INDEX idx_processing_jobs_status ON public.processing_jobs(job_status);
CREATE INDEX idx_processing_jobs_queued_at ON public.processing_jobs(queued_at ASC);

-- RLS
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own processing jobs" ON public.processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processing jobs" ON public.processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processing jobs" ON public.processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
-- Add triggers to automatically update updated_at timestamps

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_document_matches_updated_at
  BEFORE UPDATE ON public.transaction_document_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_profiles_updated_at
  BEFORE UPDATE ON public.vendor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_enrichment_jobs_updated_at
  BEFORE UPDATE ON public.vendor_enrichment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get unmatched documents for a user
CREATE OR REPLACE FUNCTION get_unmatched_documents(p_user_id UUID)
RETURNS TABLE (
  document_id UUID,
  file_name TEXT,
  merchant_name TEXT,
  amount DECIMAL,
  transaction_date DATE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.file_name,
    de.merchant_name,
    de.amount,
    de.transaction_date,
    d.created_at
  FROM public.documents d
  LEFT JOIN public.document_extractions de ON d.id = de.document_id
  LEFT JOIN public.transaction_document_matches tdm ON d.id = tdm.document_id
    AND tdm.review_status IN ('approved', 'auto_approved')
  WHERE d.user_id = p_user_id
    AND d.processing_status = 'completed'
    AND tdm.id IS NULL
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reconciliation queue for a user
CREATE OR REPLACE FUNCTION get_reconciliation_queue(p_user_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE (
  queue_id UUID,
  document_id UUID,
  file_name TEXT,
  merchant_name TEXT,
  amount DECIMAL,
  transaction_date DATE,
  suggested_matches JSONB,
  priority INT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rq.id,
    d.id,
    d.file_name,
    de.merchant_name,
    de.amount,
    de.transaction_date,
    rq.suggested_matches,
    rq.priority,
    rq.created_at
  FROM public.reconciliation_queue rq
  JOIN public.documents d ON rq.document_id = d.id
  LEFT JOIN public.document_extractions de ON d.id = de.document_id
  WHERE rq.user_id = p_user_id
    AND rq.queue_status = 'pending'
  ORDER BY rq.priority DESC, rq.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.documents IS 'Stores metadata for uploaded financial documents (receipts, invoices, statements)';
COMMENT ON TABLE public.document_extractions IS 'Stores OCR text and AI-extracted structured data from documents';
COMMENT ON TABLE public.transaction_document_matches IS 'Links documents to transactions with confidence scoring and review status';
COMMENT ON TABLE public.reconciliation_queue IS 'Tracks documents awaiting manual review for transaction matching';
COMMENT ON TABLE public.vendor_profiles IS 'Enhanced vendor data with logos, colors, and enrichment metadata';
COMMENT ON TABLE public.vendor_enrichment_jobs IS 'Background jobs for fetching vendor logos and enrichment data';
COMMENT ON TABLE public.reconciliation_audit_log IS 'Audit trail of all reconciliation actions for compliance and undo';
COMMENT ON TABLE public.processing_jobs IS 'Tracks custom processing jobs (OCR, extraction, matching, enrichment)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✓ 8 new tables created
-- ✓ All tables have RLS policies
-- ✓ Indexes added for performance
-- ✓ Updated_at triggers configured
-- ✓ Helper functions for common queries
-- ✓ Foreign key constraints enforced
-- ✓ JSONB columns for flexible metadata storage
