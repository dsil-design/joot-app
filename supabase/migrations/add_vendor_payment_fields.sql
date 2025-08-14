-- Add vendor and payment_method fields to transactions table
-- Also remove the category_id field since transaction_categories table was deleted

ALTER TABLE public.transactions 
  ADD COLUMN vendor TEXT,
  ADD COLUMN payment_method TEXT,
  DROP COLUMN IF EXISTS category_id;

-- Update the index since we removed category_id
DROP INDEX IF EXISTS idx_transactions_category;

-- Add indexes for new fields
CREATE INDEX idx_transactions_vendor ON public.transactions(vendor);
CREATE INDEX idx_transactions_payment_method ON public.transactions(payment_method);