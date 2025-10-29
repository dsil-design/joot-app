-- Migration: Storage Bucket RLS Policies
-- Created: 2025-10-29
-- Description: Row Level Security policies for document management storage buckets

-- ============================================================================
-- STORAGE BUCKET: documents (private)
-- ============================================================================
-- Users can only access their own documents

-- Policy: Users can upload documents to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view/download their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STORAGE BUCKET: thumbnails (public)
-- ============================================================================
-- Public read, authenticated users can upload/manage their own

-- Policy: Anyone can view thumbnails (bucket is public)
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Policy: Authenticated users can upload thumbnails to their own folder
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own thumbnails
CREATE POLICY "Users can update own thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STORAGE BUCKET: vendor-logos (public)
-- ============================================================================
-- Public read, authenticated users can upload (shared across all users)

-- Policy: Anyone can view vendor logos (bucket is public)
CREATE POLICY "Anyone can view vendor logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vendor-logos');

-- Policy: Authenticated users can upload vendor logos
CREATE POLICY "Users can upload vendor logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-logos');

-- Policy: Authenticated users can update vendor logos
CREATE POLICY "Users can update vendor logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vendor-logos');

-- Policy: Only service role can delete vendor logos (prevent accidental deletion)
CREATE POLICY "Service role can delete vendor logos"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'vendor-logos');

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
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Users can upload own documents" ON storage.objects IS
'Allows authenticated users to upload documents to their user folder in the documents bucket';

COMMENT ON POLICY "Users can view own documents" ON storage.objects IS
'Allows authenticated users to view and download only their own documents';

COMMENT ON POLICY "Anyone can view thumbnails" ON storage.objects IS
'Public read access to thumbnails bucket for fast loading';

COMMENT ON POLICY "Anyone can view vendor logos" ON storage.objects IS
'Public read access to vendor logos for display across the app';

COMMENT ON FUNCTION get_document_storage_path IS
'Generate consistent storage path for document files: {user_id}/{document_id}.{ext}';

COMMENT ON FUNCTION get_thumbnail_storage_path IS
'Generate consistent storage path for thumbnail files: {user_id}/{document_id}.jpg';

COMMENT ON FUNCTION get_vendor_logo_path IS
'Generate consistent storage path for vendor logos: vendors/{vendor_id}.{ext}';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify policies are applied:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- To test document upload path:
-- SELECT get_document_storage_path('user-uuid-here', 'doc-uuid-here', 'pdf');

-- To test thumbnail path:
-- SELECT get_thumbnail_storage_path('user-uuid-here', 'doc-uuid-here');

-- To test vendor logo path:
-- SELECT get_vendor_logo_path('vendor-uuid-here', 'png');
