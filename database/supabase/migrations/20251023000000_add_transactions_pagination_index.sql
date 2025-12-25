-- Migration: Add optimized index for cursor-based pagination on transactions
-- Created: 2025-10-23
-- Description: Creates a composite index to optimize the pagination queries
--              that order by transaction_date DESC, id DESC and filter by user_id

-- Create composite index for efficient cursor-based pagination
CREATE INDEX IF NOT EXISTS idx_transactions_pagination
ON transactions (user_id, transaction_date DESC, id DESC);

-- This index supports queries like:
-- SELECT * FROM transactions
-- WHERE user_id = ?
--   AND (transaction_date < ? OR (transaction_date = ? AND id < ?))
-- ORDER BY transaction_date DESC, id DESC
-- LIMIT ?;

-- Add index for transaction_type filtering (common filter)
CREATE INDEX IF NOT EXISTS idx_transactions_type_user
ON transactions (user_id, transaction_type)
WHERE transaction_type IS NOT NULL;

-- Add index for vendor_id filtering (common filter)
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_user
ON transactions (user_id, vendor_id)
WHERE vendor_id IS NOT NULL;

-- Add index for payment_method_id filtering (common filter)
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_user
ON transactions (user_id, payment_method_id)
WHERE payment_method_id IS NOT NULL;

COMMENT ON INDEX idx_transactions_pagination IS
'Optimizes cursor-based pagination queries ordered by date DESC, id DESC';

COMMENT ON INDEX idx_transactions_type_user IS
'Optimizes filtering by transaction type (expense/income)';

COMMENT ON INDEX idx_transactions_vendor_user IS
'Optimizes filtering by vendor';

COMMENT ON INDEX idx_transactions_payment_method_user IS
'Optimizes filtering by payment method';
