-- Add user roles system
-- This migration adds a role column to the users table and sets up admin permissions

-- Add role column to users table
ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'user';

-- Create role enum for type safety (optional but recommended)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the column to use the enum type
ALTER TABLE public.users ALTER COLUMN role TYPE user_role USING role::user_role;

-- Set admin role for the specified admin user
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@dsil.design';

-- Create index for role lookups
CREATE INDEX idx_users_role ON public.users(role);

-- Add RLS policies for admin access
-- Admin users can view all users (for user management)
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin users can update any user's role (for user management)
CREATE POLICY "Admins can update user roles" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin users can view all transactions (for admin oversight)
CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin users can view all payment methods
CREATE POLICY "Admins can view all payment methods" ON public.payment_methods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin users can view all vendors
CREATE POLICY "Admins can view all vendors" ON public.vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin users can manage exchange rates (insert, update, delete)
CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;