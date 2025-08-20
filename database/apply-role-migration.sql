-- Direct SQL to apply role migration
-- This can be run directly against the database if migrations aren't working

-- Check if role column already exists
DO $$
BEGIN
    -- Check if the role column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        -- Create role enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('user', 'admin');
        END IF;
        
        -- Add role column
        ALTER TABLE public.users ADD COLUMN role user_role DEFAULT 'user';
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
        
        -- Set admin role for admin user
        UPDATE public.users 
        SET role = 'admin' 
        WHERE email = 'admin@dsil.design';
        
        RAISE NOTICE 'Role column added successfully';
    ELSE
        -- Column exists, just update the admin user
        UPDATE public.users 
        SET role = 'admin' 
        WHERE email = 'admin@dsil.design' AND (role IS NULL OR role != 'admin');
        
        RAISE NOTICE 'Role column already exists, admin user updated';
    END IF;
END $$;

-- Create or replace the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Add RLS policies if they don't exist
DO $$
BEGIN
    -- Check and create admin policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Admins can view all users'
    ) THEN
        CREATE POLICY "Admins can view all users" ON public.users
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Admins can update user roles'
    ) THEN
        CREATE POLICY "Admins can update user roles" ON public.users
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;

-- Verify the changes
SELECT 
    u.id, 
    u.email, 
    u.first_name, 
    u.last_name, 
    u.role,
    CASE WHEN u.role = 'admin' THEN '✓ Admin' ELSE 'Regular User' END as status
FROM public.users u
WHERE u.email IN ('admin@dsil.design', 'hello@dsil.design')
ORDER BY u.email;