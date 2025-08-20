import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ButtonPage from '@/app/docs/components/button/page'
import CardPage from '@/app/docs/components/card/page'
import InputPage from '@/app/docs/components/input/page'
import AlertPage from '@/app/docs/components/alert/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}))

describe('Component Documentation Pages', () => {
  describe('Button Page', () => {
    it('renders button page without errors', () => {
      render(<ButtonPage />)
      expect(screen.getByRole('heading', { level: 1, name: 'Button' })).toBeInTheDocument()
      expect(screen.getByText(/Display a button or a component that looks like a button/)).toBeInTheDocument()
    })

    it('displays button examples with variants', () => {
      render(<ButtonPage />)
      expect(screen.getByText('Examples')).toBeInTheDocument()
      expect(screen.getByText('Variants')).toBeInTheDocument()
      
      // Check for actual button variants - use getAllByRole to handle multiple elements
      const buttons = screen.getAllByRole('button')
      expect(buttons.find(button => button.textContent === 'Default')).toBeInTheDocument()
      expect(buttons.find(button => button.textContent === 'Secondary')).toBeInTheDocument()
      expect(buttons.find(button => button.textContent === 'Outline')).toBeInTheDocument()
      expect(buttons.find(button => button.textContent === 'Ghost')).toBeInTheDocument()
      expect(buttons.find(button => button.textContent === 'Link')).toBeInTheDocument()
      expect(buttons.find(button => button.textContent === 'Destructive')).toBeInTheDocument()
    })

    it('displays button sizes', () => {
      render(<ButtonPage />)
      expect(screen.getByText('Sizes')).toBeInTheDocument()
      // Use getAllByRole to handle multiple button elements
      const buttons = screen.getAllByRole('button')
      expect(buttons.find(button => button.textContent === 'Small')).toBeInTheDocument()
      expect(buttons.find(button => button.textContent === 'Large')).toBeInTheDocument()
    })

    it('includes installation and usage sections', () => {
      render(<ButtonPage />)
      expect(screen.getByText('Installation')).toBeInTheDocument()
      expect(screen.getByText('Usage')).toBeInTheDocument()
      expect(screen.getByText('API Reference')).toBeInTheDocument()
    })

    it('includes accessibility information', () => {
      render(<ButtonPage />)
      expect(screen.getByText('Accessibility')).toBeInTheDocument()
      expect(screen.getByText(/WAI-ARIA button pattern/)).toBeInTheDocument()
    })

    it('displays props table', () => {
      render(<ButtonPage />)
      expect(screen.getByText('variant')).toBeInTheDocument()
      expect(screen.getByText('size')).toBeInTheDocument()
      expect(screen.getByText('asChild')).toBeInTheDocument()
    })
  })

  describe('Card Page', () => {
    it('renders card page without errors', () => {
      render(<CardPage />)
      expect(screen.getByRole('heading', { level: 1, name: 'Card' })).toBeInTheDocument()
      expect(screen.getByText(/Display content with related information in a flexible container/)).toBeInTheDocument()
    })

    it('displays card examples', () => {
      render(<CardPage />)
      expect(screen.getByText('Examples')).toBeInTheDocument()
      // Check for the actual example sections that exist
      expect(screen.getByText('With Actions')).toBeInTheDocument()
    })

    it('includes installation and API reference', () => {
      render(<CardPage />)
      expect(screen.getByText('Installation')).toBeInTheDocument()
      expect(screen.getByText('API Reference')).toBeInTheDocument()
    })
  })

  describe('Input Page', () => {
    it('renders input page without errors', () => {
      render(<InputPage />)
      expect(screen.getByRole('heading', { level: 1, name: 'Input' })).toBeInTheDocument()
      expect(screen.getByText(/Display a form input field with various types and states/)).toBeInTheDocument()
    })

    it('displays input examples', () => {
      render(<InputPage />)
      expect(screen.getByText('Examples')).toBeInTheDocument()
      // Check for heading text instead of conflicting 'Default'
      expect(screen.getByRole('heading', { name: 'Default' })).toBeInTheDocument()
    })

    it('includes form field examples', () => {
      render(<InputPage />)
      expect(screen.getByText('Input Types')).toBeInTheDocument()
    })

    it('includes installation and API reference', () => {
      render(<InputPage />)
      expect(screen.getByText('Installation')).toBeInTheDocument()
      expect(screen.getByText('API Reference')).toBeInTheDocument()
    })
  })

  describe('Alert Page', () => {
    it('renders alert page without errors', () => {
      render(<AlertPage />)
      expect(screen.getByRole('heading', { level: 1, name: 'Alert' })).toBeInTheDocument()
      expect(screen.getByText(/Display an alert message to communicate important information/)).toBeInTheDocument()
    })

    it('displays alert examples with variants', () => {
      render(<AlertPage />)
      expect(screen.getByText('Examples')).toBeInTheDocument()
      // Check for the actual sections that exist
      expect(screen.getByText('Variants')).toBeInTheDocument()
    })

    it('includes installation and API reference', () => {
      render(<AlertPage />)
      expect(screen.getByText('Installation')).toBeInTheDocument()
      expect(screen.getByText('API Reference')).toBeInTheDocument()
    })
  })
})