-- Migration: add_transaction_reference_amount
-- Created: 2026-04-07 12:00:00

BEGIN;

-- Add reference_amount / reference_currency / reference_exchange_rate to
-- transactions.
--
-- These columns capture optional foreign-currency context for transactions
-- whose `amount`/`original_currency` reflect a settlement currency that
-- differs from the currency the merchant actually billed in. The canonical
-- example is a Chase Sapphire Reserve charge that was paid in THB or VND but
-- settled to the card in USD: Chase prints the original foreign amount and
-- Visa exchange rate on the statement, and we want to preserve that data.
--
-- These fields are PURELY INFORMATIONAL — display only. Reporting and
-- charting continue to use `amount` + `original_currency`. We never
-- double-convert through the reference currency.
--
-- Nullable, no default — only populated when source data provides it.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS reference_amount numeric,
  ADD COLUMN IF NOT EXISTS reference_currency text,
  ADD COLUMN IF NOT EXISTS reference_exchange_rate numeric;

COMMENT ON COLUMN transactions.reference_amount IS
  'Optional original-currency amount for transactions where the settlement currency (amount/original_currency) differs from the currency the merchant billed in. Informational only — not used in reporting.';

COMMENT ON COLUMN transactions.reference_currency IS
  'ISO 4217 code of the currency the merchant originally billed in. Informational only.';

COMMENT ON COLUMN transactions.reference_exchange_rate IS
  'Exchange rate the issuing network applied to convert reference_currency → original_currency. Informational only.';

COMMIT;
