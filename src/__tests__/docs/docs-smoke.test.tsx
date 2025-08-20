import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import DocsPage from '@/app/docs/page'
import DocsLayout from '@/app/docs/layout'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/docs',
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

// Mock next/link
jest.mock('next/link', () => {
  const MockedLink = ({ children, href }: { children: React.ReactNode, href: string }) => (
    <a href={href}>{children}</a>
  )
  MockedLink.displayName = 'Link'
  return MockedLink
})

describe('Documentation Smoke Tests', () => {
  describe('Main Documentation Page', () => {
    it('renders main docs page without crashing', () => {
      render(<DocsPage />)
      expect(screen.getByText('Joot Design System')).toBeInTheDocument()
    })

    it('displays main sections', () => {
      render(<DocsPage />)
      expect(screen.getByText('Foundations')).toBeInTheDocument()
      expect(screen.getByText('Components')).toBeInTheDocument()
      expect(screen.getByText('Patterns')).toBeInTheDocument()
    })

    it('displays feature highlights', () => {
      render(<DocsPage />)
      expect(screen.getByText('Features')).toBeInTheDocument()
      expect(screen.getByText('Dynamic Components')).toBeInTheDocument()
      expect(screen.getByText('Design Tokens')).toBeInTheDocument()
    })

    it('includes navigation links', () => {
      render(<DocsPage />)
      
      const getStartedLink = screen.getByText('Get Started').closest('a')
      const viewComponentsLink = screen.getByText('View Components').closest('a')
      
      expect(getStartedLink).toHaveAttribute('href', '/docs/foundations/colors')
      expect(viewComponentsLink).toHaveAttribute('href', '/docs/components')
    })

    it('displays description correctly', () => {
      render(<DocsPage />)
      expect(screen.getByText(/A comprehensive design system built with shadcn\/ui components/)).toBeInTheDocument()
      expect(screen.getByText(/dynamic documentation that stays in sync with your codebase/)).toBeInTheDocument()
    })
  })

  describe('Documentation Layout', () => {
    it('renders layout with children', () => {
      render(
        <DocsLayout>
          <div>Test Child Content</div>
        </DocsLayout>
      )
      
      expect(screen.getByText('Joot Design System')).toBeInTheDocument()
      expect(screen.getByText('Test Child Content')).toBeInTheDocument()
    })

    it('includes back to app navigation', () => {
      render(
        <DocsLayout>
          <div>Content</div>
        </DocsLayout>
      )
      
      const backLink = screen.getByRole('link', { name: /back to app/i })
      expect(backLink).toBeInTheDocument()
      expect(backLink).toHaveAttribute('href', '/login')
    })

    it('includes navigation sidebar', () => {
      render(
        <DocsLayout>
          <div>Content</div>
        </DocsLayout>
      )
      
      const sidebar = screen.getByRole('complementary') || document.querySelector('aside')
      expect(sidebar).toBeInTheDocument()
    })

    it('has proper layout structure', () => {
      render(
        <DocsLayout>
          <div>Content</div>
        </DocsLayout>
      )
      
      // Check for main layout elements
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(document.querySelector('aside')).toBeInTheDocument()
      expect(screen.getByText('Joot Design System')).toBeInTheDocument()
    })
  })

  describe('Documentation Routes Structure', () => {
    const expectedRoutes = {
      foundations: [
        'colors',
        'typography', 
        'spacing',
        'icons',
        'tokens'
      ],
      components: [
        'accordion', 'alert', 'alert-dialog', 'avatar', 'badge', 'breadcrumb',
        'button', 'calendar', 'card', 'carousel', 'checkbox', 'command',
        'context-menu', 'dialog', 'drawer', 'dropdown-menu', 'hover-card',
        'input', 'input-otp', 'label', 'menubar', 'pagination', 'popover',
        'progress', 'radio-group', 'scroll-area', 'select', 'separator',
        'sheet', 'skeleton', 'slider', 'switch', 'table', 'tabs',
        'textarea', 'toggle', 'toggle-group', 'tooltip'
      ],
      patterns: [
        'forms',
        'navigation',
        'data-display'
      ]
    }

    it('defines expected documentation structure', () => {
      // This test documents the expected route structure
      expect(expectedRoutes.foundations).toHaveLength(5)
      expect(expectedRoutes.components).toHaveLength(38)
      expect(expectedRoutes.patterns).toHaveLength(3)
      
      // Verify we have all the main shadcn components
      expect(expectedRoutes.components).toContain('button')
      expect(expectedRoutes.components).toContain('card')
      expect(expectedRoutes.components).toContain('input')
      expect(expectedRoutes.components).toContain('dialog')
      expect(expectedRoutes.components).toContain('table')
    })
  })
})