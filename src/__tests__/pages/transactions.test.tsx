import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import TransactionsPage from '@/app/transactions/page'
import { useTransactionFlow } from '@/hooks/useTransactionFlow'
import { useTransactions } from '@/hooks/use-transactions'
import * as currencyConverter from '@/lib/utils/currency-converter'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'

// Mock hooks
jest.mock('@/hooks/useTransactionFlow', () => ({
  useTransactionFlow: jest.fn()
}))

jest.mock('@/hooks/use-transactions', () => ({
  useTransactions: jest.fn()
}))

jest.mock('@/lib/utils/currency-converter', () => ({
  calculateTransactionDisplayAmounts: jest.fn(),
  triggerExchangeRateSync: jest.fn()
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn()
  })
}))

describe.skip('TransactionsPage', () => {
  const mockTransactionFlow = {
    goBack: jest.fn(),
    cancelFlow: jest.fn(),
    isInFlow: false
  }

  const mockTransactionData: TransactionWithVendorAndPayment = {
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

  const mockTransactionsList = [
    mockTransactionData,
    {
      ...mockTransactionData,
      id: 'trans-124',
      transaction_date: '2024-03-14',
      amount: 500,
      original_currency: 'THB',
      description: 'Another transaction',
      title: 'Another Transaction',
      transaction_type: 'expense'
    } as TransactionWithVendorAndPayment
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    ;(useTransactionFlow as jest.Mock).mockReturnValue(mockTransactionFlow)
    ;(useTransactions as jest.Mock).mockReturnValue({
      transactions: mockTransactionsList,
      loading: false,
      error: null
    })
    
    ;(currencyConverter.calculateTransactionDisplayAmounts as jest.Mock).mockResolvedValue({
      primary: '$28.50',
      secondary: '฿1000.00',
      secondaryNeedsSync: false
    })
    
    ;(currencyConverter.triggerExchangeRateSync as jest.Mock).mockResolvedValue(true)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Page Structure', () => {
    it('renders the page header with navigation', () => {
      render(<TransactionsPage />)
      
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
      expect(screen.getByText('All Transactions')).toBeInTheDocument()
    })

    it('renders view mode selector', () => {
      render(<TransactionsPage />)
      
      expect(screen.getByText('View')).toBeInTheDocument()
      // The Select component should be present
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('displays transactions when available', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test transaction')).toBeInTheDocument()
        expect(screen.getByText('Another transaction')).toBeInTheDocument()
      })
    })

    it('groups transactions by date', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        // Should show date headers
        expect(screen.getByText('Today')).toBeInTheDocument() // 2024-03-15
        expect(screen.getByText('Yesterday')).toBeInTheDocument() // 2024-03-14
      })
    })
  })

  describe('Navigation', () => {
    it('calls goBack when back button is clicked', async () => {
      const user = userEvent.setup()
      render(<TransactionsPage />)

      const backButton = screen.getByRole('button', { name: /go back/i })
      await user.click(backButton)

      expect(mockTransactionFlow.goBack).toHaveBeenCalled()
    })
  })

  describe('View Modes', () => {
    it('defaults to recorded view mode', () => {
      render(<TransactionsPage />)
      
      // Default should be "Show recorded amounts"
      expect(screen.getByDisplayValue('Show recorded amounts')).toBeInTheDocument()
    })

    it('changes to all-usd view mode', async () => {
      const user = userEvent.setup()
      render(<TransactionsPage />)

      const select = screen.getByRole('combobox')
      await user.click(select)
      
      const allUsdOption = screen.getByText('Show all amounts in USD')
      await user.click(allUsdOption)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Show all amounts in USD')).toBeInTheDocument()
      })
    })

    it('changes to all-thb view mode', async () => {
      const user = userEvent.setup()
      render(<TransactionsPage />)

      const select = screen.getByRole('combobox')
      await user.click(select)
      
      const allThbOption = screen.getByText('Show all amounts in THB')
      await user.click(allThbOption)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Show all amounts in THB')).toBeInTheDocument()
      })
    })
  })

  describe('Transaction Card Component', () => {
    it('displays recorded amounts in recorded mode', async () => {
      render(<TransactionsPage />)

      await waitFor(() => {
        expect(currencyConverter.calculateTransactionDisplayAmounts).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'trans-123' })
        )
      })
    })

    it('displays USD amounts in all-usd mode', async () => {
      const user = userEvent.setup()
      render(<TransactionsPage />)

      const select = screen.getByRole('combobox')
      await user.click(select)
      
      const allUsdOption = screen.getByText('Show all amounts in USD')
      await user.click(allUsdOption)

      // In all-USD mode, it should show USD amounts without conversion
      await waitFor(() => {
        // Should not call currency converter in this mode
        expect(currencyConverter.calculateTransactionDisplayAmounts).not.toHaveBeenCalledWith(
          expect.objectContaining({ viewMode: 'all-usd' })
        )
      })
    })

    it('displays THB amounts in all-thb mode', async () => {
      const user = userEvent.setup()
      render(<TransactionsPage />)

      const select = screen.getByRole('combobox')
      await user.click(select)
      
      const allThbOption = screen.getByText('Show all amounts in THB')
      await user.click(allThbOption)

      // In all-THB mode, it should show THB amounts without conversion
      await waitFor(() => {
        // Should not call currency converter in this mode
        expect(currencyConverter.calculateTransactionDisplayAmounts).not.toHaveBeenCalledWith(
          expect.objectContaining({ viewMode: 'all-thb' })
        )
      })
    })
  })

  describe('Currency Conversion', () => {
    it('triggers sync when exchange rate is needed', async () => {
      ;(currencyConverter.calculateTransactionDisplayAmounts as jest.Mock).mockResolvedValueOnce({
        primary: '$28.50',
        secondary: null,
        secondaryNeedsSync: true
      }).mockResolvedValueOnce({
        primary: '$28.50',
        secondary: '฿1000.00',
        secondaryNeedsSync: false
      })

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(currencyConverter.triggerExchangeRateSync).toHaveBeenCalled()
      })

      // Fast-forward timer to trigger retry
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(currencyConverter.calculateTransactionDisplayAmounts).toHaveBeenCalledTimes(2)
      })
    })

    it('handles sync failure gracefully', async () => {
      ;(currencyConverter.calculateTransactionDisplayAmounts as jest.Mock).mockResolvedValueOnce({
        primary: '$28.50',
        secondary: null,
        secondaryNeedsSync: true
      })
      ;(currencyConverter.triggerExchangeRateSync as jest.Mock).mockResolvedValueOnce(false)

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(currencyConverter.triggerExchangeRateSync).toHaveBeenCalled()
      })

      // Fast-forward timer - no retry should happen since sync failed
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(currencyConverter.calculateTransactionDisplayAmounts).toHaveBeenCalledTimes(1)
    })

    it('handles conversion errors with fallback', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      ;(currencyConverter.calculateTransactionDisplayAmounts as jest.Mock).mockRejectedValueOnce(
        new Error('Conversion failed')
      )

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error calculating display amounts:',
          expect.any(Error)
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading and Error States', () => {
    it('shows loading state', () => {
      ;(useTransactions as jest.Mock).mockReturnValue({
        transactions: [],
        loading: true,
        error: null
      })

      render(<TransactionsPage />)

      expect(screen.getByText('Loading transactions...')).toBeInTheDocument()
    })

    it('shows error state', () => {
      ;(useTransactions as jest.Mock).mockReturnValue({
        transactions: [],
        loading: false,
        error: 'Failed to load transactions'
      })

      render(<TransactionsPage />)

      expect(screen.getByText('Error loading transactions')).toBeInTheDocument()
    })

    it('shows empty state when no transactions', () => {
      ;(useTransactions as jest.Mock).mockReturnValue({
        transactions: [],
        loading: false,
        error: null
      })

      render(<TransactionsPage />)

      expect(screen.getByText('No transactions yet')).toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('formats today\'s date as "Today"', async () => {
      const todayTransaction = {
        ...mockTransactionData,
        transaction_date: new Date().toISOString().split('T')[0]
      }
      
      ;(useTransactions as jest.Mock).mockReturnValue({
        transactions: [todayTransaction],
        loading: false,
        error: null
      })

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument()
      })
    })

    it('formats yesterday\'s date as "Yesterday"', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayTransaction = {
        ...mockTransactionData,
        transaction_date: yesterday.toISOString().split('T')[0]
      }
      
      ;(useTransactions as jest.Mock).mockReturnValue({
        transactions: [yesterdayTransaction],
        loading: false,
        error: null
      })

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText('Yesterday')).toBeInTheDocument()
      })
    })

    it('formats other dates correctly', async () => {
      const oldTransaction = {
        ...mockTransactionData,
        transaction_date: '2024-01-15'
      }
      
      ;(useTransactions as jest.Mock).mockReturnValue({
        transactions: [oldTransaction],
        loading: false,
        error: null
      })

      render(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByText('January 15, 2024')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<TransactionsPage />)

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<TransactionsPage />)

      const backButton = screen.getByRole('button', { name: /go back/i })
      backButton.focus()
      
      await user.keyboard('{Enter}')
      expect(mockTransactionFlow.goBack).toHaveBeenCalled()
    })
  })
})