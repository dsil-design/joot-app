-- Migration to refactor transactions table to use single amount column
-- This migration changes from storing both amount_usd and amount_thb to storing
-- only the single recorded amount with original_currency as the indicator

-- Step 1: Add the new amount column
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2);

-- Step 2: Populate amount based on original_currency
-- Copy the value from the appropriate currency column based on what was originally recorded
UPDATE public.transactions
SET amount = CASE
  WHEN original_currency = 'USD' THEN amount_usd
  WHEN original_currency = 'THB' THEN amount_thb
  ELSE amount_usd -- Default fallback (shouldn't happen)
END
WHERE amount IS NULL;

-- Step 3: Make amount NOT NULL now that it's populated
ALTER TABLE public.transactions
ALTER COLUMN amount SET NOT NULL;

-- Step 4: Drop the old constraint that checks both amounts
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS positive_amounts;

-- Step 5: Add new constraint for single amount
ALTER TABLE public.transactions
ADD CONSTRAINT positive_amount CHECK (amount > 0);

-- Step 6: Drop the old amount columns
ALTER TABLE public.transactions
DROP COLUMN IF EXISTS amount_usd,
DROP COLUMN IF EXISTS amount_thb;

-- Step 7: Verify the new structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transactions' AND table_schema = 'public'
  AND column_name IN ('amount', 'original_currency', 'amount_usd', 'amount_thb')
ORDER BY ordinal_position;
