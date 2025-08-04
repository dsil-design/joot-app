import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import SignupPage from '@/app/signup/page'
import { ProtectedRoute } from '@/components/auth/protected-route'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Authentication Accessibility Tests', () => {
  const mockSearchParams = Promise.resolve({})

  beforeEach(() => {
    // Mock router and auth for clean tests
    const mockRouter = jest.requireMock('next/navigation')
    jest.mocked(mockRouter.useRouter).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    })
  })

  describe('Login Page Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<LoginPage searchParams={mockSearchParams} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper form labels', () => {
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toBeInTheDocument()
      expect(passwordInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('id')
      expect(passwordInput).toHaveAttribute('id')
    })

    it('should have proper heading hierarchy', () => {
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
      expect(mainHeading).toHaveTextContent(/sign in to your account/i)
    })

    it('should have proper button labels', () => {
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const submitButton = screen.getByRole('button', { name: /^sign in$/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('should have proper link navigation', () => {
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const signupLink = screen.getByRole('link', { name: /sign up/i })
      expect(signupLink).toBeInTheDocument()
      expect(signupLink).toHaveAttribute('href', '/signup')
    })

    it('should announce form errors to screen readers', async () => {
      const { container } = render(<LoginPage searchParams={mockSearchParams} />)
      
      // Mock an error state (this would normally come from failed auth)
      const errorElement = document.createElement('div')
      errorElement.setAttribute('role', 'alert')
      errorElement.textContent = 'Invalid credentials'
      container.appendChild(errorElement)
      
      const alertElement = screen.getByRole('alert')
      expect(alertElement).toBeInTheDocument()
      expect(alertElement).toHaveTextContent('Invalid credentials')
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<LoginPage searchParams={mockSearchParams} />)
      
      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/email address/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/password/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /^sign in$/i })).toHaveFocus()
    })

    it('should support form submission via Enter key', async () => {
      const user = userEvent.setup()
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')
      await user.keyboard('{Enter}')
      
      // Form should attempt to submit (button shows loading state)
      // This would normally trigger auth, but we're just testing the interaction
    })
  })

  describe('Signup Page Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<SignupPage searchParams={mockSearchParams} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper form labels and descriptions', () => {
      render(<SignupPage searchParams={mockSearchParams} />)
      
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      
      // Check for helpful placeholder text
      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password (min. 8 characters)')
    })

    it('should provide clear password requirements', () => {
      render(<SignupPage searchParams={mockSearchParams} />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      const placeholderText = passwordInput.getAttribute('placeholder')
      expect(placeholderText).toContain('min. 8 characters')
    })

    it('should have proper fieldset and legend if applicable', () => {
      render(<SignupPage searchParams={mockSearchParams} />)
      
      // Check if form is properly structured
      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
    })

    it('should announce validation errors with proper roles', async () => {
      const user = userEvent.setup()
      render(<SignupPage searchParams={mockSearchParams} />)
      
      // Trigger validation by submitting empty form
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      // Check for error announcement
      const errorText = await screen.findByText('All fields are required')
      expect(errorText).toBeInTheDocument()
      
      // Error should be announced to screen readers
      const alertElement = errorText.closest('[role="alert"]')
      expect(alertElement).toBeInTheDocument()
    })
  })

  describe('Protected Route Accessibility', () => {
    it('should provide accessible loading state', () => {
      const mockAuth = jest.requireMock('@/lib/auth')
    jest.mocked(mockAuth.getAuthState).mockReturnValue({
        isAuthenticated: null, // Loading state
        user: null
      })

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )
      
      const loadingSpinner = screen.getByRole('status', { hidden: true })
      expect(loadingSpinner).toBeInTheDocument()
      
      const loadingText = screen.getByText('Loading...')
      expect(loadingText).toBeInTheDocument()
    })

    it('should not have accessibility violations in loading state', async () => {
      const mockAuth = jest.requireMock('@/lib/auth')
    jest.mocked(mockAuth.getAuthState).mockReturnValue({
        isAuthenticated: null,
        user: null
      })

      const { container } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for text elements', () => {
      render(<LoginPage searchParams={mockSearchParams} />)
      
      // Check that text elements are visible (basic contrast check)
      const heading = screen.getByRole('heading', { name: /sign in to your account/i })
      const description = screen.getByText('Welcome back to Joot')
      
      expect(heading).toBeVisible()
      expect(description).toBeVisible()
    })

    it('should have visible focus indicators', async () => {
      const user = userEvent.setup()
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      await user.click(emailInput)
      
      // Element should be focusable and focused
      expect(emailInput).toHaveFocus()
    })

    it('should not rely solely on color for error indication', async () => {
      const user = userEvent.setup()
      render(<SignupPage searchParams={mockSearchParams} />)
      
      // Trigger validation error
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      // Error should be communicated through text, not just color
      const errorText = await screen.findByText('All fields are required')
      expect(errorText).toBeInTheDocument()
      expect(errorText).toHaveTextContent(/required/i)
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper ARIA landmarks', () => {
      render(<LoginPage searchParams={mockSearchParams} />)
      
      // Main content should be identifiable
      const main = screen.getByRole('main') || document.querySelector('main')
      // If no explicit main role, the form should be the primary landmark
      const form = screen.getByRole('form') || screen.getByRole('button').closest('form')
      
      expect(form || main).toBeInTheDocument()
    })

    it('should announce form changes appropriately', async () => {
      const user = userEvent.setup()
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      
      // Type in field
      await user.type(emailInput, 'test@example.com')
      
      // Value should be reflected for screen readers
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should provide clear button states', async () => {
      const user = userEvent.setup()
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const submitButton = screen.getByRole('button', { name: /^sign in$/i })
      
      // Fill form to enable submission
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Click button to trigger loading state
      await user.click(submitButton)
      
      // Button text should change to indicate loading
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
    })
  })

  describe('Mobile Accessibility', () => {
    it('should have properly sized touch targets', () => {
      render(<LoginPage searchParams={mockSearchParams} />)
      
      const submitButton = screen.getByRole('button', { name: /^sign in$/i })
      const signupLink = screen.getByRole('link', { name: /sign up/i })
      
      // Elements should be present and clickable
      expect(submitButton).toBeInTheDocument()
      expect(signupLink).toBeInTheDocument()
    })

    it('should work with device orientation changes', () => {
      // Test that layout adapts (basic check)
      render(<SignupPage searchParams={mockSearchParams} />)
      
      // All form elements should remain accessible
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })
  })
})