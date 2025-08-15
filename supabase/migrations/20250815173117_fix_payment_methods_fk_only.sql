-- Fix payment_methods foreign key constraint to reference public.users instead of auth.users
-- This migration is safe to run multiple times

-- Step 1: Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payment_methods_user_id_fkey'
    ) THEN
        ALTER TABLE public.payment_methods DROP CONSTRAINT payment_methods_user_id_fkey;
        RAISE NOTICE 'Dropped existing constraint payment_methods_user_id_fkey';
    END IF;
END $$;

-- Step 2: Add new constraint pointing to public.users
ALTER TABLE public.payment_methods 
ADD CONSTRAINT payment_methods_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

RAISE NOTICE 'Added new constraint payment_methods_user_id_fkey pointing to public.users(id)';
