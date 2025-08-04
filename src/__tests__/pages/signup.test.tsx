import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/signup/page'
import { auth } from '@/lib/supabase/auth'

// Mock the auth module
jest.mock('@/lib/supabase/auth', () => ({
  auth: {
    signUp: jest.fn()
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

describe('SignupPage', () => {
  const mockSearchParams = Promise.resolve({})

  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
  })

  it('renders signup form elements', async () => {
    render(<SignupPage searchParams={mockSearchParams} />)
    
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('validates form inputs', async () => {
    const user = userEvent.setup()
    render(<SignupPage searchParams={mockSearchParams} />)
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    const user = userEvent.setup()
    render(<SignupPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), '123')
    await user.type(screen.getByLabelText(/confirm password/i), '123')
    
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })
  })

  it('validates password confirmation', async () => {
    const user = userEvent.setup()
    render(<SignupPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'different123')
    
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<SignupPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email address/i), 'invalid-email')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('successfully creates account and shows success message', async () => {
    const user = userEvent.setup()
    mockAuth.signUp.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null
    })

    render(<SignupPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument()
    })

    expect(mockAuth.signUp).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      { full_name: 'Test User' }
    )
  })

  it('handles signup errors', async () => {
    const user = userEvent.setup()
    mockAuth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'Email already registered' }
    })

    render(<SignupPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })
  })

  it('clears errors when user starts typing', async () => {
    const user = userEvent.setup()
    render(<SignupPage searchParams={mockSearchParams} />)
    
    // Trigger validation error first
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument()
    })
    
    // Start typing to clear error
    await user.type(screen.getByLabelText(/full name/i), 'T')
    
    await waitFor(() => {
      expect(screen.queryByText('All fields are required')).not.toBeInTheDocument()
    })
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup()
    mockAuth.signUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<SignupPage searchParams={mockSearchParams} />)
    
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
    expect(screen.getByLabelText(/full name/i)).toBeDisabled()
  })
})