-- Check all document management tables and their columns
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'documents',
    'document_extractions',
    'transaction_document_matches',
    'vendor_profiles',
    'reconciliation_queue',
    'reconciliation_audit_log'
  )
ORDER BY c.table_name, c.ordinal_position;
