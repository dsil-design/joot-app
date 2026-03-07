-- Migration: backfill_original_matched_transaction_id
-- Created: 2026-03-07 11:27:37
--
-- Backfill original_matched_transaction_id on existing suggestions.
-- For suggestions that already have a matched_transaction_id, copy it
-- to original_matched_transaction_id so the "Auto" indicator works
-- for historically processed statements.

BEGIN;

UPDATE public.statement_uploads
SET extraction_log = jsonb_set(
  extraction_log,
  '{suggestions}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (s->>'matched_transaction_id') IS NOT NULL
             AND (s->>'matched_transaction_id') <> ''
             AND (s->>'original_matched_transaction_id') IS NULL
        THEN s || jsonb_build_object('original_matched_transaction_id', s->>'matched_transaction_id')
        ELSE s
      END
    )
    FROM jsonb_array_elements(
      COALESCE(extraction_log->'suggestions', '[]'::jsonb)
    ) AS s
  )
)
WHERE extraction_log->'suggestions' IS NOT NULL
  AND jsonb_array_length(COALESCE(extraction_log->'suggestions', '[]'::jsonb)) > 0;

COMMIT;
