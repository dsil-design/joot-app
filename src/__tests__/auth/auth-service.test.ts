import { auth } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'

// Type the mock properly
const mockSupabase = createClient() as jest.Mocked<ReturnType<typeof createClient>>

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('signUp', () => {
    it('should successfully sign up a user', async () => {
      const mockResponse = {
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null
      }
      
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse)
      
      const result = await auth.signUp('test@example.com', 'password123', { full_name: 'Test User' })
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { full_name: 'Test User' }
        }
      })
      
      expect(result).toEqual(mockResponse)
    })

    it('should handle sign up errors', async () => {
      const mockError = { message: 'Email already registered' }
      const mockResponse = { data: null, error: mockError }
      
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse)
      
      const result = await auth.signUp('test@example.com', 'password123')
      
      expect(result.error).toEqual(mockError)
    })
  })

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockResponse = {
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null
      }
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockResponse)
      
      const result = await auth.signIn('test@example.com', 'password123')
      
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
      
      expect(result).toEqual(mockResponse)
    })

    it('should handle invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials' }
      const mockResponse = { data: null, error: mockError }
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockResponse)
      
      const result = await auth.signIn('test@example.com', 'wrongpassword')
      
      expect(result.error).toEqual(mockError)
    })
  })

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      const mockResponse = { error: null }
      
      mockSupabase.auth.signOut.mockResolvedValue(mockResponse)
      
      const result = await auth.signOut()
      
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getUser', () => {
    it('should return current user', async () => {
      const mockResponse = {
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null
      }
      
      mockSupabase.auth.getUser.mockResolvedValue(mockResponse)
      
      const result = await auth.getUser()
      
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getSession', () => {
    it('should return current session', async () => {
      const mockResponse = {
        data: { session: { access_token: 'token123' } },
        error: null
      }
      
      mockSupabase.auth.getSession.mockResolvedValue(mockResponse)
      
      const result = await auth.getSession()
      
      expect(mockSupabase.auth.getSession).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })
  })
})