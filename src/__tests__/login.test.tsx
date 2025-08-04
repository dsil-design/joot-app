import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { auth } from '@/lib/supabase/auth'

// Mock the auth module
jest.mock('@/lib/supabase/auth', () => ({
  auth: {
    signIn: jest.fn()
  }
}))

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

const mockAuth = auth as jest.Mocked<typeof auth>

describe('LoginPage', () => {
  const mockSearchParams = Promise.resolve({})

  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
  })

  it('renders login form elements', async () => {
    render(<LoginPage searchParams={mockSearchParams} />)
    
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument()
    expect(screen.getByText('Welcome back to Joot')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('has correct input types', () => {
    render(<LoginPage searchParams={mockSearchParams} />)
    
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    
    expect(emailInput.type).toBe('email')
    expect(passwordInput.type).toBe('password')
  })

  it('has navigation links', () => {
    render(<LoginPage searchParams={mockSearchParams} />)
    
    const signUpText = screen.getByText("Don't have an account?")
    const signUpLink = screen.getByRole('link', { name: /sign up/i })
    
    expect(signUpText).toBeInTheDocument()
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink).toHaveAttribute('href', '/signup')
  })

  it('successfully logs in user and redirects to dashboard', async () => {
    const user = userEvent.setup()
    mockAuth.signIn.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null
    })

    render(<LoginPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    
    await waitFor(() => {
      expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles login errors', async () => {
    const user = userEvent.setup()
    mockAuth.signIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' }
    })

    render(<LoginPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('clears errors when user starts typing', async () => {
    const user = userEvent.setup()
    mockAuth.signIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' }
    })

    render(<LoginPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
    
    // Start typing to clear error
    await user.type(screen.getByLabelText(/email address/i), 'a')
    
    await waitFor(() => {
      expect(screen.queryByText('Invalid login credentials')).not.toBeInTheDocument()
    })
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup()
    mockAuth.signIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<LoginPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    expect(screen.getByLabelText(/email address/i)).toBeDisabled()
    expect(screen.getByLabelText(/password/i)).toBeDisabled()
  })

  it('handles unexpected errors gracefully', async () => {
    const user = userEvent.setup()
    mockAuth.signIn.mockRejectedValue(new Error('Network error'))

    render(<LoginPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    
    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
    })
  })
})
