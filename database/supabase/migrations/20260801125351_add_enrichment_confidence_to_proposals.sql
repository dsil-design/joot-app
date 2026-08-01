-- Migration: add_enrichment_confidence_to_proposals
-- Created: 2026-08-01
--
-- Splits proposal confidence into two numbers that must never be merged:
--
--   * Match confidence (already on the queue item) — do independent sources
--     agree on date and amount? The only signal bulk approval may gate on.
--   * Enrichment confidence (this column) — vendor, description, and tags
--     only: the fields the engine actually guesses. The old
--     overall_confidence blended amount/currency/date (which score 95-100
--     by construction) into the composite, so a proposal with an inverted
--     sign scored 82 while a fully-correct one scored 91 — no threshold
--     could separate right from wrong.
--
-- overall_confidence is retained for backward compatibility but is no
-- longer the number the UI leads with.

BEGIN;

ALTER TABLE public.transaction_proposals
  ADD COLUMN IF NOT EXISTS enrichment_confidence INTEGER
  CHECK (enrichment_confidence IS NULL OR (enrichment_confidence >= 0 AND enrichment_confidence <= 100));

COMMENT ON COLUMN public.transaction_proposals.enrichment_confidence IS
  'Confidence in the guessed fields only (vendor, description, tags). Distinct from overall_confidence, which blends in near-certain fields (amount/currency/date) and cannot separate good proposals from bad ones. NULL for proposals generated before this column existed.';

COMMIT;
