import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Safe admin client that handles missing environment variables gracefully
 * Returns null if environment variables are not properly configured
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Return null if environment variables are missing (e.g., during CI builds)
  if (!supabaseUrl || !supabaseServiceRoleKey || 
      supabaseUrl.includes('dummy') || supabaseServiceRoleKey.includes('dummy')) {
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Check if admin operations are available in the current environment
 */
export function isAdminAvailable(): boolean {
  return createAdminClient() !== null
}