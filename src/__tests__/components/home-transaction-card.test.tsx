import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HomeTransactionCard } from '@/components/ui/home-transaction-card'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import * as currencyConverter from '@/lib/utils/currency-converter'

// Mock the currency converter module
jest.mock('@/lib/utils/currency-converter', () => ({
  calculateTransactionDisplayAmounts: jest.fn(),
  triggerExchangeRateSync: jest.fn()
}))

// Mock the TransactionCard component
jest.mock('@/components/ui/transaction-card', () => ({
  TransactionCard: ({ amount, calculatedAmount, vendor, description }: {
    amount: string
    calculatedAmount?: string
    vendor: string
    description: string
  }) => (
    <div data-testid="transaction-card">
      <div data-testid="amount">{amount}</div>
      {calculatedAmount && <div data-testid="calculated-amount">{calculatedAmount}</div>}
      <div data-testid="vendor">{vendor}</div>
      <div data-testid="description">{description}</div>
    </div>
  )
}))

describe('HomeTransactionCard', () => {
  const mockTransaction: TransactionWithVendorAndPayment = {
    id: 'trans-123',
    user_id: 'user-456',
    vendor_id: 'vendor-789',
    payment_method_id: 'payment-123',
    transaction_date: '2024-03-15',
    amount: 28.50,
    original_currency: 'USD',
    exchange_rate: 35.09,
    description: 'Test transaction',
    title: 'Test Transaction',
    transaction_type: 'expense' as const,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
    vendors: {
      id: 'vendor-789',
      name: 'Test Vendor'
    },
    payment_methods: {
      id: 'payment-123',
      name: 'Main Card'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders transaction with primary amount only', async () => {
    const mockCalculate = currencyConverter.calculateTransactionDisplayAmounts as jest.MockedFunction<
      typeof currencyConverter.calculateTransactionDisplayAmounts
    >
    
    mockCalculate.mockResolvedValueOnce({
      primary: '$28.50',
      secondary: null,
      secondaryNeedsSync: false
    })

    render(<HomeTransactionCard transaction={mockTransaction} />)

    await waitFor(() => {
      expect(screen.getByTestId('amount')).toHaveTextContent('$28.50')
      expect(screen.getByTestId('vendor')).toHaveTextContent('Test Vendor')
      expect(screen.getByTestId('description')).toHaveTextContent('Test transaction')
      expect(screen.queryByTestId('calculated-amount')).not.toBeInTheDocument()
    })
  })

  it('renders transaction with both primary and secondary amounts', async () => {
    const mockCalculate = currencyConverter.calculateTransactionDisplayAmounts as jest.MockedFunction<
      typeof currencyConverter.calculateTransactionDisplayAmounts
    >
    
    mockCalculate.mockResolvedValueOnce({
      primary: '$28.50',
      secondary: '฿1,000.00',
      secondaryNeedsSync: false
    })

    render(<HomeTransactionCard transaction={mockTransaction} />)

    await waitFor(() => {
      expect(screen.getByTestId('amount')).toHaveTextContent('$28.50')
      expect(screen.getByTestId('calculated-amount')).toHaveTextContent('฿1,000.00')
      expect(screen.getByTestId('vendor')).toHaveTextContent('Test Vendor')
      expect(screen.getByTestId('description')).toHaveTextContent('Test transaction')
    })
  })

  it('triggers exchange rate sync when needed and retries calculation', async () => {
    const mockCalculate = currencyConverter.calculateTransactionDisplayAmounts as jest.MockedFunction<
      typeof currencyConverter.calculateTransactionDisplayAmounts
    >
    const mockTriggerSync = currencyConverter.triggerExchangeRateSync as jest.MockedFunction<
      typeof currencyConverter.triggerExchangeRateSync
    >
    
    // First call - needs sync
    mockCalculate.mockResolvedValueOnce({
      primary: '$28.50',
      secondary: null,
      secondaryNeedsSync: true
    })
    
    // Second call after sync - has secondary amount
    mockCalculate.mockResolvedValueOnce({
      primary: '$28.50',
      secondary: '฿999.00',
      secondaryNeedsSync: false
    })
    
    mockTriggerSync.mockResolvedValueOnce(true)

    render(<HomeTransactionCard transaction={mockTransaction} />)

    // Initial render with no secondary
    await waitFor(() => {
      expect(screen.getByTestId('amount')).toHaveTextContent('$28.50')
      expect(screen.queryByTestId('calculated-amount')).not.toBeInTheDocument()
    })

    // Verify sync was triggered
    expect(mockTriggerSync).toHaveBeenCalledTimes(1)

    // Fast-forward timer to trigger retry
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    // After retry, secondary amount should appear
    await waitFor(() => {
      expect(screen.getByTestId('calculated-amount')).toHaveTextContent('฿999.00')
    })
    
    expect(mockCalculate).toHaveBeenCalledTimes(2)
  })

  it('handles sync failure gracefully', async () => {
    const mockCalculate = currencyConverter.calculateTransactionDisplayAmounts as jest.MockedFunction<
      typeof currencyConverter.calculateTransactionDisplayAmounts
    >
    const mockTriggerSync = currencyConverter.triggerExchangeRateSync as jest.MockedFunction<
      typeof currencyConverter.triggerExchangeRateSync
    >
    
    mockCalculate.mockResolvedValueOnce({
      primary: '$28.50',
      secondary: null,
      secondaryNeedsSync: true
    })
    
    mockTriggerSync.mockResolvedValueOnce(false) // Sync fails

    render(<HomeTransactionCard transaction={mockTransaction} />)

    await waitFor(() => {
      expect(screen.getByTestId('amount')).toHaveTextContent('$28.50')
      expect(screen.queryByTestId('calculated-amount')).not.toBeInTheDocument()
    })

    // Sync was attempted but failed
    expect(mockTriggerSync).toHaveBeenCalledTimes(1)
    
    // Fast-forward timer - no retry should happen since sync failed
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    
    // Calculate should not be called again
    expect(mockCalculate).toHaveBeenCalledTimes(1)
  })

  it('handles calculation errors with fallback values', async () => {
    const mockCalculate = currencyConverter.calculateTransactionDisplayAmounts as jest.MockedFunction<
      typeof currencyConverter.calculateTransactionDisplayAmounts
    >

    // Mock console.error to avoid noise in test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* no-op */ })

    mockCalculate.mockRejectedValueOnce(new Error('Calculation failed'))

    const thbTransaction = { ...mockTransaction, amount: 1000, original_currency: 'THB' as const }
    render(<HomeTransactionCard transaction={thbTransaction} />)

    await waitFor(() => {
      // Should show fallback with only the recorded amount
      expect(screen.getByTestId('amount')).toHaveTextContent('฿1000.00')
      expect(screen.queryByTestId('calculated-amount')).not.toBeInTheDocument()
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error calculating display amounts:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })

  it('handles missing vendor name gracefully', async () => {
    const mockCalculate = currencyConverter.calculateTransactionDisplayAmounts as jest.MockedFunction<
      typeof currencyConverter.calculateTransactionDisplayAmounts
    >
    
    mockCalculate.mockResolvedValueOnce({
      primary: '$28.50',
      secondary: '฿1,000.00',
      secondaryNeedsSync: false
    })

    const transactionWithoutVendor = { 
      ...mockTransaction, 
      vendors: null 
    }
    
    render(<HomeTransactionCard transaction={transactionWithoutVendor} />)

    await waitFor(() => {
      expect(screen.getByTestId('vendor')).toHaveTextContent('Unknown Vendor')
    })
  })

  it('handles missing description gracefully', async () => {
    const mockCalculate = currencyConverter.calculateTransactionDisplayAmounts as jest.MockedFunction<
      typeof currencyConverter.calculateTransactionDisplayAmounts
    >
    
    mockCalculate.mockResolvedValueOnce({
      primary: '$28.50',
      secondary: '฿1,000.00',
      secondaryNeedsSync: false
    })

    const transactionWithoutDescription = { 
      ...mockTransaction, 
      description: null 
    }
    
    render(<HomeTransactionCard transaction={transactionWithoutDescription} />)

    await waitFor(() => {
      expect(screen.getByTestId('description')).toHaveTextContent('No description')
    })
  })

  it('correctly formats THB as primary currency', async () => {
    const mockCalculate = currencyConverter.calculateTransactionDisplayAmounts as jest.MockedFunction<
      typeof currencyConverter.calculateTransactionDisplayAmounts
    >
    
    mockCalculate.mockResolvedValueOnce({
      primary: '฿1,000.00',
      secondary: '$28.50',
      secondaryNeedsSync: false
    })

    const thbTransaction = { ...mockTransaction, original_currency: 'THB' as const }
    
    render(<HomeTransactionCard transaction={thbTransaction} />)

    await waitFor(() => {
      expect(screen.getByTestId('amount')).toHaveTextContent('฿1,000.00')
      expect(screen.getByTestId('calculated-amount')).toHaveTextContent('$28.50')
    })
  })
})