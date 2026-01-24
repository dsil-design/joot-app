-- Migration: create_statement_uploads_storage_bucket
-- Created: 2026-01-12
-- Description: Create Supabase Storage bucket for statement file uploads
-- Task: P2-003

BEGIN;

-- ============================================================================
-- STORAGE BUCKET: statement-uploads (private)
-- ============================================================================
-- This bucket stores uploaded statement files (PDF, PNG, JPG, JPEG, HEIC)
-- Files are stored at path: {user_id}/{upload_id}.{ext}
-- Files are kept forever (no automatic expiration)

-- Create the bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'statement-uploads',
  'statement-uploads',
  false,  -- Private bucket: requires authentication for all access
  10485760,  -- 10MB file size limit (10 * 1024 * 1024)
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/heic'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR storage.objects
-- ============================================================================
-- Users can only access files in their own folder (user_id prefix)

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload own statement files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'statement-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view/download their own files
CREATE POLICY "Users can view own statement files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'statement-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own statement files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'statement-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own statement files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'statement-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================

-- Function to generate storage path for a statement upload
CREATE OR REPLACE FUNCTION public.get_statement_upload_path(
  p_user_id UUID,
  p_upload_id UUID,
  p_file_extension TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN p_user_id::text || '/' || p_upload_id::text || '.' || LOWER(p_file_extension);
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_statement_upload_path IS
  'Generates the storage path for a statement upload file: {user_id}/{upload_id}.{ext}';

COMMIT;
