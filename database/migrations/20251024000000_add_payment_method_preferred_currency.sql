-- Migration: Add Preferred Currency to Payment Methods
-- This migration adds an optional preferred_currency column to payment_methods table
-- to allow users to set a default currency for each payment method

-- 1. Add preferred_currency column (nullable - no default currency initially)
ALTER TABLE public.payment_methods
ADD COLUMN preferred_currency VARCHAR(10);

-- 2. Add foreign key constraint to currency_configuration table
-- This ensures only valid currencies from currency_configuration can be set
ALTER TABLE public.payment_methods
ADD CONSTRAINT fk_payment_method_currency
FOREIGN KEY (preferred_currency)
REFERENCES currency_configuration(currency_code)
ON DELETE SET NULL;

-- 3. Add index for better query performance when filtering by currency
CREATE INDEX idx_payment_methods_preferred_currency
ON public.payment_methods(preferred_currency)
WHERE preferred_currency IS NOT NULL;

-- 4. Add comment to document the column's purpose
COMMENT ON COLUMN public.payment_methods.preferred_currency IS
'Optional preferred currency for this payment method. When set, transactions created with this payment method will default to this currency. References currency_configuration.currency_code.';
