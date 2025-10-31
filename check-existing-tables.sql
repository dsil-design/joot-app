-- Check if document management tables already exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'documents',
    'document_extractions',
    'transaction_document_matches',
    'vendor_profiles',
    'reconciliation_queue',
    'reconciliation_audit_log'
  )
ORDER BY table_name;

-- Also check what columns the documents table has if it exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'documents'
ORDER BY ordinal_position;
