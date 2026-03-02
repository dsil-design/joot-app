-- Migration: add_email_body_columns
-- Created: 2026-03-02 16:15:41
-- Add email body columns to store parsed MIME content
-- NULL = never fetched, '' = fetched but unparseable/empty

BEGIN;

ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS text_body TEXT;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS html_body TEXT;

-- Partial index for efficient backfill resumability queries
-- Only indexes rows where both body columns are NULL (never fetched)
CREATE INDEX IF NOT EXISTS idx_emails_missing_body
  ON public.emails(user_id, uid)
  WHERE text_body IS NULL AND html_body IS NULL;

COMMIT;
