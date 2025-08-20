import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/signup/page'
import LoginPage from '@/app/login/page'
import { ProtectedRoute } from '@/components/auth/protected-route'
import * as authLib from '@/lib/auth'
import { GlobalActionProvider } from '@/contexts/GlobalActionContext'

// Mock next/navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
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

// Mock auth lib for protected route tests
jest.mock('@/lib/auth', () => ({
  getAuthState: jest.fn()
}))

// Mock server actions
jest.mock('@/app/login/actions', () => ({
  login: jest.fn(),
  signup: jest.fn()
}))

const mockAuthLib = authLib as jest.Mocked<typeof authLib>

// Helper function to wrap components with GlobalActionProvider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <GlobalActionProvider>
      {component}
    </GlobalActionProvider>
  )
}

describe('Authentication Flow Integration Tests', () => {
  const mockLogin = jest.requireMock('@/app/login/actions').login
  const mockSignup = jest.requireMock('@/app/login/actions').signup

  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  describe('Signup Form Integration', () => {
    it('should render signup form with all required fields', async () => {
      renderWithProvider(<SignupPage />)
      
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should handle signup form submission', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<SignupPage />)
      
      // Fill signup form with actual field names
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Submit signup
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled()
      })
    })
  })

  describe('Login Form Integration', () => {
    it('should render login form with all required fields', async () => {
      renderWithProvider(<LoginPage />)
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /log in$/i })).toBeInTheDocument()
      expect(screen.getByText('Welcome to Joot')).toBeInTheDocument()
    })

    it('should handle login form submission', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<LoginPage />)
      
      // Fill login form
      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Submit login
      await user.click(screen.getByRole('button', { name: /log in$/i }))
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
    })

    it('should display demo login option', () => {
      renderWithProvider(<LoginPage />)
      
      expect(screen.getByRole('button', { name: /log in to demo account/i })).toBeInTheDocument()
    })
  })

  describe('Protected Route Access', () => {
    it('should allow access to authenticated users', async () => {
      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: true,
        user: { id: '123', email: 'authenticated@example.com', name: 'Test User' }
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

    it('should handle unauthenticated state', () => {
      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: false,
        user: null
      })

      render(
        <ProtectedRoute>
          <div>Dashboard Content</div>
        </ProtectedRoute>
      )

      // Should not show protected content immediately
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation Integration', () => {
    it('should validate required fields in signup form', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<SignupPage />)
      
      // Try to submit without filling required fields
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      // HTML5 validation should prevent submission
      const firstNameInput = screen.getByLabelText(/first name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(firstNameInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should validate required fields in login form', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<LoginPage />)
      
      // Try to submit without filling required fields
      await user.click(screen.getByRole('button', { name: /log in$/i }))
      
      // HTML5 validation should prevent submission
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
    })
  })

  describe('Navigation Integration', () => {
    it('should have navigation links between login and signup', () => {
      const { rerender } = renderWithProvider(<LoginPage />)
      
      expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/signup')
      
      rerender(
        <GlobalActionProvider>
          <SignupPage />
        </GlobalActionProvider>
      )
      
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
    })

    it('should have documentation link in login page', () => {
      renderWithProvider(<LoginPage />)
      
      expect(screen.getByRole('link', { name: /view design system documentation/i }))
        .toHaveAttribute('href', '/docs')
    })
  })

  describe('User Interface Integration', () => {
    it('should maintain consistent styling between forms', () => {
      const { rerender } = renderWithProvider(<LoginPage />)
      
      // Check login form structure
      expect(screen.getByRole('heading', { name: 'Welcome to Joot' })).toBeInTheDocument()
      expect(screen.getByText('Log in to your account to continue')).toBeInTheDocument()
      
      rerender(
        <GlobalActionProvider>
          <SignupPage />
        </GlobalActionProvider>
      )
      
      // Check signup form structure
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
      expect(screen.getByText('Sign up to start tracking your transactions')).toBeInTheDocument()
    })

    it('should show proper input types for form fields', () => {
      const { rerender } = renderWithProvider(<LoginPage />)
      
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
      
      rerender(
        <GlobalActionProvider>
          <SignupPage />
        </GlobalActionProvider>
      )
      
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
    })
  })

  describe('Accessibility Integration', () => {
    it('should have proper form labels and ARIA attributes', () => {
      renderWithProvider(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('id')
      expect(passwordInput).toHaveAttribute('id')
      expect(emailInput).toHaveAttribute('name')
      expect(passwordInput).toHaveAttribute('name')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in$/i })
      
      // Test tab navigation
      await user.tab()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })
  })
})