import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
})

describe('LoginPage', () => {
  it('renders login form elements', () => {
    render(<LoginPage />)
    
    // Check that key elements are present
    const heading = screen.getByRole('heading', { name: /login/i })
    const description = screen.getByText('Enter your details below to login')
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /^login$/i })
    const googleButton = screen.getByRole('button', { name: /login with google/i })
    
    expect(heading).toBeDefined()
    expect(description).toBeDefined()
    expect(emailInput).toBeDefined()
    expect(passwordInput).toBeDefined()
    expect(loginButton).toBeDefined()
    expect(googleButton).toBeDefined()
  })

  it('has correct input types', () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    
    expect(emailInput.type).toBe('email')
    expect(passwordInput.type).toBe('password')
  })

  it('displays logo and copyright', () => {
    render(<LoginPage />)
    
    const logo = screen.getByAltText('MynaUI Logo')
    const copyright = screen.getByText('© 2025 MynaUI')
    
    expect(logo).toBeDefined()
    expect(copyright).toBeDefined()
  })

  it('has navigation links', () => {
    render(<LoginPage />)
    
    const signUpText = screen.getByText("Don't have an account?")
    const forgotPasswordLink = screen.getByText('Forgot your password?')
    
    expect(signUpText).toBeDefined()
    expect(forgotPasswordLink).toBeDefined()
  })
})
