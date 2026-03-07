-- Migration: fix_statement_done_status_logic
-- Created: 2026-03-07 11:16:08
--
-- Fix: 'done' should only apply when ALL suggestions are linked to a
-- transaction (status = 'approved' AND matched_transaction_id is set).
-- Rejected/dismissed suggestions don't count — the transaction still
-- needs to be accounted for.

BEGIN;

-- Re-evaluate statements currently marked 'done' that aren't 100% linked.
-- A statement is only 'done' if every suggestion has status='approved'
-- AND a matched_transaction_id.
UPDATE public.statement_uploads
SET status = CASE
  -- If any suggestion has been acted on → 'in_review'
  WHEN (
    SELECT bool_or(
      (s->>'status') IN ('approved', 'rejected')
    )
    FROM jsonb_array_elements(
      COALESCE(extraction_log->'suggestions', '[]'::jsonb)
    ) AS s
    WHERE jsonb_array_length(COALESCE(extraction_log->'suggestions', '[]'::jsonb)) > 0
  ) = true THEN 'in_review'
  ELSE 'ready_for_review'
END
WHERE status = 'done'
  -- Only downgrade if NOT all suggestions are approved with a matched transaction
  AND NOT (
    SELECT bool_and(
      (s->>'status') = 'approved'
      AND (s->>'matched_transaction_id') IS NOT NULL
      AND (s->>'matched_transaction_id') <> ''
    )
    FROM jsonb_array_elements(
      COALESCE(extraction_log->'suggestions', '[]'::jsonb)
    ) AS s
    WHERE jsonb_array_length(COALESCE(extraction_log->'suggestions', '[]'::jsonb)) > 0
  );

COMMIT;
