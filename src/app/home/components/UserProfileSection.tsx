import { createClient } from '@/lib/supabase/server'

export interface UserProfileData {
  fullName: string
  userInitials: string
  userEmail: string
  isAdmin: boolean
}

interface UserProfileSectionProps {
  userId: string
}

export async function UserProfileSection({ userId }: UserProfileSectionProps): Promise<UserProfileData> {
  const supabase = await createClient()

  const { data: userProfile } = await supabase
    .from('users')
    .select('first_name, last_name, role, email')
    .eq('id', userId)
    .single()

  const userEmail = userProfile?.email || ''

  const fullName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.first_name || userProfile?.last_name || userEmail || "User"

  const isAdminByRole = userProfile?.role === 'admin'
  const isAdminByEmail = userEmail === 'admin@dsil.design'
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
    userEmail,
    isAdmin
  }
}