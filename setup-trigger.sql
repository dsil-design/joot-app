-- VENDOR TRIGGER SETUP
-- Copy and paste this into Supabase SQL Editor to complete the setup

-- 1. Create the function to add default vendors for new users
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

-- 2. Create the trigger to run when new users are created
DROP TRIGGER IF EXISTS create_user_vendors ON public.users;
CREATE TRIGGER create_user_vendors
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_vendors();

-- 3. Verify the setup
SELECT 
    COUNT(*) as total_vendors,
    COUNT(DISTINCT user_id) as users_with_vendors,
    ROUND(COUNT(*)::decimal / COUNT(DISTINCT user_id), 1) as avg_vendors_per_user
FROM public.vendors;