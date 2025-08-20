import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import SignupPage from '@/app/signup/page'
import ErrorPage from '@/app/error/page'
import { GlobalActionProvider } from '@/contexts/GlobalActionContext'
import { ProtectedRoute } from '@/components/auth/protected-route'
import * as authLib from '@/lib/auth'

// Mock next/navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
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

// Mock auth lib for protected route tests
jest.mock('@/lib/auth', () => ({
  getAuthState: jest.fn()
}))

// Mock server actions to prevent actual server calls
jest.mock('@/app/login/actions', () => ({
  login: jest.fn(),
  signup: jest.fn()
}))

const mockAuthLib = authLib as jest.Mocked<typeof authLib>

describe('Authentication Error Scenarios', () => {
  // Get references to mocked functions
  const mockLogin = jest.requireMock('@/app/login/actions').login
  const mockSignup = jest.requireMock('@/app/login/actions').signup

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
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  describe('Component Rendering and Form Interactions', () => {
    it('should render login form correctly', async () => {
      renderWithProvider(<LoginPage />)
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /log in$/i })).toBeInTheDocument()
      expect(screen.getByText('Welcome to Joot')).toBeInTheDocument()
    })

    it('should render signup form correctly', async () => {
      renderWithProvider(<SignupPage />)
      
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument() 
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    })

    it('should call login action when form is submitted', async () => {
      const user = userEvent.setup()
      
      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in$/i }))
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
    })
  })

  describe('Form Input Validation', () => {
    it('should allow user to type in login form fields', async () => {
      const user = userEvent.setup()
      renderWithProvider(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })

    it('should allow user to type in signup form fields', async () => {
      const user = userEvent.setup()
      renderWithProvider(<SignupPage />)
      
      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(firstNameInput, 'John')
      await user.type(lastNameInput, 'Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      
      expect(firstNameInput).toHaveValue('John')
      expect(lastNameInput).toHaveValue('Doe')
      expect(emailInput).toHaveValue('john@example.com')
      expect(passwordInput).toHaveValue('password123')
    })

    it('should trigger form submission when login button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<LoginPage />)
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in$/i }))
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
    })

    it('should trigger form submission when signup button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<SignupPage />)
      
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled()
      })
    })
  })

  describe('Error Page Display', () => {
    it('should render error page structure', () => {
      render(<ErrorPage />)
      
      expect(screen.getByText('Authentication Error')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Try Again' })).toBeInTheDocument()
    })
  })

  describe('Protected Route Behavior', () => {
    it('should render protected route component when authenticated', () => {
      mockAuthLib.getAuthState.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' } as any
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('User Interface Elements', () => {
    it('should have demo login button in login page', () => {
      renderWithProvider(<LoginPage />)
      
      expect(screen.getByRole('button', { name: /log in to demo account/i })).toBeInTheDocument()
    })

    it('should have navigation link to signup from login', () => {
      renderWithProvider(<LoginPage />)
      
      expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument()
    })

    it('should have navigation link to login from signup', () => {
      renderWithProvider(<SignupPage />)
      
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should have documentation link in login page', () => {
      renderWithProvider(<LoginPage />)
      
      expect(screen.getByRole('link', { name: /view design system documentation/i })).toBeInTheDocument()
    })
  })

  describe('Form Accessibility', () => {
    it('should have proper form labels in login page', () => {
      renderWithProvider(<LoginPage />)
      
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('required')
    })

    it('should have proper form labels in signup page', () => {
      renderWithProvider(<SignupPage />)
      
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
      
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('required')
    })
  })
})