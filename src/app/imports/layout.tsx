import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportsLayout } from '@/components/page-specific/imports-layout'

export default async function Layout({
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

  // Fetch user profile data
  const { data: userProfile } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const fullName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.first_name || userProfile?.last_name || user.email || "User"

  const getInitials = (firstName?: string | null, lastName?: string | null): string => {
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
    }
    if (firstName) return firstName.charAt(0).toUpperCase()
    if (lastName) return lastName.charAt(0).toUpperCase()
    return "U"
  }

  const userInitials = getInitials(userProfile?.first_name, userProfile?.last_name)

  return (
    <ImportsLayout
      user={{
        fullName,
        email: user.email || '',
        initials: userInitials
      }}
    >
      {children}
    </ImportsLayout>
  )
}
