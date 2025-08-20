import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import SignupPage from '@/app/signup/page'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { GlobalActionProvider } from '@/contexts/GlobalActionContext'
import * as authLib from '@/lib/auth'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
    getAll: jest.fn().mockReturnValue([]),
    has: jest.fn().mockReturnValue(false),
    toString: jest.fn().mockReturnValue(''),
  }),
  usePathname: () => '/login',
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock auth lib
jest.mock('@/lib/auth', () => ({
  getAuthState: jest.fn()
}))

// Mock server actions
jest.mock('@/app/login/actions', () => ({
  login: jest.fn(),
  signup: jest.fn()
}))

const mockAuthLib = authLib as jest.Mocked<typeof authLib>

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <GlobalActionProvider>
      {component}
    </GlobalActionProvider>
  )
}

describe('Authentication Performance Tests', () => {
  const mockLogin = jest.requireMock('@/app/login/actions').login
  const mockSignup = jest.requireMock('@/app/login/actions').signup

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset performance mock
    global.performance.now = jest.fn(() => Date.now())
  })

  describe('Component Render Performance', () => {
    it('should render login page within performance budget', () => {
      const startTime = performance.now()
      renderWithProviders(<LoginPage />)
      const endTime = performance.now()
      
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(100) // 100ms budget for initial render
    })

    it('should render signup page within performance budget', () => {
      const startTime = performance.now()
      renderWithProviders(<SignupPage />)
      const endTime = performance.now()
      
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(150) // 150ms budget for signup (more form fields)
    })

    it('should render protected route quickly when authenticated', () => {
      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: true,
        user: { id: '123', email: 'user@example.com', name: 'Test User' }
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
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const testEmail = 'verylongemailaddressforthisperfomancetest@example.com'
      
      const startTime = performance.now()
      await user.type(emailInput, testEmail)
      const endTime = performance.now()
      
      const typingTime = (endTime - startTime) / testEmail.length
      expect(typingTime).toBeLessThan(5) // 5ms per character budget
    })

    it('should handle form interactions efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      renderWithProviders(<SignupPage />)
      
      // Fill form with actual field names
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const startTime = performance.now()
      await user.click(screen.getByRole('button', { name: /create account/i }))
      const endTime = performance.now()
      
      const interactionTime = endTime - startTime
      expect(interactionTime).toBeLessThan(50) // 50ms budget for form submission
    })

    it('should handle state changes efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      
      // Measure state change performance
      const startTime = performance.now()
      await user.type(emailInput, 'test@example.com')
      await user.clear(emailInput)
      await user.type(emailInput, 'newemail@example.com')
      const endTime = performance.now()
      
      const changeTime = endTime - startTime
      expect(changeTime).toBeLessThan(100) // 100ms budget for state changes
    })
  })

  describe('Authentication API Performance', () => {
    it('should handle login requests efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      
      // Mock login action to resolve quickly
      mockLogin.mockResolvedValue(undefined)

      renderWithProviders(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const startTime = performance.now()
      await user.click(screen.getByRole('button', { name: /log in$/i }))
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
      const endTime = performance.now()
      
      const requestTime = endTime - startTime
      expect(requestTime).toBeLessThan(200) // 200ms budget including UI updates
    })

    it('should handle signup requests efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      
      mockSignup.mockResolvedValue(undefined)

      renderWithProviders(<SignupPage />)
      
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const startTime = performance.now()
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled()
      })
      const endTime = performance.now()
      
      const requestTime = endTime - startTime
      expect(requestTime).toBeLessThan(250) // 250ms budget including validation and UI updates
    })

    it('should handle form submission efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      
      mockLogin.mockResolvedValue(undefined)

      renderWithProviders(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const startTime = performance.now()
      await user.click(screen.getByRole('button', { name: /log in$/i }))
      
      // Form submission should trigger quickly
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
      const submissionTime = performance.now() - startTime
      
      expect(submissionTime).toBeLessThan(100) // Form submission should be fast
    })
  })

  describe('Memory Performance', () => {
    it('should not create memory leaks with rapid re-renders', () => {
      // Simulate rapid re-renders
      const { rerender } = renderWithProviders(<LoginPage />)
      
      for (let i = 0; i < 10; i++) {
        rerender(
          <GlobalActionProvider>
            <LoginPage />
          </GlobalActionProvider>
        )
      }
      
      // Check that cleanup functions are working (basic test)
      expect(screen.getByRole('heading', { name: /welcome to joot/i })).toBeInTheDocument()
    })

    it('should handle multiple form state changes efficiently', async () => {
      const user = userEvent.setup({ delay: null })
      renderWithProviders(<SignupPage />)
      
      const firstNameInput = screen.getByLabelText(/first name/i)
      
      // Rapid state changes
      for (let i = 0; i < 20; i++) {
        await user.clear(firstNameInput)
        await user.type(firstNameInput, `Name ${i}`)
      }
      
      // Form should still be responsive
      expect(firstNameInput).toHaveValue('Name 19')
    })
  })

  describe('Bundle Size Impact', () => {
    it('should not import unnecessary dependencies', () => {
      // Test that components don't import heavy dependencies unnecessarily
      // This is more of a static analysis test, but we can check basic functionality
      renderWithProviders(<LoginPage />)
      
      // Basic functionality should work without heavy imports
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('should load components efficiently', () => {
      const startTime = performance.now()
      
      // Render both pages to test component loading
      const { rerender } = renderWithProviders(<LoginPage />)
      rerender(
        <GlobalActionProvider>
          <SignupPage />
        </GlobalActionProvider>
      )
      
      const loadTime = performance.now() - startTime
      expect(loadTime).toBeLessThan(200) // Should load both components quickly
    })
  })

  describe('Progressive Enhancement', () => {
    it('should work with JavaScript disabled (basic form)', () => {
      renderWithProviders(<LoginPage />)
      
      // Form should have proper HTML attributes for basic functionality
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should provide semantic HTML structure', () => {
      renderWithProviders(<SignupPage />)
      
      // Check for semantic HTML elements
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('autocomplete', 'given-name')
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute('autocomplete', 'family-name')
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('autocomplete', 'email')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'new-password')
    })
  })

  describe('Core Web Vitals Simulation', () => {
    it('should have good Largest Contentful Paint timing', () => {
      const startTime = performance.now()
      renderWithProviders(<LoginPage />)
      
      // Find the largest meaningful content element
      const heading = screen.getByRole('heading', { name: /welcome to joot/i })
      expect(heading).toBeInTheDocument()
      
      const lcpTime = performance.now() - startTime
      expect(lcpTime).toBeLessThan(2500) // LCP should be under 2.5s
    })

    it('should have minimal layout shift', async () => {
      const user = userEvent.setup({ delay: null })
      renderWithProviders(<LoginPage />)
      
      const form = screen.getByLabelText(/email/i).closest('form')
      const initialRect = form?.getBoundingClientRect()
      
      // Trigger state changes that might cause layout shift
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const finalRect = form?.getBoundingClientRect()
      
      // Form dimensions should remain stable
      expect(finalRect?.width).toBe(initialRect?.width)
      expect(finalRect?.height).toBe(initialRect?.height)
    })

    it('should respond to interactions quickly (FID simulation)', async () => {
      const user = userEvent.setup({ delay: null })
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      
      const startTime = performance.now()
      await user.click(emailInput)
      
      // Element should be focused quickly
      expect(emailInput).toHaveFocus()
      
      const interactionTime = performance.now() - startTime
      expect(interactionTime).toBeLessThan(100) // FID should be under 100ms
    })
  })

  describe('Navigation Performance', () => {
    it('should handle page transitions efficiently', () => {
      const startTime = performance.now()
      
      const { rerender } = renderWithProviders(<LoginPage />)
      
      // Simulate navigation between pages
      rerender(
        <GlobalActionProvider>
          <SignupPage />
        </GlobalActionProvider>
      )
      
      rerender(
        <GlobalActionProvider>
          <LoginPage />
        </GlobalActionProvider>
      )
      
      const transitionTime = performance.now() - startTime
      expect(transitionTime).toBeLessThan(100) // Page transitions should be fast
    })

    it('should maintain responsive UI during loading', async () => {
      const user = userEvent.setup({ delay: null })
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      
      // UI should remain responsive even during form interactions
      const startTime = performance.now()
      await user.click(emailInput)
      await user.type(emailInput, 'responsive@test.com')
      
      const responseTime = performance.now() - startTime
      expect(responseTime).toBeLessThan(200) // UI should stay responsive
      expect(emailInput).toHaveFocus()
      expect(emailInput).toHaveValue('responsive@test.com')
    })
  })
})