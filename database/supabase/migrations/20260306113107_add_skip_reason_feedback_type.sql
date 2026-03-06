-- Migration: add_skip_reason_feedback_type
-- Created: 2026-03-06 11:31:07

BEGIN;

-- Add 'skip_reason' to ai_feedback.feedback_type CHECK constraint
ALTER TABLE public.ai_feedback
  DROP CONSTRAINT IF EXISTS ai_feedback_feedback_type_check;

ALTER TABLE public.ai_feedback
  ADD CONSTRAINT ai_feedback_feedback_type_check
  CHECK (feedback_type IN (
    'classification_change',
    'skip_override',
    'extraction_correction',
    'undo_skip',
    'skip_reason'
  ));

COMMIT;
