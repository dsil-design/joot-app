// Simple client-side authentication state management
export interface User {
  id: string
  email: string
  name: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
}

// Simple localStorage-based session management
export const AUTH_STORAGE_KEY = 'joot_auth_session'

export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, user: null }
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        isAuthenticated: true,
        user: parsed.user
      }
    }
  } catch (error) {
    console.error('Error reading auth state:', error)
  }

  return { isAuthenticated: false, user: null }
}

export function setAuthState(user: User): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      user,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('Error saving auth state:', error)
  }
}

export function clearAuthState(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing auth state:', error)
  }
}

export function isAuthenticated(): boolean {
  return getAuthState().isAuthenticated
}
