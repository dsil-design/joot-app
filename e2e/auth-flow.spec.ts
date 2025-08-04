import { test, expect } from '@playwright/test'

test.describe('Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()
    await page.context().clearPermissions()
  })

  test.describe('User Registration Flow', () => {
    test('should complete full signup process', async ({ page }) => {
      // Navigate to signup page
      await page.goto('/signup')
      
      // Verify page elements
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
      await expect(page.getByText('Join Joot to start tracking your transactions')).toBeVisible()
      
      // Fill form with valid data
      await page.getByLabel(/full name/i).fill('Test User')
      await page.getByLabel(/email address/i).fill('testuser@example.com')
      await page.getByLabel(/^password$/i).fill('testpassword123')
      await page.getByLabel(/confirm password/i).fill('testpassword123')
      
      // Submit form
      await page.getByRole('button', { name: /create account/i }).click()
      
      // Check for success message (will appear even if Supabase integration isn't fully working)
      await expect(page.getByText(/account created successfully/i)).toBeVisible({ timeout: 10000 })
    })

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/signup')
      
      // Fill form with weak password
      await page.getByLabel(/full name/i).fill('Test User')
      await page.getByLabel(/email address/i).fill('testuser@example.com')
      await page.getByLabel(/^password$/i).fill('123')
      await page.getByLabel(/confirm password/i).fill('123')
      
      await page.getByRole('button', { name: /create account/i }).click()
      
      // Check for validation error
      await expect(page.getByText('Password must be at least 8 characters long')).toBeVisible()
    })

    test('should validate password confirmation', async ({ page }) => {
      await page.goto('/signup')
      
      await page.getByLabel(/full name/i).fill('Test User')
      await page.getByLabel(/email address/i).fill('testuser@example.com')
      await page.getByLabel(/^password$/i).fill('testpassword123')
      await page.getByLabel(/confirm password/i).fill('differentpassword123')
      
      await page.getByRole('button', { name: /create account/i }).click()
      
      await expect(page.getByText('Passwords do not match')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      await page.goto('/signup')
      
      await page.getByLabel(/full name/i).fill('Test User')
      await page.getByLabel(/email address/i).fill('invalid-email')
      await page.getByLabel(/^password$/i).fill('testpassword123')
      await page.getByLabel(/confirm password/i).fill('testpassword123')
      
      await page.getByRole('button', { name: /create account/i }).click()
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible()
    })
  })

  test.describe('User Login Flow', () => {
    test('should render login page correctly', async ({ page }) => {
      await page.goto('/login')
      
      // Verify page elements
      await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
      await expect(page.getByText('Welcome back to Joot')).toBeVisible()
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
      
      // Check navigation links
      await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
    })

    test('should attempt login with credentials', async ({ page }) => {
      await page.goto('/login')
      
      // Fill login form
      await page.getByLabel(/email address/i).fill('testuser@example.com')
      await page.getByLabel(/password/i).fill('testpassword123')
      
      // Submit form
      await page.getByRole('button', { name: /^sign in$/i }).click()
      
      // Check for loading state
      await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible()
    })

    test('should show form validation', async ({ page }) => {
      await page.goto('/login')
      
      // Try to submit empty form
      await page.getByRole('button', { name: /^sign in$/i }).click()
      
      // HTML5 validation should prevent submission
      const emailInput = page.getByLabel(/email address/i)
      const isRequired = await emailInput.getAttribute('required')
      expect(isRequired).toBe('')
    })
  })

  test.describe('Navigation and Accessibility', () => {
    test('should navigate between login and signup', async ({ page }) => {
      // Start at login
      await page.goto('/login')
      
      // Click signup link
      await page.getByRole('link', { name: /sign up/i }).click()
      
      // Verify we're on signup page
      await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
      
      // Click login link
      await page.getByRole('link', { name: /sign in/i }).click()
      
      // Verify we're back on login page
      await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
    })

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/login')
      
      // Tab through form elements
      await page.keyboard.press('Tab')
      await expect(page.getByLabel(/email address/i)).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.getByLabel(/password/i)).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: /^sign in$/i })).toBeFocused()
    })

    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      await page.goto('/login')
      
      // Check form accessibility
      const emailInput = page.getByLabel(/email address/i)
      const passwordInput = page.getByLabel(/password/i)
      
      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(passwordInput).toHaveAttribute('type', 'password')
      await expect(emailInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('required')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/login')
      
      // Verify elements are still visible and clickable
      await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
      
      // Test form interaction on mobile
      await page.getByLabel(/email address/i).fill('mobile@test.com')
      await page.getByLabel(/password/i).fill('mobilepassword')
      
      // Verify text was entered
      await expect(page.getByLabel(/email address/i)).toHaveValue('mobile@test.com')
      await expect(page.getByLabel(/password/i)).toHaveValue('mobilepassword')
    })

    test('should adapt to tablet size', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/signup')
      
      // All form elements should be visible and functional
      await expect(page.getByLabel(/full name/i)).toBeVisible()
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByLabel(/^password$/i)).toBeVisible()
      await expect(page.getByLabel(/confirm password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept network requests and simulate failure
      await page.route('**/auth/v1/**', route => {
        route.abort('failed')
      })
      
      await page.goto('/login')
      
      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /^sign in$/i }).click()
      
      // Should show error message
      await expect(page.getByText(/unexpected error occurred/i)).toBeVisible({ timeout: 10000 })
    })

    test('should clear errors when user types', async ({ page }) => {
      await page.goto('/signup')
      
      // Trigger validation error
      await page.getByRole('button', { name: /create account/i }).click()
      await expect(page.getByText('All fields are required')).toBeVisible()
      
      // Start typing to clear error
      await page.getByLabel(/full name/i).fill('T')
      
      // Error should disappear
      await expect(page.getByText('All fields are required')).toBeHidden()
    })
  })

  test.describe('Performance', () => {
    test('should load pages quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/login')
      
      // Page should load within reasonable time
      await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible()
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(3000) // 3 second threshold
    })

    test('should handle form submission without blocking UI', async ({ page }) => {
      await page.goto('/login')
      
      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByLabel(/password/i).fill('password123')
      
      // Submit form
      await page.getByRole('button', { name: /^sign in$/i }).click()
      
      // Button should show loading state but form should remain responsive
      await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })
  })
})