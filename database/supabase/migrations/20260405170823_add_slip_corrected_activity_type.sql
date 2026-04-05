-- Migration: add_slip_corrected_activity_type
-- Created: 2026-04-05 17:08:23
-- Adds 'slip_corrected' activity type for tracking manual user corrections
-- to AI-extracted payment slip data, feeding the learning pipeline.

BEGIN;

ALTER TABLE public.import_activities
  DROP CONSTRAINT IF EXISTS import_activities_activity_type_check;

ALTER TABLE public.import_activities
  ADD CONSTRAINT import_activities_activity_type_check CHECK (activity_type IN (
    'email_sync',
    'email_extracted',
    'statement_uploaded',
    'statement_processed',
    'transaction_matched',
    'transaction_imported',
    'transaction_skipped',
    'batch_import',
    'sync_error',
    'extraction_error',
    'slip_uploaded',
    'slip_processed',
    'slip_corrected'
  ));

COMMIT;
