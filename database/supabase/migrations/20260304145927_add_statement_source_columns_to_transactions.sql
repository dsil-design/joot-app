-- Migration: add_statement_source_columns_to_transactions
-- Created: 2026-03-04 14:59:27

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source_statement_upload_id UUID
    REFERENCES public.statement_uploads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_statement_suggestion_index INTEGER,
  ADD COLUMN IF NOT EXISTS source_statement_match_confidence INTEGER
    CHECK (
      source_statement_match_confidence IS NULL
      OR (source_statement_match_confidence >= 0 AND source_statement_match_confidence <= 100)
    );

CREATE INDEX IF NOT EXISTS idx_transactions_source_statement
  ON public.transactions(source_statement_upload_id)
  WHERE source_statement_upload_id IS NOT NULL;
