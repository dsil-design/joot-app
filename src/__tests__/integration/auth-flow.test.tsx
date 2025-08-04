import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import SignupPage from '@/app/signup/page'
import LoginPage from '@/app/login/page'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { auth } from '@/lib/supabase/auth'
import * as authLib from '@/lib/auth'

// Mock modules
jest.mock('@/lib/supabase/auth')
jest.mock('@/lib/auth')
jest.mock('next/navigation')

const mockAuth = auth as jest.Mocked<typeof auth>
const mockAuthLib = authLib as jest.Mocked<typeof authLib>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('Authentication Flow Integration Tests', () => {
  const mockPush = jest.fn()
  const mockSearchParams = Promise.resolve({})

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    })
    window.location.href = ''
  })

  describe('Complete Signup to Login Flow', () => {
    it('should complete signup and redirect to login', async () => {
      const user = userEvent.setup()
      
      // Mock successful signup
      mockAuth.signUp.mockResolvedValue({
        data: { user: { id: '123', email: 'newuser@example.com' } },
        error: null
      })

      render(<SignupPage searchParams={mockSearchParams} />)
      
      // Fill signup form
      await user.type(screen.getByLabelText(/full name/i), 'New User')
      await user.type(screen.getByLabelText(/email address/i), 'newuser@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'newpassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123')
      
      // Submit signup
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/account created successfully/i)).toBeInTheDocument()
      })

      // Wait for redirect to login
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?message=Please check your email to verify your account')
      }, { timeout: 4000 })
    })
  })

  describe('Login with Email Verification', () => {
    it('should login successfully after email verification', async () => {
      const user = userEvent.setup()
      
      // Mock successful login
      mockAuth.signIn.mockResolvedValue({
        data: { user: { id: '123', email: 'verified@example.com' } },
        error: null
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      // Fill login form
      await user.type(screen.getByLabelText(/email address/i), 'verified@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Submit login
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      // Verify redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle unverified email gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock unverified email error
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
  })

  describe('Protected Route Access', () => {
    it('should allow access to authenticated users', async () => {
      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: true,
        user: { id: '123', email: 'authenticated@example.com' }
      })

      render(
        <ProtectedRoute>
          <div>Dashboard Content</div>
        </ProtectedRoute>
      )

      await waitFor(() => {
        expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      })
    })

    it('should redirect unauthenticated users to login', async () => {
      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: false,
        user: null
      })

      render(
        <ProtectedRoute>
          <div>Dashboard Content</div>
        </ProtectedRoute>
      )

      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })
    })
  })

  describe('Session Persistence', () => {
    it('should maintain session across page reloads', async () => {
      // Mock session check
      mockAuth.getSession.mockResolvedValue({
        data: { 
          session: { 
            access_token: 'valid-token',
            user: { id: '123', email: 'user@example.com' }
          } 
        },
        error: null
      })

      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: '123', email: 'user@example.com' } },
        error: null
      })

      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: true,
        user: { id: '123', email: 'user@example.com' }
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })

    it('should redirect to login when session expires', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' }
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

  describe('Multi-user Data Isolation', () => {
    it('should handle user switching correctly', async () => {
      const user = userEvent.setup()
      
      // First user login
      mockAuth.signIn.mockResolvedValueOnce({
        data: { user: { id: '123', email: 'user1@example.com' } },
        error: null
      })

      const { rerender } = render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'user1@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })

      // Simulate logout and second user login
      mockAuth.signOut.mockResolvedValue({ error: null })
      mockAuth.signIn.mockResolvedValueOnce({
        data: { user: { id: '456', email: 'user2@example.com' } },
        error: null
      })

      rerender(<LoginPage searchParams={mockSearchParams} />)
      
      await user.clear(screen.getByLabelText(/email address/i))
      await user.clear(screen.getByLabelText(/password/i))
      await user.type(screen.getByLabelText(/email address/i), 'user2@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password456')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenLastCalledWith('user2@example.com', 'password456')
      })
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should recover from network errors', async () => {
      const user = userEvent.setup()
      
      // First attempt fails with network error
      mockAuth.signIn.mockRejectedValueOnce(new Error('Network error'))
      
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
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })

      // Second attempt
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle rate limiting gracefully', async () => {
      const user = userEvent.setup()
      
      mockAuth.signIn.mockResolvedValue({
        data: null,
        error: { message: 'Too many requests. Please try again later.' }
      })

      render(<LoginPage searchParams={mockSearchParams} />)
      
      await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(screen.getByText('Too many requests. Please try again later.')).toBeInTheDocument()
      })
    })
  })
})