-- Migration: update_statement_status_values
-- Created: 2026-03-07 11:04:19
--
-- Update statement_uploads status values to reflect the full user workflow:
--   pending          → Uploaded, not yet processed
--   processing       → Currently being processed (extracting transactions)
--   ready_for_review → Processing finished, transactions need user review
--   in_review        → User has started reviewing/linking but isn't done
--   done             → All transactions accounted for (linked, created, or dismissed)
--   failed           → Processing failed

BEGIN;

-- 1. Drop the existing CHECK constraint
ALTER TABLE public.statement_uploads DROP CONSTRAINT IF EXISTS statement_uploads_status_check;

-- 2. Migrate existing 'completed' rows based on whether all suggestions are resolved
-- If all suggestions have been resolved → 'done'
-- If some suggestions have been resolved → 'in_review'
-- Otherwise → 'ready_for_review'
UPDATE public.statement_uploads
SET status = CASE
  WHEN (
    SELECT bool_and(
      (s->>'status') IN ('approved', 'rejected')
    )
    FROM jsonb_array_elements(
      COALESCE(extraction_log->'suggestions', '[]'::jsonb)
    ) AS s
    WHERE jsonb_array_length(COALESCE(extraction_log->'suggestions', '[]'::jsonb)) > 0
  ) = true THEN 'done'
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
WHERE status = 'completed';

-- 3. Add the new CHECK constraint with all six values
ALTER TABLE public.statement_uploads
ADD CONSTRAINT statement_uploads_status_check
CHECK (status IN (
  'pending',
  'processing',
  'ready_for_review',
  'in_review',
  'done',
  'failed'
));

COMMIT;
