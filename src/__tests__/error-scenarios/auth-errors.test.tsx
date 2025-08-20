import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import SignupPage from '@/app/signup/page'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { auth } from '@/lib/supabase/auth'
import * as authLib from '@/lib/auth'
import { GlobalActionProvider } from '@/contexts/GlobalActionContext'
import type { AuthError, User } from '@supabase/supabase-js'

// Mock modules
jest.mock('@/lib/supabase/auth')
jest.mock('@/lib/auth')
jest.mock('next/navigation')

const mockAuth = auth as jest.Mocked<typeof auth>
const mockAuthLib = authLib as jest.Mocked<typeof authLib>

describe('Authentication Error Scenarios', () => {
  const mockPush = jest.fn()

  // Helper function to create proper AuthError mock
  const createAuthError = (message: string): AuthError => {
    const error = new Error(message) as AuthError
    error.status = 400
    return error
  }

  // Helper function to create mock session
  const createMockSession = (user: User) => ({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user
  })

  // Helper function to wrap components with GlobalActionProvider
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <GlobalActionProvider>
        {component}
      </GlobalActionProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock the useRouter hook directly
    require('next/navigation').useRouter = jest.fn(() => ({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    }))
  })

  describe('Network Error Scenarios', () => {
    it('should handle network timeouts during login', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockRejectedValue(new Error('Network timeout'))

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })
    })

    it('should handle network errors during signup', async () => {
      const user = userEvent.setup()
      mockAuth.signUp.mockRejectedValue(new Error('Connection failed'))

      renderWithProvider(<SignupPage />)
      
      await user.type(screen.getByLabelText(/first name/i), 'Test User')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })
    })

    it('should handle offline scenarios', async () => {
      const user = userEvent.setup()
      
      // Simulate offline error
      mockAuth.signIn.mockRejectedValue(new Error('Failed to fetch'))

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Error Responses', () => {
    it('should handle invalid credentials error', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Invalid login credentials')
      })

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      })
    })

    it('should handle email not confirmed error', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Email not confirmed')
      })

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'unverified@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Email not confirmed')).toBeInTheDocument()
      })
    })

    it('should handle user not found error', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('User not found')
      })

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument()
      })
    })

    it('should handle account disabled error', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Account has been disabled')
      })

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'disabled@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Account has been disabled')).toBeInTheDocument()
      })
    })
  })

  describe('Signup Error Scenarios', () => {
    it('should handle email already registered error', async () => {
      const user = userEvent.setup()
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('User already registered')
      })

      renderWithProvider(<SignupPage />)
      
      await user.type(screen.getByLabelText(/first name/i), 'Existing User')
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(screen.getByText('User already registered')).toBeInTheDocument()
      })
    })

    it('should handle weak password error from backend', async () => {
      const user = userEvent.setup()
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Password should be at least 6 characters')
      })

      renderWithProvider(<SignupPage />)
      
      await user.type(screen.getByLabelText(/first name/i), 'Test User')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'weakpass')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Password should be at least 6 characters')).toBeInTheDocument()
      })
    })

    it('should handle invalid email format error from backend', async () => {
      const user = userEvent.setup()
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Invalid email format')
      })

      renderWithProvider(<SignupPage />)
      
      await user.type(screen.getByLabelText(/first name/i), 'Test User')
      await user.type(screen.getByLabelText(/email/i), 'invalid.email')
      await user.type(screen.getByLabelText(/password/i), 'validpassword123')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument()
      })
    })
  })

  describe('Session and Auth State Errors', () => {
    it('should handle expired session gracefully', async () => {
      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: false,
        user: null
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })
    })

    it('should handle corrupted auth state', async () => {
      mockAuthLib.getAuthState.mockImplementation(() => {
        throw new Error('Invalid auth state')
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      // Should show loading initially, then redirect
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should handle missing user data', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: createAuthError('User not found in session')
      })

      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: false,
        user: null
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })
    })
  })

  describe('Rate Limiting and Service Errors', () => {
    it('should handle rate limiting errors', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Too many attempts. Please try again later.')
      })

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Too many attempts. Please try again later.')).toBeInTheDocument()
      })
    })

    it('should handle service unavailable errors', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Service temporarily unavailable')
      })

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument()
      })
    })

    it('should handle database connection errors', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockRejectedValue(new Error('Database connection failed'))

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Form State Recovery', () => {
    it('should preserve form data when errors occur', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: createAuthError('Invalid credentials')
      })

      renderWithProvider(<LoginPage />)
      
      const email = 'user@example.com'
      const password = 'wrongpassword'
      
      await user.type(screen.getByLabelText(/email/i), email)
      await user.type(screen.getByLabelText(/password/i), password)
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      // Form data should be preserved
      expect(screen.getByLabelText(/email/i)).toHaveValue(email)
      expect(screen.getByLabelText(/password/i)).toHaveValue(password)
    })

    it('should allow retry after error', async () => {
      const user = userEvent.setup()
      
      // First attempt fails
      mockAuth.signIn.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: createAuthError('Network error')
      })
      
      // Second attempt succeeds
      const mockUser: User = { 
        id: '123', 
        email: 'user@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {
          first_name: 'Test',
          last_name: 'User'
        },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_anonymous: false
      }
      
      mockAuth.signIn.mockResolvedValueOnce({
        data: { 
          user: mockUser, 
          session: createMockSession(mockUser)
        },
        error: null
      })

      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // First attempt
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Second attempt
      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })
})