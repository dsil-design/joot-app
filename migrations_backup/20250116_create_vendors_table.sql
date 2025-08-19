-- Create vendors table with default vendor creation for new users
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add unique constraint to prevent duplicate vendor names per user
    CONSTRAINT vendors_unique_name_per_user UNIQUE (name, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(name);

-- Enable Row Level Security
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only see and manage their own vendors)
-- Skip if policies already exist from initial schema
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vendors' AND policyname = 'Users can view their own vendors'
    ) THEN
        CREATE POLICY "Users can view their own vendors" 
            ON public.vendors 
            FOR SELECT 
            USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vendors' AND policyname = 'Users can insert their own vendors'
    ) THEN
        CREATE POLICY "Users can insert their own vendors" 
            ON public.vendors 
            FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vendors' AND policyname = 'Users can update their own vendors'
    ) THEN
        CREATE POLICY "Users can update their own vendors" 
            ON public.vendors 
            FOR UPDATE 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vendors' AND policyname = 'Users can delete their own vendors'
    ) THEN
        CREATE POLICY "Users can delete their own vendors" 
            ON public.vendors 
            FOR DELETE 
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create trigger to update updated_at timestamp
-- Skip if trigger already exists from initial schema
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_vendors_updated_at'
    ) THEN
        CREATE TRIGGER update_vendors_updated_at 
            BEFORE UPDATE ON public.vendors 
            FOR EACH ROW 
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Create function to automatically add default vendors for new users
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

-- Create trigger to add default vendors when a new user is created
-- Skip if trigger already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'create_user_vendors'
    ) THEN
        CREATE TRIGGER create_user_vendors
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.create_default_vendors();
    END IF;
END $$;

-- Populate default vendors for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
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
    END LOOP;
END $$;