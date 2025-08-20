import { createClient } from './client'
import type { User } from './types'
import type { Session, PostgrestError } from '@supabase/supabase-js'

// Client-side auth functions ONLY
// Do not import server utilities here to avoid Next.js client/server conflicts
export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, userData?: { first_name?: string; last_name?: string }) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    })
    return { data, error }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user (client-side)
  getUser: async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getUser()
    return { data, error }
  },

  // Get current session
  getSession: async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
  },

  // Listen to auth changes
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    const supabase = createClient()
    return supabase.auth.onAuthStateChange(callback)
  },

  // Get user profile from our users table (client-side)
  getUserProfile: async (userId: string): Promise<{ user: User | null; error: PostgrestError | null }> => {
    const supabase = createClient()
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return { user: null, error }
    }

    return { user: profile, error: null }
  },

  // Check if current user is admin
  isAdmin: async (): Promise<{ isAdmin: boolean; error: PostgrestError | null }> => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('is_admin')
    
    if (error) {
      return { isAdmin: false, error }
    }

    return { isAdmin: data === true, error: null }
  },

  // Get current user with role information
  getCurrentUserWithRole: async (): Promise<{ user: User | null; error: PostgrestError | null }> => {
    const { data: authUser, error: authError } = await auth.getUser()
    
    if (authError || !authUser.user) {
      return { user: null, error: authError }
    }

    return await auth.getUserProfile(authUser.user.id)
  },
}

// Auth guard hook for client components
export const useAuthGuard = () => {
  const checkAuth = async () => {
    const { data, error } = await auth.getUser()
    return { isAuthenticated: !!data.user && !error, user: data.user, error }
  }
  
  return { checkAuth }
}
