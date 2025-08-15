-- MANUAL VENDOR SETUP SCRIPT
-- Run this in Supabase SQL Editor if automatic migration fails
-- This ensures vendors table exists and creates default vendors for new users

-- 1. Create vendors table if it doesn't exist (it should already exist)
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT vendors_unique_name_per_user UNIQUE (name, user_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(name);

-- 3. Enable RLS and create policies
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can insert their own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update their own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete their own vendors" ON public.vendors;

-- Create RLS policies
CREATE POLICY "Users can view their own vendors" 
    ON public.vendors 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendors" 
    ON public.vendors 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendors" 
    ON public.vendors 
    FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendors" 
    ON public.vendors 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. Create update trigger
CREATE TRIGGER IF NOT EXISTS update_vendors_updated_at 
    BEFORE UPDATE ON public.vendors 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create function to add default vendors for new users
CREATE OR REPLACE FUNCTION public.create_default_vendors()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.vendors (name, user_id) VALUES
        -- Food & Dining
        ('McDonald''s', NEW.id),
        ('Starbucks', NEW.id),
        ('Pizza Hut', NEW.id),
        ('Subway', NEW.id),
        
        -- Grocery & Shopping
        ('Whole Foods', NEW.id),
        ('Trader Joe''s', NEW.id),
        ('Costco', NEW.id),
        ('Amazon', NEW.id),
        ('Target', NEW.id),
        
        -- Transportation
        ('Uber', NEW.id),
        ('Lyft', NEW.id),
        ('Shell', NEW.id),
        ('Chevron', NEW.id),
        
        -- Entertainment & Services
        ('Netflix', NEW.id),
        ('Spotify', NEW.id),
        ('Gym Membership', NEW.id),
        
        -- Utilities & Bills
        ('Electric Company', NEW.id),
        ('Internet Provider', NEW.id),
        ('Phone Company', NEW.id),
        
        -- Retail
        ('Best Buy', NEW.id),
        ('Nike', NEW.id)
    ON CONFLICT (name, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to add default vendors when new user is created
DROP TRIGGER IF EXISTS create_user_vendors ON public.users;
CREATE TRIGGER create_user_vendors
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_vendors();

-- 7. Backfill default vendors for existing users
DO $$
DECLARE
    user_record RECORD;
    vendor_count INTEGER;
BEGIN
    FOR user_record IN SELECT id FROM public.users LOOP
        -- Check if user already has vendors
        SELECT COUNT(*) INTO vendor_count 
        FROM public.vendors 
        WHERE user_id = user_record.id;
        
        -- Only add vendors if user has none
        IF vendor_count = 0 THEN
            INSERT INTO public.vendors (name, user_id) VALUES
                -- Food & Dining
                ('McDonald''s', user_record.id),
                ('Starbucks', user_record.id),
                ('Pizza Hut', user_record.id),
                ('Subway', user_record.id),
                
                -- Grocery & Shopping
                ('Whole Foods', user_record.id),
                ('Trader Joe''s', user_record.id),
                ('Costco', user_record.id),
                ('Amazon', user_record.id),
                ('Target', user_record.id),
                
                -- Transportation
                ('Uber', user_record.id),
                ('Lyft', user_record.id),
                ('Shell', user_record.id),
                ('Chevron', user_record.id),
                
                -- Entertainment & Services
                ('Netflix', user_record.id),
                ('Spotify', user_record.id),
                ('Gym Membership', user_record.id),
                
                -- Utilities & Bills
                ('Electric Company', user_record.id),
                ('Internet Provider', user_record.id),
                ('Phone Company', user_record.id),
                
                -- Retail
                ('Best Buy', user_record.id),
                ('Nike', user_record.id)
            ON CONFLICT (name, user_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- 8. Verify the setup
SELECT 
    COUNT(*) as total_vendors,
    COUNT(DISTINCT user_id) as users_with_vendors
FROM public.vendors;