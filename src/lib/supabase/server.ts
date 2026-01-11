import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from './types'

// Retry configuration for transient network errors
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds
}

// Check if error is retryable (network/connection issues)
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const retryablePatterns = [
      'econnreset',
      'socket',
      'network',
      'timeout',
      'connection',
      'fetch failed',
      'other side closed',
    ]
    return retryablePatterns.some(pattern => message.includes(pattern))
  }
  return false
}

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project settings.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    }
  })
}

/**
 * Create a Supabase client with service role privileges
 * This bypasses Row Level Security and should only be used for:
 * - Background jobs (cron, webhooks)
 * - Admin operations
 * - Server-side operations that need full database access
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: async (url, options) => {
        let lastError: Error | null = null

        for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
          try {
            const response = await fetch(url, {
              ...options,
              // Add keepalive to help with connection reuse
              keepalive: true,
            })
            return response
          } catch (error) {
            lastError = error as Error

            if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxRetries - 1) {
              throw error
            }

            // Exponential backoff with jitter
            const delay = Math.min(
              RETRY_CONFIG.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
              RETRY_CONFIG.maxDelay
            )

            console.warn(
              `[Supabase] Retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${Math.round(delay)}ms:`,
              lastError.message
            )

            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }

        throw lastError
      }
    }
  })
}
