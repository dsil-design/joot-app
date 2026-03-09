import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface UserNav {
  fullName: string
  email: string
  initials: string
}

/**
 * Fetches the authenticated user's profile for navigation display.
 * Redirects to /login if not authenticated.
 */
export async function getUserNav(): Promise<UserNav> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.first_name
  const lastName = profile?.last_name

  const fullName = firstName && lastName
    ? `${firstName} ${lastName}`
    : firstName || lastName || user.email || 'User'

  let initials = 'U'
  if (firstName && lastName) {
    initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  } else if (firstName) {
    initials = firstName.charAt(0).toUpperCase()
  } else if (lastName) {
    initials = lastName.charAt(0).toUpperCase()
  }

  return {
    fullName,
    email: user.email || '',
    initials,
  }
}
