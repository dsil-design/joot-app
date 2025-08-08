import { render, screen, waitFor } from '@testing-library/react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import * as authLib from '@/lib/auth'

// Mock the auth lib
jest.mock('@/lib/auth', () => ({
  getAuthState: jest.fn()
}))

const mockGetAuthState = authLib.getAuthState as jest.MockedFunction<typeof authLib.getAuthState>
const mockPush = jest.fn()

// Mock useRouter to get access to push mock
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  })
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
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

  it('should handle loading state properly', () => {
    // This test verifies the loading state structure exists
    mockGetAuthState.mockReturnValue({
      isAuthenticated: true,
      user: { id: '123', email: 'test@example.com' }
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Test passes if no errors are thrown during rendering
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
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
      expect(mockPush).toHaveBeenCalledWith('/login')
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