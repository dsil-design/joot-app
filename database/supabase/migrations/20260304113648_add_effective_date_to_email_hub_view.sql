-- Migration: add_effective_date_to_email_hub_view
-- Created: 2026-03-04 11:36:48
-- Adds effective_date computed column to email_hub_unified view
-- Uses transaction_date when available, falls back to email date
-- This fixes date range filtering excluding unprocessed emails

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
  (et.id IS NOT NULL) AS is_processed,
  COALESCE(et.transaction_date, e.date::date) AS effective_date
FROM public.emails e
LEFT JOIN public.email_transactions et
  ON e.message_id = et.message_id
  AND e.user_id = et.user_id;

COMMIT;
