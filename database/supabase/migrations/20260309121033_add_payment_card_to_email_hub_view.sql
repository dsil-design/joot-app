-- Migration: add_payment_card_to_email_hub_view
-- Created: 2026-03-09 12:10:33
-- Add payment card columns to the email_hub_unified view
-- Must DROP and recreate because new columns change column ordering

BEGIN;

DROP VIEW IF EXISTS public.email_hub_unified;

CREATE VIEW public.email_hub_unified
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
  et.payment_card_last_four,
  et.payment_card_type,
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
  COALESCE(et.transaction_date, e.date::date) AS effective_date,
  -- AI classification columns
  et.ai_classification,
  et.ai_suggested_skip,
  et.ai_reasoning,
  et.parser_key,
  et.email_group_id,
  et.is_group_primary,
  eg.email_count AS group_email_count
FROM public.emails e
LEFT JOIN public.email_transactions et
  ON e.message_id = et.message_id
  AND e.user_id = et.user_id
LEFT JOIN public.email_groups eg
  ON et.email_group_id = eg.id;

COMMIT;
