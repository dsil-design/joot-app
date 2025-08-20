import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { auth } from '@/lib/supabase/auth'
import { GlobalActionProvider } from '@/contexts/GlobalActionContext'
import type { User } from '@supabase/supabase-js'
import type { AuthError } from '@supabase/supabase-js'

// Mock the auth module
jest.mock('@/lib/supabase/auth', () => ({
  auth: {
    signIn: jest.fn()
  }
}))

// Mock server actions
jest.mock('@/app/login/actions', () => ({
  login: jest.fn(),
  signup: jest.fn()
}))

// Import the mocked actions
import { login as mockLogin } from '@/app/login/actions'

// Mock useRouter and useSearchParams
const mockPush = jest.fn()
const mockSearchParams = {
  get: jest.fn().mockReturnValue(null),
  getAll: jest.fn().mockReturnValue([]),
  has: jest.fn().mockReturnValue(false),
  toString: jest.fn().mockReturnValue(''),
}
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useSearchParams: () => mockSearchParams
}))

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

// Helper function to create proper AuthError mock
const createMockAuthError = (message: string): AuthError => {
  const error = new Error(message) as AuthError
  error.status = 400
  return error
}

// Helper function to create mock session
const createMockSession = () => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: createMockUser()
})

const mockAuth = auth as jest.Mocked<typeof auth>

// Helper function to wrap components with GlobalActionProvider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <GlobalActionProvider>
      {component}
    </GlobalActionProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    ;(mockLogin as jest.Mock).mockClear()
  })

  it('renders login form elements', async () => {
    renderWithProvider(<LoginPage />)
    
    expect(screen.getByRole('heading', { name: /welcome to joot/i })).toBeInTheDocument()
    expect(screen.getByText('Log in to your account to continue')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument()
  })

  it('has correct input types', () => {
    renderWithProvider(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    
    expect(emailInput.type).toBe('email')
    expect(passwordInput.type).toBe('password')
  })

  it('has navigation links', () => {
    renderWithProvider(<LoginPage />)
    
    const signUpLink = screen.getByRole('link', { name: /create account/i })
    
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink).toHaveAttribute('href', '/signup')
  })

  it('allows user to fill form and submit', async () => {
    const user = userEvent.setup()
    ;(mockLogin as jest.Mock).mockResolvedValue(undefined)

    renderWithProvider(<LoginPage />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com')
    expect(screen.getByLabelText(/password/i)).toHaveValue('password123')
    
    await user.click(screen.getByRole('button', { name: /^log in$/i }))
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled()
    })
  })

  it('shows demo login button', async () => {
    renderWithProvider(<LoginPage />)
    
    expect(screen.getByRole('button', { name: /log in to demo account/i })).toBeInTheDocument()
  })

  it('has required form validation', async () => {
    renderWithProvider(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    expect(emailInput).toHaveAttribute('required')
    expect(passwordInput).toHaveAttribute('required')
  })

  it('has proper form autocomplete attributes', async () => {
    renderWithProvider(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    expect(emailInput).toHaveAttribute('autocomplete', 'email')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })
})
