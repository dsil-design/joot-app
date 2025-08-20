-- Fix UUID generation consistency
-- This migration ensures all tables use uuid_generate_v4() consistently

-- 1. Update payment_methods table to use uuid_generate_v4()
ALTER TABLE public.payment_methods 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 2. Update vendors table to use uuid_generate_v4()
ALTER TABLE public.vendors 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 3. Update the trigger function to fix the McDonald's apostrophe issue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create default categories for new user
  INSERT INTO public.transaction_categories (name, color, icon, user_id) VALUES
    ('Food & Dining', '#ef4444', 'utensils', NEW.id),
    ('Transportation', '#3b82f6', 'car', NEW.id),
    ('Shopping', '#8b5cf6', 'shopping-bag', NEW.id),
    ('Entertainment', '#f59e0b', 'film', NEW.id),
    ('Bills & Utilities', '#10b981', 'receipt', NEW.id),
    ('Healthcare', '#ec4899', 'heart', NEW.id),
    ('Income', '#22c55e', 'trending-up', NEW.id),
    ('Other', '#6b7280', 'circle', NEW.id);
  
  -- Create default payment methods for new user
  INSERT INTO public.payment_methods (name, user_id) VALUES
    ('Cash', NEW.id),
    ('Credit Card', NEW.id),
    ('Bank Account', NEW.id),
    ('Bank Transfer', NEW.id);
  
  -- Create default vendors for new user (fixed apostrophe issue)
  INSERT INTO public.vendors (name, user_id) VALUES
    ('McDonalds', NEW.id),
    ('Starbucks', NEW.id),
    ('Amazon', NEW.id),
    ('Target', NEW.id),
    ('Uber', NEW.id),
    ('Netflix', NEW.id),
    ('Spotify', NEW.id),
    ('Shell', NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise it
    RAISE LOG 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();