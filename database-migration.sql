-- ============================================
-- Document Management Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create Tables
-- ============================================

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document extractions table
CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  raw_text TEXT,
  ocr_confidence FLOAT,
  vendor_name TEXT,
  amount FLOAT,
  currency TEXT,
  transaction_date DATE,
  extraction_confidence FLOAT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id)
);

-- Transaction document matches table
CREATE TABLE IF NOT EXISTS transaction_document_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  confidence_score FLOAT NOT NULL,
  match_type TEXT NOT NULL,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  matched_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor profiles table
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  domain TEXT,
  logo_url TEXT,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, normalized_name)
);

-- Reconciliation queue table
CREATE TABLE IF NOT EXISTS reconciliation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending_review',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id)
);

-- Reconciliation audit log table
CREATE TABLE IF NOT EXISTS reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID NOT NULL REFERENCES reconciliation_queue(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_document_extractions_document_id ON document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_matches_document_id ON transaction_document_matches(document_id);
CREATE INDEX IF NOT EXISTS idx_matches_transaction_id ON transaction_document_matches(transaction_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON vendor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_status ON reconciliation_queue(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_document_id ON reconciliation_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_document_id ON reconciliation_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON reconciliation_audit_log(performed_by);

-- Step 3: Enable Row Level Security
-- ============================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_document_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies for Documents
-- ============================================

CREATE POLICY "Users can view their own documents"
ON documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON documents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 5: Create RLS Policies for Document Extractions
-- ============================================

CREATE POLICY "Users can view extractions for their documents"
ON document_extractions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_extractions.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert extractions for their documents"
ON document_extractions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_extractions.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update extractions for their documents"
ON document_extractions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_extractions.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Step 6: Create RLS Policies for Transaction Matches
-- ============================================

CREATE POLICY "Users can view matches for their documents"
ON transaction_document_matches FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = transaction_document_matches.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert matches for their documents"
ON transaction_document_matches FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = transaction_document_matches.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update matches for their documents"
ON transaction_document_matches FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = transaction_document_matches.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete matches for their documents"
ON transaction_document_matches FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = transaction_document_matches.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Step 7: Create RLS Policies for Vendor Profiles
-- ============================================

CREATE POLICY "Users can view their own vendor profiles"
ON vendor_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendor profiles"
ON vendor_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendor profiles"
ON vendor_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Step 8: Create RLS Policies for Reconciliation Queue
-- ============================================

CREATE POLICY "Users can view queue items for their documents"
ON reconciliation_queue FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_queue.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert queue items for their documents"
ON reconciliation_queue FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_queue.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update queue items for their documents"
ON reconciliation_queue FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_queue.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Step 9: Create RLS Policies for Audit Log
-- ============================================

CREATE POLICY "Users can view audit log for their documents"
ON reconciliation_audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_audit_log.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert audit log for their documents"
ON reconciliation_audit_log FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_audit_log.document_id
    AND documents.user_id = auth.uid()
  )
);

-- ============================================
-- Migration Complete!
-- ============================================
--
-- Next Steps:
-- 1. Create storage buckets in Supabase UI:
--    - documents (private)
--    - vendor-logos (public)
-- 2. Set up storage policies (see PRODUCTION-DEPLOYMENT-CHECKLIST.md)
-- 3. Add GEMINI_API_KEY to Vercel environment variables
-- 4. Deploy to production!
