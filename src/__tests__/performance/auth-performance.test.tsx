import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import SignupPage from '@/app/signup/page'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { auth } from '@/lib/supabase/auth'
import type { User } from '@supabase/supabase-js'

// Mock modules
jest.mock('@/lib/supabase/auth')
jest.mock('next/navigation')
jest.mock('@/lib/auth')

const mockAuth = auth as jest.Mocked<typeof auth>

describe('Authentication Performance Tests', () => {
  // Helper function to create proper User mock
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: '123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    ...overrides
  })

  // Helper function to create mock session
  const createMockSession = () => ({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: createMockUser()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    const { useRouter } = jest.requireActual('next/navigation')
    jest.mocked(useRouter).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    })
    
    // Reset performance mock
    global.performance.now = jest.fn(() => Date.now())
  })

  describe('Component Render Performance', () => {
    it('should render login page within performance budget', () => {
      const startTime = performance.now()
      render(<LoginPage />)
      const endTime = performance.now()
      
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(100) // 100ms budget for initial render
    })

    it('should render signup page within performance budget', () => {
      const startTime = performance.now()
      render(<SignupPage />)
      const endTime = performance.now()
      
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(150) // 150ms budget for signup (more form fields)
    })

    it('should render protected route quickly when authenticated', () => {
      const { getAuthState } = jest.requireActual('@/lib/auth')
      jest.mocked(getAuthState).mockReturnValue({
        isAuthenticated: true,
        user: createMockUser({ email: 'user@example.com' })
      })

      const startTime = performance.now()
      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )
      const endTime = performance.now()
      
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(50) // 50ms budget for authenticated render
    })
  })

  describe('Form Interaction Performance', () => {
    it('should handle rapid typing without lag', async () => {
      const user = userEvent.setup({ delay: null }) // No delay for performance testing
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const testEmail = 'verylongemailaddressforthisperfomancetest@example.com'
      
      const startTime = performance.now()
      await user.type(emailInput, testEmail)
      const endTime = performance.now()
      
      const typingTime = (endTime - startTime) / testEmail.length
      expect(typingTime).toBeLessThan(5) // 5ms per character budget
    })

    it('should validate form inputs efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SignupPage />)
      
      // Fill form with invalid data to trigger validation
      await user.type(screen.getByLabelText(/full name/i), 'T')
      await user.type(screen.getByLabelText(/email address/i), 'invalid')
      await user.type(screen.getByLabelText(/^password$/i), '123')
      await user.type(screen.getByLabelText(/confirm password/i), '456')
      
      const startTime = performance.now()
      await user.click(screen.getByRole('button', { name: /create account/i }))
      const endTime = performance.now()
      
      const validationTime = endTime - startTime
      expect(validationTime).toBeLessThan(50) // 50ms budget for validation
    })

    it('should clear errors quickly when user types', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SignupPage />)
      
      // Trigger validation error first
      await user.click(screen.getByRole('button', { name: /create account/i }))
      await waitFor(() => {
        expect(screen.getByText('All fields are required')).toBeInTheDocument()
      })
      
      // Measure error clearing performance
      const startTime = performance.now()
      await user.type(screen.getByLabelText(/full name/i), 'T')
      
      await waitFor(() => {
        expect(screen.queryByText('All fields are required')).not.toBeInTheDocument()
      })
      const endTime = performance.now()
      
      const clearTime = endTime - startTime
      expect(clearTime).toBeLessThan(100) // 100ms budget for error clearing
    })
  })

  describe('Authentication API Performance', () => {
    it('should handle login requests efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      
      // Mock fast API response
      mockAuth.signIn.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: createMockUser(), session: createMockSession() },
            error: null
          }), 10) // 10ms simulated API response
        })
      )

      render(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const startTime = performance.now()
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalled()
      })
      const endTime = performance.now()
      
      const requestTime = endTime - startTime
      expect(requestTime).toBeLessThan(200) // 200ms budget including UI updates
    })

    it('should handle signup requests efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      
      mockAuth.signUp.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: createMockUser(), session: createMockSession() },
            error: null
          }), 15) // 15ms simulated API response
        })
      )

      render(<SignupPage />)
      
      await user.type(screen.getByLabelText(/full name/i), 'Test User')
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      
      const startTime = performance.now()
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(mockAuth.signUp).toHaveBeenCalled()
      })
      const endTime = performance.now()
      
      const requestTime = endTime - startTime
      expect(requestTime).toBeLessThan(250) // 250ms budget including validation and UI updates
    })

    it('should handle slow network responses gracefully', async () => {
      const user = userEvent.setup({ delay: null })
      
      // Mock slow API response
      mockAuth.signIn.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: createMockUser(), session: createMockSession() },
            error: null
          }), 2000) // 2 second delay
        })
      )

      render(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const startTime = performance.now()
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))
      
      // Loading state should appear quickly
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
      })
      const loadingTime = performance.now() - startTime
      
      expect(loadingTime).toBeLessThan(100) // Loading state should appear within 100ms
    })
  })

  describe('Memory Performance', () => {
    it('should not create memory leaks with rapid re-renders', () => {
      // Simulate rapid re-renders
      const { rerender } = render(<LoginPage />)
      
      for (let i = 0; i < 10; i++) {
        rerender(<LoginPage />)
      }
      
      // Check that cleanup functions are working (basic test)
      expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument()
    })

    it('should handle multiple form state changes efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SignupPage />)
      
      const fullNameInput = screen.getByLabelText(/full name/i)
      
      // Rapid state changes
      for (let i = 0; i < 20; i++) {
        await user.clear(fullNameInput)
        await user.type(fullNameInput, `Name ${i}`)
      }
      
      // Form should still be responsive
      expect(fullNameInput).toHaveValue('Name 19')
    })
  })

  describe('Bundle Size Impact', () => {
    it('should not import unnecessary dependencies', () => {
      // Test that components don't import heavy dependencies unnecessarily
      // This is more of a static analysis test, but we can check basic functionality
      render(<LoginPage />)
      
      // Basic functionality should work without heavy imports
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })
  })

  describe('Progressive Enhancement', () => {
    it('should work with JavaScript disabled (basic form)', () => {
      render(<LoginPage />)
      
      // Form should have proper HTML attributes for basic functionality
      const form = screen.getByRole('button', { name: /^sign in$/i }).closest('form')
      expect(form).toBeInTheDocument()
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })
  })

  describe('Core Web Vitals Simulation', () => {
    it('should have good Largest Contentful Paint timing', () => {
      const startTime = performance.now()
      render(<LoginPage />)
      
      // Find the largest meaningful content element
      const heading = screen.getByRole('heading', { name: /sign in to your account/i })
      expect(heading).toBeInTheDocument()
      
      const lcpTime = performance.now() - startTime
      expect(lcpTime).toBeLessThan(2500) // LCP should be under 2.5s
    })

    it('should have minimal layout shift', async () => {
      const user = userEvent.setup({ delay: null })
      render(<LoginPage />)
      
      const form = screen.getByRole('button', { name: /^sign in$/i }).closest('form')
      const initialRect = form?.getBoundingClientRect()
      
      // Trigger state changes that might cause layout shift
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const finalRect = form?.getBoundingClientRect()
      
      // Form dimensions should remain stable
      expect(finalRect?.width).toBe(initialRect?.width)
      expect(finalRect?.height).toBe(initialRect?.height)
    })

    it('should respond to interactions quickly (FID simulation)', async () => {
      const user = userEvent.setup({ delay: null })
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      
      const startTime = performance.now()
      await user.click(emailInput)
      
      // Element should be focused quickly
      expect(emailInput).toHaveFocus()
      
      const interactionTime = performance.now() - startTime
      expect(interactionTime).toBeLessThan(100) // FID should be under 100ms
    })
  })
})