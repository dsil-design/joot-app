-- ============================================================================
-- Fix Document Management Schema to Match Code Expectations
-- ============================================================================

-- 1. Add missing columns to documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(5,2);

-- Update existing rows
UPDATE public.documents
SET
  mime_type = COALESCE(mime_type, file_type),
  storage_path = COALESCE(storage_path, user_id::text || '/' || id::text)
WHERE mime_type IS NULL OR storage_path IS NULL;

-- 2. Add missing columns to document_extractions table
ALTER TABLE public.document_extractions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS merchant_name TEXT,
  ADD COLUMN IF NOT EXISTS merchant_name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2);

-- Populate user_id from documents table
UPDATE public.document_extractions de
SET user_id = d.user_id
FROM public.documents d
WHERE de.document_id = d.id AND de.user_id IS NULL;

-- Copy vendor_name to merchant_name for consistency
UPDATE public.document_extractions
SET
  merchant_name = COALESCE(merchant_name, vendor_name),
  merchant_name_normalized = COALESCE(merchant_name_normalized, LOWER(TRIM(vendor_name)))
WHERE merchant_name IS NULL AND vendor_name IS NOT NULL;

-- 3. Add missing columns to transaction_document_matches table
ALTER TABLE public.transaction_document_matches
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS match_confidence DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS match_score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Populate user_id from documents table
UPDATE public.transaction_document_matches tdm
SET user_id = d.user_id
FROM public.documents d
WHERE tdm.document_id = d.id AND tdm.user_id IS NULL;

-- Copy confidence_score to match_confidence
UPDATE public.transaction_document_matches
SET match_confidence = confidence_score
WHERE match_confidence IS NULL;

-- 4. Add missing columns to vendor_profiles table
ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS vendor_name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Copy name columns to vendor_name columns
UPDATE public.vendor_profiles
SET
  vendor_name = COALESCE(vendor_name, name),
  vendor_name_normalized = COALESCE(vendor_name_normalized, normalized_name),
  website = COALESCE(website, domain)
WHERE vendor_name IS NULL;

-- 5. Add missing columns to reconciliation_queue table
ALTER TABLE public.reconciliation_queue
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS queue_status TEXT,
  ADD COLUMN IF NOT EXISTS suggested_matches JSONB,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Populate user_id from documents table
UPDATE public.reconciliation_queue rq
SET user_id = d.user_id
FROM public.documents d
WHERE rq.document_id = d.id AND rq.user_id IS NULL;

-- Copy status to queue_status
UPDATE public.reconciliation_queue
SET queue_status = status
WHERE queue_status IS NULL;

-- Change priority from TEXT to INTEGER if needed (skip if already INTEGER)
-- We'll keep it as TEXT for now since changing types is risky

-- 6. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_document_extractions_user_id ON public.document_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_document_matches_user_id ON public.transaction_document_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_user_id ON public.reconciliation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_queue_status ON public.reconciliation_queue(queue_status);
