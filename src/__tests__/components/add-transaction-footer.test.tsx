import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AddTransactionFooter } from '@/components/page-specific/add-transaction-footer'

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
})

describe('AddTransactionFooter', () => {
  it('renders the footer with correct styling', () => {
    render(<AddTransactionFooter />)
    
    const footer = screen.getByRole('link', { name: /add transaction/i }).closest('div')
    expect(footer).toHaveClass(
      'fixed',
      'bottom-0',
      'left-0',
      'right-0',
      'z-50',
      'bg-white',
      'border-t',
      'border-zinc-200'
    )
  })

  it('renders the add transaction button with correct text and icon', () => {
    render(<AddTransactionFooter />)
    
    const button = screen.getByRole('button', { name: /add transaction/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass(
      'w-full',
      'gap-1.5',
      'px-4',
      'py-2',
      'bg-primary',
      'hover:bg-primary/90',
      'text-white',
      'rounded-lg'
    )

    // Check for Plus icon (lucide-react icon)
    const icon = button.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('size-5')

    // Check for button text
    expect(screen.getByText('Add transaction')).toBeInTheDocument()
  })

  it('links to the correct add-transaction page', () => {
    render(<AddTransactionFooter />)
    
    const link = screen.getByRole('link', { name: /add transaction/i })
    expect(link).toHaveAttribute('href', '/add-transaction')
    expect(link).toHaveClass('w-full')
  })

  it('applies custom className when provided', () => {
    const customClass = 'custom-footer-class'
    render(<AddTransactionFooter className={customClass} />)
    
    const footer = screen.getByRole('link', { name: /add transaction/i }).closest('div')
    expect(footer).toHaveClass(customClass)
  })

  it('maintains default styling when no className provided', () => {
    render(<AddTransactionFooter />)
    
    const footer = screen.getByRole('link', { name: /add transaction/i }).closest('div')
    expect(footer?.className).toContain('fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 flex flex-col gap-2.5 pb-12 pt-6 px-10')
  })

  it('has proper accessibility attributes', () => {
    render(<AddTransactionFooter />)
    
    const button = screen.getByRole('button', { name: /add transaction/i })
    expect(button).toBeInTheDocument()
    
    const link = screen.getByRole('link', { name: /add transaction/i })
    expect(link).toBeInTheDocument()
  })

  it('uses correct typography classes for the button text', () => {
    render(<AddTransactionFooter />)
    
    const buttonText = screen.getByText('Add transaction')
    expect(buttonText).toHaveClass(
      'text-[14px]',
      'font-medium',
      'leading-[20px]'
    )
  })

  it('applies correct spacing and layout classes', () => {
    render(<AddTransactionFooter />)
    
    const footer = screen.getByRole('link', { name: /add transaction/i }).closest('div')
    expect(footer).toHaveClass(
      'flex',
      'flex-col',
      'gap-2.5',
      'pb-12',
      'pt-6',
      'px-10'
    )
  })

  it('renders as a fixed positioned element', () => {
    render(<AddTransactionFooter />)
    
    const footer = screen.getByRole('link', { name: /add transaction/i }).closest('div')
    expect(footer).toHaveClass('fixed', 'bottom-0', 'z-50')
  })

  it('maintains button styling consistency', () => {
    render(<AddTransactionFooter />)
    
    const button = screen.getByRole('button')
    
    // Check for primary color scheme
    expect(button).toHaveClass('bg-primary', 'hover:bg-primary/90', 'text-white')
    
    // Check for proper sizing and spacing
    expect(button).toHaveClass('w-full', 'gap-1.5', 'px-4', 'py-2')
    
    // Check for border radius
    expect(button).toHaveClass('rounded-lg')
  })
})