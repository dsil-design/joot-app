-- ============================================================================
-- STORAGE BUCKET POLICIES FIX
-- ============================================================================
-- This SQL creates the storage buckets and applies RLS policies
-- so users can upload documents

-- ============================================================================
-- 1. Create storage buckets (if they don't exist)
-- ============================================================================

-- Create 'documents' bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create 'thumbnails' bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'vendor-logos' bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-logos', 'vendor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Apply RLS policies for 'documents' bucket
-- ============================================================================

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- Policy: Users can upload documents to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own documents
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
-- 3. Apply RLS policies for 'thumbnails' bucket (public read)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own thumbnails" ON storage.objects;

-- Policy: Anyone can view thumbnails
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Policy: Users can upload their own thumbnails
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
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
-- 4. Apply RLS policies for 'vendor-logos' bucket (public)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view vendor logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vendor logos" ON storage.objects;

-- Policy: Anyone can view vendor logos
CREATE POLICY "Anyone can view vendor logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vendor-logos');

-- Policy: Authenticated users can upload vendor logos
CREATE POLICY "Authenticated users can upload vendor logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-logos');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that buckets were created
SELECT id, name, public FROM storage.buckets
WHERE id IN ('documents', 'thumbnails', 'vendor-logos');

-- Check that policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
