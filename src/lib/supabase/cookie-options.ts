import type { CookieOptionsWithName } from '@supabase/ssr'

/**
 * Shared cookie options for all Supabase clients.
 *
 * maxAge: 400 days — the maximum allowed by most browsers (Chrome caps at 400 days).
 * This keeps the refresh token cookie alive across browser restarts so users
 * stay logged in until the server-side refresh token expires (default 7 days
 * in Supabase, configurable in the dashboard).
 */
export const cookieOptions: CookieOptionsWithName = {
  maxAge: 60 * 60 * 24 * 400, // 400 days in seconds
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}
