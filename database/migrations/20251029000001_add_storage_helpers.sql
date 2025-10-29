-- Migration: Storage Helper Functions
-- Created: 2025-10-29
-- Description: Helper functions for generating consistent storage paths
-- Note: Storage bucket policies must be configured via Supabase Dashboard

-- ============================================================================
-- HELPER FUNCTIONS FOR STORAGE PATHS
-- ============================================================================

-- Function to get storage path for a document
-- Example: get_document_storage_path('user-uuid', 'doc-uuid', 'pdf')
--   Returns: 'user-uuid/doc-uuid.pdf'
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

COMMENT ON FUNCTION get_document_storage_path IS
'Generate consistent storage path for document files: {user_id}/{document_id}.{ext}';

-- Function to get thumbnail path for a document
-- Example: get_thumbnail_storage_path('user-uuid', 'doc-uuid')
--   Returns: 'user-uuid/doc-uuid.jpg'
CREATE OR REPLACE FUNCTION get_thumbnail_storage_path(
  p_user_id UUID,
  p_document_id UUID
)
RETURNS TEXT AS $$
BEGIN
  RETURN p_user_id::text || '/' || p_document_id::text || '.jpg';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_thumbnail_storage_path IS
'Generate consistent storage path for thumbnail files: {user_id}/{document_id}.jpg';

-- Function to get vendor logo path
-- Example: get_vendor_logo_path('vendor-uuid', 'png')
--   Returns: 'vendors/vendor-uuid.png'
CREATE OR REPLACE FUNCTION get_vendor_logo_path(
  p_vendor_id UUID,
  p_file_extension TEXT DEFAULT 'png'
)
RETURNS TEXT AS $$
BEGIN
  RETURN 'vendors/' || p_vendor_id::text || '.' || p_file_extension;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_vendor_logo_path IS
'Generate consistent storage path for vendor logos: vendors/{vendor_id}.{ext}';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the helper functions
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  test_doc_id UUID := '00000000-0000-0000-0000-000000000002';
  test_vendor_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN
  RAISE NOTICE 'Document path: %', get_document_storage_path(test_user_id, test_doc_id, 'pdf');
  RAISE NOTICE 'Thumbnail path: %', get_thumbnail_storage_path(test_user_id, test_doc_id);
  RAISE NOTICE 'Vendor logo path: %', get_vendor_logo_path(test_vendor_id, 'png');
END $$;
