-- Migration: Add Email Receipt Support
-- Created: 2025-11-04
-- Description: Extends document processing to support email receipts (HTML body)
--              Adds source_type tracking and email metadata storage

-- ============================================================================
-- 1. ADD SOURCE_TYPE TO DOCUMENT_EXTRACTIONS
-- ============================================================================
-- Track whether data came from attachment or email body

ALTER TABLE public.document_extractions
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'attachment';

-- Values: 'attachment', 'email_body'
COMMENT ON COLUMN public.document_extractions.source_type IS
'Source of extraction: attachment (PDF/image) or email_body (HTML receipt)';

-- Add index for filtering by source type
CREATE INDEX IF NOT EXISTS idx_extractions_source_type
ON public.document_extractions(source_type);

-- ============================================================================
-- 2. ADD EMAIL_METADATA TO DOCUMENT_EXTRACTIONS
-- ============================================================================
-- Store email-specific metadata (sender, subject, domain, date)

ALTER TABLE public.document_extractions
ADD COLUMN IF NOT EXISTS email_metadata JSONB;

COMMENT ON COLUMN public.document_extractions.email_metadata IS
'Email-specific metadata: sender, sender_domain, subject, email_date, message_id, email_hash';

-- Example structure:
-- {
--   "sender": "orders@amazon.com",
--   "sender_domain": "amazon.com",
--   "subject": "Your Amazon.com order confirmation",
--   "email_date": "2025-11-04T10:30:00Z",
--   "message_id": "<abc123@amazon.com>",
--   "email_hash": "sha256hash..."
-- }

-- Add GIN index for email metadata queries
CREATE INDEX IF NOT EXISTS idx_extractions_email_metadata
ON public.document_extractions USING gin (email_metadata);

-- ============================================================================
-- 3. ADD STRUCTURED_TEXT TO DOCUMENT_EXTRACTIONS
-- ============================================================================
-- Store HTML converted to Markdown for better AI understanding

ALTER TABLE public.document_extractions
ADD COLUMN IF NOT EXISTS structured_text TEXT;

COMMENT ON COLUMN public.document_extractions.structured_text IS
'Email HTML converted to Markdown with preserved structure (tables, headers)';

-- ============================================================================
-- 4. ADD PROCESSING_METADATA TO DOCUMENTS
-- ============================================================================
-- Track email-specific processing flags

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS processing_metadata JSONB;

COMMENT ON COLUMN public.documents.processing_metadata IS
'Processing metadata: has_attachments, is_receipt_candidate, sender info, detection_score';

-- Example structure:
-- {
--   "has_attachments": true,
--   "is_receipt_candidate": true,
--   "sender": "orders@amazon.com",
--   "sender_domain": "amazon.com",
--   "email_subject": "Your order confirmation",
--   "detection_score": 95,
--   "email_hash": "sha256hash..."
-- }

-- Add GIN index for processing metadata
CREATE INDEX IF NOT EXISTS idx_documents_processing_metadata
ON public.documents USING gin (processing_metadata);

-- ============================================================================
-- 5. UPDATE DOCUMENT FILE_TYPE ENUM (if using enum)
-- ============================================================================
-- If file_type is stored as text, no changes needed
-- Values already include: 'pdf', 'image', 'email'

-- Add comment for clarity
COMMENT ON COLUMN public.documents.file_type IS
'Document type: pdf, image, email (for .eml files)';

-- ============================================================================
-- 6. ADD HELPER FUNCTION: GET EMAIL RECEIPTS
-- ============================================================================
-- Function to get all processed email receipts for a user

CREATE OR REPLACE FUNCTION get_email_receipts(p_user_id UUID)
RETURNS TABLE (
  document_id UUID,
  file_name TEXT,
  sender TEXT,
  sender_domain TEXT,
  email_subject TEXT,
  merchant_name TEXT,
  amount DECIMAL,
  currency TEXT,
  transaction_date DATE,
  is_receipt_candidate BOOLEAN,
  detection_score INT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.file_name,
    (d.processing_metadata->>'sender')::TEXT,
    (d.processing_metadata->>'sender_domain')::TEXT,
    (d.processing_metadata->>'email_subject')::TEXT,
    de.merchant_name,
    de.amount,
    de.currency,
    de.transaction_date,
    (d.processing_metadata->>'is_receipt_candidate')::BOOLEAN,
    (d.processing_metadata->>'detection_score')::INT,
    d.created_at
  FROM public.documents d
  LEFT JOIN public.document_extractions de ON d.id = de.document_id
  WHERE d.user_id = p_user_id
    AND d.file_type = 'email'
    AND de.source_type = 'email_body'
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_email_receipts(UUID) IS
'Get all email receipts (HTML body) processed for a user';

-- ============================================================================
-- 7. ADD HELPER FUNCTION: CHECK DUPLICATE EMAIL
-- ============================================================================
-- Function to check if email already exists by hash

CREATE OR REPLACE FUNCTION check_duplicate_email(
  p_user_id UUID,
  p_email_hash TEXT
) RETURNS TABLE (
  document_id UUID,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.file_name,
    d.created_at
  FROM public.documents d
  WHERE d.user_id = p_user_id
    AND d.processing_metadata->>'email_hash' = p_email_hash
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_duplicate_email(UUID, TEXT) IS
'Check if email with given hash already exists for user (deduplication)';

-- ============================================================================
-- 8. UPDATE EXISTING DATA (if needed)
-- ============================================================================
-- Set source_type to 'attachment' for existing records

UPDATE public.document_extractions
SET source_type = 'attachment'
WHERE source_type IS NULL;

-- ============================================================================
-- 9. ADD VALIDATION CONSTRAINTS
-- ============================================================================
-- Ensure source_type has valid values

ALTER TABLE public.document_extractions
ADD CONSTRAINT chk_source_type
CHECK (source_type IN ('attachment', 'email_body'));

-- ============================================================================
-- 10. UPDATE RLS POLICIES (if needed)
-- ============================================================================
-- RLS policies should already cover these new columns
-- No changes needed since we're just adding columns to existing tables

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

-- New columns added:
-- ✓ document_extractions.source_type (TEXT)
-- ✓ document_extractions.email_metadata (JSONB)
-- ✓ document_extractions.structured_text (TEXT)
-- ✓ documents.processing_metadata (JSONB)

-- New indexes:
-- ✓ idx_extractions_source_type
-- ✓ idx_extractions_email_metadata (GIN)
-- ✓ idx_documents_processing_metadata (GIN)

-- New functions:
-- ✓ get_email_receipts(user_id)
-- ✓ check_duplicate_email(user_id, email_hash)

-- Constraints:
-- ✓ chk_source_type (validates source_type values)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- To rollback this migration:
--
-- DROP FUNCTION IF EXISTS get_email_receipts(UUID);
-- DROP FUNCTION IF EXISTS check_duplicate_email(UUID, TEXT);
--
-- ALTER TABLE public.document_extractions DROP CONSTRAINT IF EXISTS chk_source_type;
--
-- DROP INDEX IF EXISTS idx_extractions_source_type;
-- DROP INDEX IF EXISTS idx_extractions_email_metadata;
-- DROP INDEX IF EXISTS idx_documents_processing_metadata;
--
-- ALTER TABLE public.document_extractions DROP COLUMN IF EXISTS structured_text;
-- ALTER TABLE public.document_extractions DROP COLUMN IF EXISTS email_metadata;
-- ALTER TABLE public.document_extractions DROP COLUMN IF EXISTS source_type;
-- ALTER TABLE public.documents DROP COLUMN IF EXISTS processing_metadata;
