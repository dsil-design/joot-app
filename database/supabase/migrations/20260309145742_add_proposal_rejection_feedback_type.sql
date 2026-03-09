-- Migration: add_proposal_rejection_feedback_type
-- Created: 2026-03-09 14:57:42

BEGIN;

-- Add 'proposal_rejection' to the ai_feedback feedback_type CHECK constraint
ALTER TABLE public.ai_feedback
  DROP CONSTRAINT IF EXISTS ai_feedback_feedback_type_check;

ALTER TABLE public.ai_feedback
  ADD CONSTRAINT ai_feedback_feedback_type_check CHECK (feedback_type IN (
    'classification_change',
    'skip_override',
    'extraction_correction',
    'undo_skip',
    'skip_reason',
    'proposal_correction',
    'proposal_rejection'
  ));

COMMIT;
