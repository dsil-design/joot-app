import { render, screen, waitFor } from '@testing-library/react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import * as authLib from '@/lib/auth'

// Mock the auth lib
jest.mock('@/lib/auth', () => ({
  getAuthState: jest.fn()
}))

const mockGetAuthState = authLib.getAuthState as jest.MockedFunction<typeof authLib.getAuthState>

// Mock window.location.href
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true
})

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.location.href = ''
  })

  it('should render children when user is authenticated', async () => {
    mockGetAuthState.mockReturnValue({
      isAuthenticated: true,
      user: { id: '123', email: 'test@example.com' }
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

  it('should show loading state initially', () => {
    mockGetAuthState.mockReturnValue({
      isAuthenticated: false,
      user: null
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
  })

  it('should redirect to login when user is not authenticated', async () => {
    mockGetAuthState.mockReturnValue({
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

  it('should render fallback when provided and user is not authenticated', async () => {
    mockGetAuthState.mockReturnValue({
      isAuthenticated: false,
      user: null
    })

    render(
      <ProtectedRoute fallback={<div>Please login</div>}>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(screen.getByText('Please login')).toBeInTheDocument()
    })
  })
})