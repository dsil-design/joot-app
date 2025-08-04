// Server-side auth functions ONLY
// This file should only be imported in server components, API routes, or middleware
import { createClient as createServerClient } from './server'
import type { AuthError, PostgrestError } from '@supabase/supabase-js'
import type { User } from './types'

export const serverAuth = {
  // Get current user (server-side)
  getUser: async (): Promise<{ user: User | null; error: AuthError | PostgrestError | null }> => {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.getUser()
    
    if (error || !data.user) {
      return { user: null, error }
    }

    // Get user profile from our users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      return { user: null, error: profileError }
    }

    return { user: profile, error: null }
  },

  // Get current session (server-side)
  getSession: async () => {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
  },

  // Check if user is authenticated (server-side)
  isAuthenticated: async (): Promise<boolean> => {
    const { user } = await serverAuth.getUser()
    return !!user
  },
}
