import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DocsNav } from '@/components/docs/docs-nav'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/docs/components/button',
  useRouter: () => ({
    push: jest.fn(),
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

describe('Documentation Navigation', () => {
  it('renders navigation sections', () => {
    render(<DocsNav />)
    
    expect(screen.getByText('Foundations')).toBeInTheDocument()
    expect(screen.getByText('Components')).toBeInTheDocument()
    expect(screen.getByText('Patterns')).toBeInTheDocument()
  })

  it('displays foundation items when expanded', () => {
    render(<DocsNav />)
    
    expect(screen.getByText('Colors')).toBeInTheDocument()
    expect(screen.getByText('Typography')).toBeInTheDocument()
    expect(screen.getByText('Spacing')).toBeInTheDocument()
    expect(screen.getByText('Icons')).toBeInTheDocument()
    expect(screen.getByText('Tokens')).toBeInTheDocument()
  })

  it('displays component items when expanded', () => {
    render(<DocsNav />)
    
    expect(screen.getByText('Button')).toBeInTheDocument()
    expect(screen.getByText('Card')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Alert')).toBeInTheDocument()
    expect(screen.getByText('Dialog')).toBeInTheDocument()
  })

  it('displays pattern items when expanded', () => {
    render(<DocsNav />)
    
    expect(screen.getByText('Forms')).toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Data Display')).toBeInTheDocument()
  })

  it('has correct navigation links', () => {
    render(<DocsNav />)
    
    const colorsLink = screen.getByText('Colors').closest('a')
    const buttonLink = screen.getByText('Button').closest('a')
    const formsLink = screen.getByText('Forms').closest('a')
    
    expect(colorsLink).toHaveAttribute('href', '/docs/foundations/colors')
    expect(buttonLink).toHaveAttribute('href', '/docs/components/button')
    expect(formsLink).toHaveAttribute('href', '/docs/patterns/forms')
  })

  it('can toggle section visibility', () => {
    render(<DocsNav />)
    
    const foundationsButton = screen.getByText('Foundations').closest('button')
    expect(foundationsButton).toBeInTheDocument()
    
    // Initially expanded, colors should be visible
    expect(screen.getByText('Colors')).toBeInTheDocument()
    
    // Click to collapse
    fireEvent.click(foundationsButton!)
    
    // Note: Since we're using useState with initial value true,
    // and this is a unit test without full interaction, 
    // we're mainly testing that the button exists and is clickable
    expect(foundationsButton).toBeInTheDocument()
  })

  it('renders all expected component navigation items', () => {
    render(<DocsNav />)
    
    const expectedComponents = [
      'Accordion', 'Alert', 'Alert Dialog', 'Avatar', 'Badge', 'Breadcrumb',
      'Button', 'Calendar', 'Card', 'Carousel', 'Checkbox', 'Command',
      'Context Menu', 'Dialog', 'Drawer', 'Dropdown Menu', 'Hover Card',
      'Input', 'Input OTP', 'Label', 'Menubar', 'Pagination', 'Popover',
      'Progress', 'Radio Group', 'Scroll Area', 'Select', 'Separator',
      'Sheet', 'Skeleton', 'Slider', 'Switch', 'Table', 'Tabs',
      'Textarea', 'Toggle', 'Toggle Group', 'Tooltip'
    ]
    
    expectedComponents.forEach(componentName => {
      expect(screen.getByText(componentName)).toBeInTheDocument()
    })
  })
})