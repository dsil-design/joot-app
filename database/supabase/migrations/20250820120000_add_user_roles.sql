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
-- First drop the default to avoid casting issues
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;

-- Convert the column type
ALTER TABLE public.users ALTER COLUMN role TYPE user_role USING role::user_role;

-- Re-add the default with proper enum value
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'user'::user_role;

-- Set admin role for the specified admin user
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@dsil.design';

-- Create index for role lookups
CREATE INDEX idx_users_role ON public.users(role);

-- Create a secure function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = check_user_id 
    AND role = 'admin'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;

-- Add simplified, non-recursive admin policies
-- Note: These policies don't conflict with basic user policies

-- Admin users can view all users (for user management)
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    public.is_user_admin(auth.uid())
  );

-- Admin users can update any user's role (for user management)
CREATE POLICY "Admins can update user roles" ON public.users
  FOR UPDATE USING (
    public.is_user_admin(auth.uid())
  );

-- Admin users can view all transactions (for admin oversight)
CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (
    public.is_user_admin(auth.uid())
  );

-- Admin users can view all payment methods
CREATE POLICY "Admins can view all payment methods" ON public.payment_methods
  FOR SELECT USING (
    public.is_user_admin(auth.uid())
  );

-- Admin users can view all vendors
CREATE POLICY "Admins can view all vendors" ON public.vendors
  FOR SELECT USING (
    public.is_user_admin(auth.uid())
  );

-- Admin users can manage exchange rates (insert, update, delete)
CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates
  FOR ALL USING (
    public.is_user_admin(auth.uid())
  );

-- Function to check if current user is admin (simplified version)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_user_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;