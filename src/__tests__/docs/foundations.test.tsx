import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ColorsPage from '@/app/docs/foundations/colors/page'
import TypographyPage from '@/app/docs/foundations/typography/page'
import SpacingPage from '@/app/docs/foundations/spacing/page'

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

describe('Foundations Documentation Pages', () => {
  describe('Colors Page', () => {
    it('renders colors page without errors', () => {
      render(<ColorsPage />)
      expect(screen.getByText('Colors')).toBeInTheDocument()
      expect(screen.getByText(/Our color system is built on CSS custom properties/)).toBeInTheDocument()
    })

    it('displays color sections', () => {
      render(<ColorsPage />)
      expect(screen.getByText('Base Colors')).toBeInTheDocument()
      expect(screen.getByText('Zinc Scale')).toBeInTheDocument()
      expect(screen.getByText('Red Scale')).toBeInTheDocument()
      expect(screen.getByText('Semantic Colors')).toBeInTheDocument()
    })

    it('displays color swatches with CSS variables', () => {
      render(<ColorsPage />)
      expect(screen.getByText('--black')).toBeInTheDocument()
      expect(screen.getByText('--white')).toBeInTheDocument()
      expect(screen.getByText('--primary')).toBeInTheDocument()
    })

    it('includes usage examples', () => {
      render(<ColorsPage />)
      expect(screen.getByText('Usage')).toBeInTheDocument()
      expect(screen.getByText('CSS Custom Properties')).toBeInTheDocument()
      expect(screen.getByText('Tailwind Classes')).toBeInTheDocument()
    })
  })

  describe('Typography Page', () => {
    it('renders typography page without errors', () => {
      render(<TypographyPage />)
      expect(screen.getByText('Typography')).toBeInTheDocument()
      expect(screen.getByText(/Typography scale and font system/)).toBeInTheDocument()
    })

    it('displays font family section', () => {
      render(<TypographyPage />)
      expect(screen.getByText('Font Family')).toBeInTheDocument()
      expect(screen.getByText('Geist Sans - Primary Font')).toBeInTheDocument()
      expect(screen.getByText('Geist Mono - Code Font')).toBeInTheDocument()
    })

    it('displays font sizes section', () => {
      render(<TypographyPage />)
      expect(screen.getByText('Font Sizes')).toBeInTheDocument()
      expect(screen.getByText('text-xs')).toBeInTheDocument()
      expect(screen.getByText('text-base')).toBeInTheDocument()
      expect(screen.getByText('text-4xl')).toBeInTheDocument()
    })

    it('displays font weights section', () => {
      render(<TypographyPage />)
      expect(screen.getByText('Font Weights')).toBeInTheDocument()
      expect(screen.getByText('font-normal')).toBeInTheDocument()
      expect(screen.getByText('font-bold')).toBeInTheDocument()
    })

    it('includes semantic typography examples', () => {
      render(<TypographyPage />)
      expect(screen.getByText('Semantic Typography')).toBeInTheDocument()
      expect(screen.getByText('Headings')).toBeInTheDocument()
      expect(screen.getByText('Text Variants')).toBeInTheDocument()
    })

    it('includes usage guidelines', () => {
      render(<TypographyPage />)
      expect(screen.getByText('Usage Guidelines')).toBeInTheDocument()
      expect(screen.getByText('Do')).toBeInTheDocument()
      expect(screen.getByText("Don't")).toBeInTheDocument()
    })
  })

  describe('Spacing Page', () => {
    it('renders spacing page without errors', () => {
      render(<SpacingPage />)
      expect(screen.getByText('Spacing')).toBeInTheDocument()
      expect(screen.getByText(/Consistent spacing system based on a 4px grid/)).toBeInTheDocument()
    })

    it('displays spacing scale', () => {
      render(<SpacingPage />)
      expect(screen.getByText('Spacing Scale')).toBeInTheDocument()
      expect(screen.getByText('p-0, m-0, gap-0')).toBeInTheDocument()
      expect(screen.getByText('p-4, m-4, gap-4')).toBeInTheDocument()
    })

    it('displays padding examples', () => {
      render(<SpacingPage />)
      expect(screen.getByText('Padding Examples')).toBeInTheDocument()
      expect(screen.getByText('All Sides')).toBeInTheDocument()
      expect(screen.getByText('Directional Padding')).toBeInTheDocument()
    })

    it('displays margin examples', () => {
      render(<SpacingPage />)
      expect(screen.getByText('Margin Examples')).toBeInTheDocument()
      expect(screen.getByText('Margin Between Elements')).toBeInTheDocument()
    })

    it('displays gap examples', () => {
      render(<SpacingPage />)
      expect(screen.getByText('Gap (Flexbox & Grid)')).toBeInTheDocument()
      expect(screen.getByText('Flex Gap')).toBeInTheDocument()
      expect(screen.getByText('Grid Gap')).toBeInTheDocument()
    })

    it('includes space utility examples', () => {
      render(<SpacingPage />)
      expect(screen.getByText('Space Utility')).toBeInTheDocument()
      expect(screen.getByText('space-y-2')).toBeInTheDocument()
      expect(screen.getByText('space-y-4')).toBeInTheDocument()
    })
  })
})