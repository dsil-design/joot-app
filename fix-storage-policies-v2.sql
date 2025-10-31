-- ============================================================================
-- STORAGE BUCKET POLICIES FIX V2
-- ============================================================================
-- This fixes storage policies by dropping ALL existing policies first
-- and creating new ones with unique names

-- ============================================================================
-- 1. Drop ALL existing storage policies (clean slate)
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- 2. Create storage buckets (if they don't exist)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-logos', 'vendor-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================================================
-- 3. Create storage policies for 'documents' bucket
-- ============================================================================

CREATE POLICY "documents_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "documents_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "documents_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "documents_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 4. Create storage policies for 'thumbnails' bucket
-- ============================================================================

CREATE POLICY "thumbnails_select_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

CREATE POLICY "thumbnails_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "thumbnails_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 5. Create storage policies for 'vendor-logos' bucket
-- ============================================================================

CREATE POLICY "vendor_logos_select_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vendor-logos');

CREATE POLICY "vendor_logos_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-logos');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check buckets
SELECT 'Buckets created:' as status;
SELECT id, name, public FROM storage.buckets
WHERE id IN ('documents', 'thumbnails', 'vendor-logos');

-- Check policies
SELECT 'Storage policies created:' as status;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
