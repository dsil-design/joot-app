-- Migration: add_is_import_source_to_payment_methods
-- Created: 2026-03-28 08:59:38

BEGIN;

-- Add is_import_source flag to payment_methods
-- When false, the payment method won't appear as an option for uploading statements
ALTER TABLE public.payment_methods
  ADD COLUMN is_import_source BOOLEAN NOT NULL DEFAULT true;

COMMIT;
