import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TransactionCard } from '@/components/ui/transaction-card'

describe('TransactionCard Phase 2 Features', () => {
  const defaultProps = {
    amount: '$25.50',
    vendor: 'Coffee Shop',
    description: 'Morning coffee',
  }

  describe('Static Card (non-interactive)', () => {
    it('renders without interactive features', () => {
      render(<TransactionCard {...defaultProps} />)
      
      const card = screen.getByText('Morning coffee').closest('[role="button"]')
      expect(card).toBeNull() // Should not have button role
    })

    it('does not have tabIndex when not interactive', () => {
      render(<TransactionCard {...defaultProps} />)
      
      const cardContainer = screen.getByText('Morning coffee').closest('div[tabindex]')
      expect(cardContainer).toBeNull()
    })
  })

  describe('Interactive Card', () => {
    const mockOnClick = jest.fn()

    beforeEach(() => {
      mockOnClick.mockClear()
    })

    it('renders with interactive features when interactive=true', () => {
      render(
        <TransactionCard 
          {...defaultProps} 
          interactive 
          onClick={mockOnClick}
        />
      )
      
      const card = screen.getByRole('button')
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('calls onClick when clicked', () => {
      render(
        <TransactionCard 
          {...defaultProps} 
          interactive 
          onClick={mockOnClick}
        />
      )
      
      const card = screen.getByRole('button')
      fireEvent.click(card)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when Enter key is pressed', () => {
      render(
        <TransactionCard 
          {...defaultProps} 
          interactive 
          onClick={mockOnClick}
        />
      )
      
      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: 'Enter' })
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when Space key is pressed', () => {
      render(
        <TransactionCard 
          {...defaultProps} 
          interactive 
          onClick={mockOnClick}
        />
      )
      
      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: ' ' })
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick for other keys', () => {
      render(
        <TransactionCard 
          {...defaultProps} 
          interactive 
          onClick={mockOnClick}
        />
      )
      
      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: 'Tab' })
      fireEvent.keyDown(card, { key: 'Escape' })
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('has comprehensive aria-label with all transaction details', () => {
      render(
        <TransactionCard 
          {...defaultProps}
          calculatedAmount="฿820.32"
          interactive 
          onClick={mockOnClick}
        />
      )
      
      const card = screen.getByRole('button')
      const ariaLabel = card.getAttribute('aria-label')
      
      expect(ariaLabel).toContain('Transaction: Morning coffee')
      expect(ariaLabel).toContain('Vendor: Coffee Shop')
      expect(ariaLabel).toContain('Amount: $25.50')
      expect(ariaLabel).toContain('Converted: ฿820.32')
    })

    it('has proper ARIA structure for screen readers', () => {
      render(
        <TransactionCard 
          {...defaultProps}
          calculatedAmount="฿820.32"
          interactive
          onClick={mockOnClick}
        />
      )
      
      // Check that groups exist
      const groups = screen.getAllByRole('group')
      expect(groups).toHaveLength(2)
      
      // Check that individual elements have proper labels
      expect(screen.getByText('Coffee Shop')).toHaveAttribute('aria-label', 'Vendor: Coffee Shop')
      expect(screen.getByText('$25.50')).toHaveAttribute('aria-label', 'Primary amount: $25.50')
      expect(screen.getByText('฿820.32')).toHaveAttribute('aria-label', 'Converted amount: ฿820.32')
    })

    it('has title attributes for truncated content', () => {
      const longDescription = 'This is a very long transaction description that might get truncated'
      const longVendor = 'Very Long Vendor Name That Exceeds Normal Length'
      
      render(
        <TransactionCard 
          amount="$25.50"
          vendor={longVendor}
          description={longDescription}
          interactive
          onClick={mockOnClick}
        />
      )
      
      const descriptionElement = screen.getByText(longDescription)
      const vendorElement = screen.getByText(longVendor)
      
      expect(descriptionElement).toHaveAttribute('title', longDescription)
      expect(vendorElement).toHaveAttribute('title', longVendor)
    })
  })

  describe('Styling and Classes', () => {
    it('applies custom className correctly', () => {
      const customClass = 'custom-transaction-card'
      render(
        <TransactionCard 
          {...defaultProps} 
          className={customClass}
        />
      )
      
      const card = screen.getByText('Morning coffee').closest(`.${customClass}`)
      expect(card).toBeInTheDocument()
    })

    it('has transition classes for smooth interactions', () => {
      render(
        <TransactionCard 
          {...defaultProps} 
          interactive
          onClick={jest.fn()}
        />
      )
      
      const card = screen.getByRole('button')
      expect(card.className).toContain('transition-shadow')
      expect(card.className).toContain('duration-200')
    })

    it('has hover and focus classes when interactive', () => {
      render(
        <TransactionCard 
          {...defaultProps} 
          interactive
          onClick={jest.fn()}
        />
      )
      
      const card = screen.getByRole('button')
      expect(card.className).toContain('cursor-pointer')
      expect(card.className).toContain('hover:shadow-md')
      expect(card.className).toContain('focus-within:ring-2')
    })
  })

  describe('Performance', () => {
    it('is memoized to prevent unnecessary re-renders', () => {
      render(<TransactionCard {...defaultProps} />)
      
      // Component should be wrapped with React.memo
      // React.memo creates an object, not a function
      expect(typeof TransactionCard).toBe('object')
      
      // Verify it's a React component
      expect(TransactionCard).toHaveProperty('$$typeof')
    })
  })
})