-- Migration: Storage Bucket RLS Policies (Supabase Compatible)
-- Created: 2025-10-29
-- Description: Row Level Security policies for document management storage buckets
-- Note: This version uses Supabase's storage policy functions

-- ============================================================================
-- STORAGE BUCKET: documents (private)
-- ============================================================================

-- Policy: Users can upload documents to their own folder
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
SELECT 'documents', '', auth.uid(), '{}'::jsonb
WHERE false; -- This is just to set up the policy structure

-- Use Supabase's storage policy helpers
DO $$
BEGIN
  -- Check if policies already exist before creating
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'documents' AND name = 'Users can upload own documents'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'documents',
      'Users can upload own documents',
      '(bucket_id = ''documents'' AND (storage.foldername(name))[1] = auth.uid()::text)'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'documents' AND name = 'Users can view own documents'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'documents',
      'Users can view own documents',
      '(bucket_id = ''documents'' AND (storage.foldername(name))[1] = auth.uid()::text)'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'documents' AND name = 'Users can update own documents'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'documents',
      'Users can update own documents',
      '(bucket_id = ''documents'' AND (storage.foldername(name))[1] = auth.uid()::text)'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'documents' AND name = 'Users can delete own documents'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'documents',
      'Users can delete own documents',
      '(bucket_id = ''documents'' AND (storage.foldername(name))[1] = auth.uid()::text)'
    );
  END IF;
END $$;

-- ============================================================================
-- STORAGE BUCKET: thumbnails (public)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'thumbnails' AND name = 'Anyone can view thumbnails'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'thumbnails',
      'Anyone can view thumbnails',
      '(bucket_id = ''thumbnails'')'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'thumbnails' AND name = 'Users can upload own thumbnails'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'thumbnails',
      'Users can upload own thumbnails',
      '(bucket_id = ''thumbnails'' AND (storage.foldername(name))[1] = auth.uid()::text)'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'thumbnails' AND name = 'Users can update own thumbnails'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'thumbnails',
      'Users can update own thumbnails',
      '(bucket_id = ''thumbnails'' AND (storage.foldername(name))[1] = auth.uid()::text)'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'thumbnails' AND name = 'Users can delete own thumbnails'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'thumbnails',
      'Users can delete own thumbnails',
      '(bucket_id = ''thumbnails'' AND (storage.foldername(name))[1] = auth.uid()::text)'
    );
  END IF;
END $$;

-- ============================================================================
-- STORAGE BUCKET: vendor-logos (public)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'vendor-logos' AND name = 'Anyone can view vendor logos'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'vendor-logos',
      'Anyone can view vendor logos',
      '(bucket_id = ''vendor-logos'')'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'vendor-logos' AND name = 'Users can upload vendor logos'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'vendor-logos',
      'Users can upload vendor logos',
      '(bucket_id = ''vendor-logos'')'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'vendor-logos' AND name = 'Users can update vendor logos'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      'vendor-logos',
      'Users can update vendor logos',
      '(bucket_id = ''vendor-logos'')'
    );
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS FOR STORAGE
-- ============================================================================

-- Function to get storage path for a document
CREATE OR REPLACE FUNCTION get_document_storage_path(
  p_user_id UUID,
  p_document_id UUID,
  p_file_extension TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN p_user_id::text || '/' || p_document_id::text || '.' || p_file_extension;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get thumbnail path for a document
CREATE OR REPLACE FUNCTION get_thumbnail_storage_path(
  p_user_id UUID,
  p_document_id UUID
)
RETURNS TEXT AS $$
BEGIN
  RETURN p_user_id::text || '/' || p_document_id::text || '.jpg';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get vendor logo path
CREATE OR REPLACE FUNCTION get_vendor_logo_path(
  p_vendor_id UUID,
  p_file_extension TEXT DEFAULT 'png'
)
RETURNS TEXT AS $$
BEGIN
  RETURN 'vendors/' || p_vendor_id::text || '.' || p_file_extension;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- To verify policies were created:
-- SELECT bucket_id, name, definition FROM storage.policies ORDER BY bucket_id, name;
