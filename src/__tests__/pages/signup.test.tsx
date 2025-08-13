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
    render(<SignupPage />)
    
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('allows filling out the form fields', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)
    
    await user.type(screen.getByLabelText(/first name/i), 'Test')
    await user.type(screen.getByLabelText(/last name/i), 'User')
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument()
    expect(screen.getByDisplayValue('User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('password123')).toBeInTheDocument()
  })
})