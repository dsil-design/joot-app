-- Migration: Populate database with realistic dummy transaction data (duplicate - skipped)
-- This provides better examples for users to see how the app works
-- This is a duplicate of the 20250117 migration, so we skip it

DO $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Check if any users exist
    SELECT COUNT(*) INTO user_count FROM public.users;
    
    IF user_count > 0 THEN
        RAISE NOTICE 'Skipping duplicate realistic data population (users found: %)', user_count;
    ELSE
        RAISE NOTICE 'Skipping duplicate realistic data population (no users)';
    END IF;
END $$;
