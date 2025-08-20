import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not authenticated, redirect to login
  if (!user) {
    redirect('/login')
  }

  // Check if user has admin role (with email fallback)
  // Try to get role from database, but don't fail if column doesn't exist
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Log for debugging
  console.log('Admin Layout - User Email:', user.email)
  console.log('Admin Layout - Profile Data:', userProfile)
  console.log('Admin Layout - Profile Error:', profileError)

  const isAdminByRole = userProfile?.role === 'admin'
  const isAdminByEmail = user.email === 'admin@dsil.design'

  console.log('Admin Layout - Is Admin by Role:', isAdminByRole)
  console.log('Admin Layout - Is Admin by Email:', isAdminByEmail)

  if (!isAdminByRole && !isAdminByEmail) {
    // Not an admin, redirect to home with error message
    console.log('Admin Layout - Access denied, redirecting to home')
    redirect('/home?error=unauthorized')
  }

  console.log('Admin Layout - Access granted')

  return <>{children}</>
}