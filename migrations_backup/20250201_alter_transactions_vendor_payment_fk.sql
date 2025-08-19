-- Migration: Add payment_method_id foreign key to transactions table
-- This replaces the TEXT payment_method column with proper FK relationship
-- NOTE: Our current schema already has FK columns, so this is mostly a no-op

-- Step 1: Add the new payment_method_id column (idempotent)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- Step 2: Create index for the foreign key (idempotent)
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id 
ON public.transactions(payment_method_id);

-- Step 3: This migration was designed for schemas with TEXT columns
-- Our schema already uses FK relationships, so we skip the data migration
DO $$
BEGIN
    RAISE NOTICE 'Schema already uses FK relationships, skipping text-to-FK migration';
END $$;
