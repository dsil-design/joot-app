import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface UserProfileData {
  fullName: string
  userInitials: string
  userEmail: string
  isAdmin: boolean
}

export async function UserProfileSection(): Promise<UserProfileData> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile data with role information
  const { data: userProfile } = await supabase
    .from('users')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  const fullName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.first_name || userProfile?.last_name || user.email || "User"

  const isAdminByRole = userProfile?.role === 'admin'
  const isAdminByEmail = user.email === 'admin@dsil.design'
  const isAdmin = isAdminByRole || isAdminByEmail

  const getInitials = (firstName?: string | null, lastName?: string | null): string => {
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    if (lastName) {
      return lastName.charAt(0).toUpperCase()
    }
    return "U"
  }

  const userInitials = getInitials(userProfile?.first_name, userProfile?.last_name)

  return {
    fullName,
    userInitials,
    userEmail: user.email || '',
    isAdmin
  }
}