-- Migration to fix users table schema
-- This will add first_name and last_name columns and remove full_name

-- Step 1: Add the new columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Step 2: If there's existing data in full_name, try to split it
-- This will attempt to split full_name into first_name and last_name
-- If full_name has multiple words, first word goes to first_name, rest to last_name
UPDATE public.users 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0 
    THEN split_part(full_name, ' ', 1)
    ELSE full_name
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0 
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL;

-- Step 3: Remove the old full_name column
ALTER TABLE public.users DROP COLUMN IF EXISTS full_name;

-- Step 4: Verify the structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
