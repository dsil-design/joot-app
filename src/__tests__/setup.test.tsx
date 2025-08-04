import { render, screen } from '@testing-library/react'

// Simple test to verify Jest and React Testing Library setup
describe('Test Setup Validation', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Test Setup Working</div>
    
    render(<TestComponent />)
    
    expect(screen.getByText('Test Setup Working')).toBeInTheDocument()
  })

  it('should have access to Jest globals', () => {
    expect(jest).toBeDefined()
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
  })

  it('should have performance mock available', () => {
    expect(global.performance).toBeDefined()
    expect(global.performance.now).toBeDefined()
    
    const time = performance.now()
    expect(typeof time).toBe('number')
  })
})