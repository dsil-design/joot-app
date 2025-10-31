-- ============================================================================
-- Document Management Tables - Minimal Version
-- ============================================================================
-- Run this in Supabase SQL Editor
-- Creates tables WITHOUT RLS policies first, then adds policies separately

-- ============================================================================
-- STEP 1: CREATE ALL TABLES (No RLS yet)
-- ============================================================================

-- 1. Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_url TEXT,
  thumbnail_path TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  ocr_confidence DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Document extractions table
CREATE TABLE IF NOT EXISTS public.document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text TEXT,
  merchant_name TEXT,
  merchant_name_normalized TEXT,
  amount DECIMAL(12,2),
  currency TEXT,
  transaction_date DATE,
  category TEXT,
  notes TEXT,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transaction document matches table
CREATE TABLE IF NOT EXISTS public.transaction_document_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_confidence DECIMAL(5,2) NOT NULL,
  match_score_breakdown JSONB,
  match_type TEXT NOT NULL,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  matched_by UUID REFERENCES auth.users(id),
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vendor profiles table
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_name_normalized TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  category TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reconciliation queue table
CREATE TABLE IF NOT EXISTS public.reconciliation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  queue_status TEXT NOT NULL DEFAULT 'pending_review',
  suggested_matches JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Reconciliation audit log table
CREATE TABLE IF NOT EXISTS public.reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID REFERENCES public.reconciliation_queue(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_extractions_document_id ON public.document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_user_id ON public.document_extractions(user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_document_matches_document_id ON public.transaction_document_matches(document_id);
CREATE INDEX IF NOT EXISTS idx_transaction_document_matches_transaction_id ON public.transaction_document_matches(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_document_matches_user_id ON public.transaction_document_matches(user_id);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON public.vendor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_normalized ON public.vendor_profiles(vendor_name_normalized);

CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_user_id ON public.reconciliation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_status ON public.reconciliation_queue(queue_status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_priority ON public.reconciliation_queue(priority DESC);

CREATE INDEX IF NOT EXISTS idx_reconciliation_audit_log_performed_by ON public.reconciliation_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_reconciliation_audit_log_action ON public.reconciliation_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_reconciliation_audit_log_created_at ON public.reconciliation_audit_log(created_at DESC);

-- ============================================================================
-- DONE - RLS policies will be added in a separate script
-- ============================================================================

SELECT 'Document management tables created successfully! RLS policies not yet enabled.' AS status;
