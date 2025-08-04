import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import SignupPage from '@/app/signup/page'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { auth } from '@/lib/supabase/auth'
import * as authLib from '@/lib/auth'

// Mock modules
jest.mock('@/lib/supabase/auth')
jest.mock('@/lib/auth')
jest.mock('next/navigation')

const mockAuth = auth as jest.Mocked<typeof auth>
const mockAuthLib = authLib as jest.Mocked<typeof authLib>

describe('Authentication Error Scenarios', () => {
  const mockPush = jest.fn()
  const mockSearchParams = Promise.resolve({})

  beforeEach(() => {
    jest.clearAllMocks()
    const { useRouter } = jest.requireActual('next/navigation')
    jest.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    })
  })

  describe('Network Error Scenarios', () => {
    it('should handle network timeouts during login', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockRejectedValue(new Error('Network timeout'))

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })
    })

    it('should handle network errors during signup', async () => {
      const user = userEvent.setup()
      mockAuth.signUp.mockRejectedValue(new Error('Connection failed'))

      render(<SignupPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/full name/i), 'Test User')
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })
    })

    it('should handle offline scenarios', async () => {
      const user = userEvent.setup()
      
      // Simulate offline error
      mockAuth.signIn.mockRejectedValue(new Error('Failed to fetch'))

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Error Responses', () => {
    it('should handle invalid credentials error', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      })
    })

    it('should handle email not confirmed error', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: null,
        error: { message: 'Email not confirmed' }
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'unverified@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Email not confirmed')).toBeInTheDocument()
      })
    })

    it('should handle user not found error', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'nonexistent@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument()
      })
    })

    it('should handle account disabled error', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: null,
        error: { message: 'Account has been disabled' }
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'disabled@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Account has been disabled')).toBeInTheDocument()
      })
    })
  })

  describe('Signup Error Scenarios', () => {
    it('should handle email already registered error', async () => {
      const user = userEvent.setup()
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' }
      })

      render(<SignupPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/full name/i), 'Existing User')
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(screen.getByText('User already registered')).toBeInTheDocument()
      })
    })

    it('should handle weak password error from backend', async () => {
      const user = userEvent.setup()
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Password should be at least 6 characters' }
      })

      render(<SignupPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/full name/i), 'Test User')
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'weakpass')
      await user.type(screen.getByLabelText(/confirm password/i), 'weakpass')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Password should be at least 6 characters')).toBeInTheDocument()
      })
    })

    it('should handle invalid email format error from backend', async () => {
      const user = userEvent.setup()
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email format' }
      })

      render(<SignupPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/full name/i), 'Test User')
      await user.type(screen.getByLabelText(/email address/i), 'invalid.email')
      await user.type(screen.getByLabelText(/^password$/i), 'validpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'validpassword123')
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
        error: { message: 'User not found in session' }
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
        data: null,
        error: { message: 'Too many attempts. Please try again later.' }
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Too many attempts. Please try again later.')).toBeInTheDocument()
      })
    })

    it('should handle service unavailable errors', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: null,
        error: { message: 'Service temporarily unavailable' }
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument()
      })
    })

    it('should handle database connection errors', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockRejectedValue(new Error('Database connection failed'))

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Form State Recovery', () => {
    it('should preserve form data when errors occur', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' }
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      const email = 'user@example.com'
      const password = 'wrongpassword'
      
      await user.type(screen.getByLabelText(/email address/i), email)
      await user.type(screen.getByLabelText(/password/i), password)
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      // Form data should be preserved
      expect(screen.getByLabelText(/email address/i)).toHaveValue(email)
      expect(screen.getByLabelText(/password/i)).toHaveValue(password)
    })

    it('should allow retry after error', async () => {
      const user = userEvent.setup()
      
      // First attempt fails
      mockAuth.signIn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' }
      })
      
      // Second attempt succeeds
      mockAuth.signIn.mockResolvedValueOnce({
        data: { user: { id: '123', email: 'user@example.com' } },
        error: null
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // First attempt
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Second attempt
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })
})