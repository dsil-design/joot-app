import React from 'react'
import { render } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import { GlobalActionProvider } from '@/contexts/GlobalActionContext'
import { toast } from 'sonner'

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  },
  Toaster: () => null
}))

// Mock server actions
jest.mock('@/app/login/actions', () => ({
  login: jest.fn(),
  signup: jest.fn()
}))

// Mock next/navigation with simple mocks
const mockPush = jest.fn()
const mockGet = jest.fn().mockReturnValue(null)

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn()
  }),
  useSearchParams: () => ({
    get: mockGet
  })
}))

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <GlobalActionProvider>
      {component}
    </GlobalActionProvider>
  )
}

describe('LoginPage - Toast Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  it('shows success toast when logout_successful param is present', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'success') return 'logout_successful'
      return null
    })
    
    renderWithProvider(<LoginPage />)

    expect(toast.success).toHaveBeenCalledWith('You are logged out!')
  })

  it('shows info toast when auth_failed param is present', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'error') return 'auth_failed'
      return null
    })
    
    renderWithProvider(<LoginPage />)

    expect(toast.info).toHaveBeenCalledWith('Please log in to access that page.')
  })

  it('does not show toast when no query params', () => {
    mockGet.mockReturnValue(null)
    
    renderWithProvider(<LoginPage />)

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('handles null searchParams gracefully', () => {
    // Mock useSearchParams to return null
    const mockUseSearchParams = jest.fn().mockReturnValue(null)
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
        refresh: jest.fn()
      }),
      useSearchParams: mockUseSearchParams
    }))

    renderWithProvider(<LoginPage />)

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('ignores unknown success codes', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'success') return 'unknown_code'
      return null
    })
    
    renderWithProvider(<LoginPage />)

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('ignores unknown error codes', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'error') return 'unknown_error'
      return null
    })
    
    renderWithProvider(<LoginPage />)

    expect(toast.info).not.toHaveBeenCalled()
  })

  it('renders login page structure correctly', () => {
    renderWithProvider(<LoginPage />)
    
    // Basic structure should be present for toast integration to work
    expect(document.body).toContainHTML('Welcome to Joot')
  })
})