-- Check if RLS is enabled on documents table
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'documents';

-- Check policies on documents table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as qual_condition,
  with_check::text as with_check_condition
FROM pg_policies
WHERE tablename = 'documents'
ORDER BY policyname;
