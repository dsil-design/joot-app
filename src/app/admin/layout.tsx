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
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdminByRole = userProfile?.role === 'admin'
  const isAdminByEmail = user.email === 'admin@dsil.design'

  if (!isAdminByRole && !isAdminByEmail) {
    // Not an admin, redirect to home with error message
    redirect('/?error=unauthorized')
  }

  return <>{children}</>
}