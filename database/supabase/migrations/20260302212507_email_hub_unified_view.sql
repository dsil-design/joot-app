-- Migration: email_hub_unified_view
-- Created: 2026-03-02 21:25:07
-- Unified view joining emails with email_transactions
-- Shows all emails with their extraction status (if any)
-- security_invoker = true ensures RLS policies on underlying tables are respected

BEGIN;

CREATE OR REPLACE VIEW public.email_hub_unified
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.user_id,
  e.message_id,
  e.uid,
  e.folder,
  e.subject,
  e.from_address,
  e.from_name,
  e.date AS email_date,
  e.seen,
  e.has_attachments,
  e.synced_at,
  e.created_at,
  et.id AS email_transaction_id,
  et.vendor_id,
  et.vendor_name_raw,
  et.amount,
  et.currency,
  et.transaction_date,
  et.description,
  et.order_id,
  et.matched_transaction_id,
  et.match_confidence,
  et.match_method,
  COALESCE(et.status, 'unprocessed') AS status,
  et.classification,
  et.extraction_confidence,
  et.extraction_notes,
  et.processed_at,
  et.matched_at,
  et.updated_at,
  (et.id IS NOT NULL) AS is_processed
FROM public.emails e
LEFT JOIN public.email_transactions et
  ON e.message_id = et.message_id
  AND e.user_id = et.user_id;

COMMIT;
