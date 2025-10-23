import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomePageClient } from '@/components/shared/HomePageClient'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

jest.mock('@/hooks/use-transactions', () => ({
  useTransactions: () => ({
    createTransaction: jest.fn().mockResolvedValue({ id: 'new-transaction-id' }),
  }),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock HomeTransactionList to avoid Supabase dependencies
jest.mock('@/components/page-specific/home-transaction-list', () => ({
  HomeTransactionList: ({ transactionGroups }: any) => (
    <div data-testid="transaction-list">
      {Object.keys(transactionGroups).map(date => (
        <div key={date}>{date}</div>
      ))}
    </div>
  ),
}))

// Mock AddTransactionFooter
jest.mock('@/components/page-specific/add-transaction-footer', () => ({
  AddTransactionFooter: () => <footer data-testid="sticky-footer" />,
}))

// Mock UserMenu
jest.mock('@/components/page-specific/user-menu', () => ({
  UserMenu: ({ children }: any) => <div data-testid="user-menu">{children}</div>,
}))

describe('HomePageClient', () => {
  const mockTransactions: TransactionWithVendorAndPayment[] = [
    {
      id: '1',
      amount: 1000,
      original_currency: 'USD',
      transaction_type: 'income',
      transaction_date: new Date().toISOString().slice(0, 10),
      description: 'Salary',
      user_id: 'test-user-id',
      vendor_id: null,
      payment_method_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vendors: null,
      payment_methods: null,
    },
    {
      id: '2',
      amount: 500,
      original_currency: 'USD',
      transaction_type: 'expense',
      transaction_date: new Date().toISOString().slice(0, 10),
      description: 'Groceries',
      user_id: 'test-user-id',
      vendor_id: null,
      payment_method_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vendors: null,
      payment_methods: null,
    },
  ]

  const mockYTDSummary = {
    income: 10000,
    expenses: 6000,
    net: 4000,
    currency: 'USD' as const,
    transactionCount: 50,
    incomeCount: 10,
    expenseCount: 40,
    averageMonthlyIncome: 1000,
    averageMonthlyExpenses: 600,
    monthsElapsed: 10,
    savingsRate: 40
  }

  const mockMonthlyTrend = [
    { month: 'Jan 2025', income: 900, expenses: 500, net: 400 },
    { month: 'Feb 2025', income: 950, expenses: 550, net: 400 },
    { month: 'Mar 2025', income: 1000, expenses: 600, net: 400 }
  ]

  const mockTopVendors = [
    { vendorId: 'v1', vendorName: 'Amazon', totalAmount: 1200, transactionCount: 15, percentOfTotal: 35 },
    { vendorId: 'v2', vendorName: 'Starbucks', totalAmount: 800, transactionCount: 20, percentOfTotal: 23 },
    { vendorId: 'v3', vendorName: 'Whole Foods', totalAmount: 600, transactionCount: 10, percentOfTotal: 17 }
  ]

  const mockProps = {
    fullName: 'Test User',
    userInitials: 'TU',
    userEmail: 'test@example.com',
    isAdmin: false,
    currentMonthName: 'October 2025',
    enhancedMonthlySummary: {
      income: 1000,
      expenses: 500,
      net: 500,
      currency: 'USD' as const,
      transactionCount: 2,
      incomeCount: 1,
      expenseCount: 1,
      previousMonth: {
        income: { current: 1000, previous: 900, changePercent: 11.1, changeDirection: 'up' as const },
        expenses: { current: 500, previous: 600, changePercent: -16.7, changeDirection: 'down' as const },
        net: { current: 500, previous: 300, changePercent: 66.7, changeDirection: 'up' as const }
      },
      twelveMonthAverage: {
        income: { current: 1000, previous: 950, changePercent: 5.3, changeDirection: 'up' as const },
        expenses: { current: 500, previous: 550, changePercent: -9.1, changeDirection: 'down' as const },
        net: { current: 500, previous: 400, changePercent: 25.0, changeDirection: 'up' as const }
      },
      dailySpendTrend: [
        { date: '2025-10-01', amount: 25 },
        { date: '2025-10-02', amount: 30 },
        { date: '2025-10-03', amount: 20 }
      ],
      daysElapsed: 21,
      daysInMonth: 31,
      percentElapsed: 68
    },
    ytdSummary: mockYTDSummary,
    monthlyTrend: mockMonthlyTrend,
    allTrendData: mockMonthlyTrend,
    topVendors: mockTopVendors,
    exchangeRate: '฿35.00',
    exchangeRateTimestamp: 'Oct 21, 2025 at 10:00 AM',
    transactionGroups: {
      'Oct 21, 2025': mockTransactions,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Monthly Summary Display', () => {
    it('should display current month name', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.getByText('October 2025')).toBeInTheDocument()
    })

    it('should display monthly income correctly', () => {
      render(<HomePageClient {...mockProps} />)

      const incomeLabels = screen.getAllByText('Total Income')
      expect(incomeLabels.length).toBeGreaterThan(0)

      const incomeValues = screen.getAllByText('$1000.00')
      expect(incomeValues.length).toBeGreaterThan(0)

      const transactions = screen.getAllByText(/1 transaction/)
      expect(transactions.length).toBeGreaterThan(0)
    })

    it('should display monthly expenses correctly', () => {
      render(<HomePageClient {...mockProps} />)

      const expenseLabels = screen.getAllByText('Total Expenses')
      expect(expenseLabels.length).toBeGreaterThan(0)

      const expenseValues = screen.getAllByText('$500.00')
      expect(expenseValues.length).toBeGreaterThan(0)

      const transactions = screen.getAllByText(/1 transaction/)
      expect(transactions.length).toBeGreaterThan(0)
    })

    it('should display net surplus correctly', () => {
      render(<HomePageClient {...mockProps} />)

      const surplusLabels = screen.getAllByText('Net Surplus')
      expect(surplusLabels.length).toBeGreaterThan(0)

      const netValues = screen.getAllByText('$500.00')
      expect(netValues.length).toBeGreaterThan(0)

      expect(screen.getByText(/2 total transactions?/)).toBeInTheDocument()
    })

    it('should display net deficit correctly when expenses exceed income', () => {
      const deficitProps = {
        ...mockProps,
        enhancedMonthlySummary: {
          ...mockProps.enhancedMonthlySummary,
          income: 500,
          expenses: 1000,
          net: -500,
        },
        ytdSummary: {
          ...mockYTDSummary,
          net: -500,
        },
      }

      render(<HomePageClient {...deficitProps} />)

      const deficitLabels = screen.getAllByText('Net Deficit')
      expect(deficitLabels.length).toBeGreaterThan(0)

      const deficitValues = screen.getAllByText('$500.00')
      expect(deficitValues.length).toBeGreaterThan(0)
    })

    it('should use green color for surplus', () => {
      render(<HomePageClient {...mockProps} />)

      const surplusValue = screen.getAllByText('$500.00').find(el =>
        el.className.includes('text-green-600')
      )

      expect(surplusValue).toBeInTheDocument()
    })

    it('should use red color for deficit', () => {
      const deficitProps = {
        ...mockProps,
        enhancedMonthlySummary: {
          ...mockProps.enhancedMonthlySummary,
          income: 500,
          expenses: 1000,
          net: -500,
        },
      }

      render(<HomePageClient {...deficitProps} />)

      const deficitValue = screen.getAllByText('$500.00').find(el =>
        el.className.includes('text-red-600')
      )

      expect(deficitValue).toBeInTheDocument()
    })

    it('should display plural transactions correctly', () => {
      const multipleProps = {
        ...mockProps,
        enhancedMonthlySummary: {
          ...mockProps.enhancedMonthlySummary,
          incomeCount: 5,
          expenseCount: 10,
          transactionCount: 15,
        },
      }

      render(<HomePageClient {...multipleProps} />)

      expect(screen.getByText('5 transactions')).toBeInTheDocument()

      // "10 transactions" may appear multiple times (monthly summary + top vendors)
      const tenTransactions = screen.getAllByText('10 transactions')
      expect(tenTransactions.length).toBeGreaterThan(0)

      expect(screen.getByText('15 total transactions')).toBeInTheDocument()
    })

    it('should handle zero transactions gracefully', () => {
      const zeroProps = {
        ...mockProps,
        enhancedMonthlySummary: null,
        transactionGroups: {},
      }

      render(<HomePageClient {...zeroProps} />)

      const zeroValues = screen.getAllByText('$0.00')
      expect(zeroValues.length).toBeGreaterThan(0)

      const zeroTransactions = screen.getAllByText(/0 transactions?/)
      expect(zeroTransactions.length).toBeGreaterThan(0)
    })
  })

  describe('Exchange Rate Display', () => {
    it('should display latest exchange rate', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.getByText('Latest exchange rate')).toBeInTheDocument()
      expect(screen.getByText('฿35.00')).toBeInTheDocument()
      expect(screen.getByText('1 USD')).toBeInTheDocument()
    })

    it('should display exchange rate timestamp', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.getByText(/as of Oct 21, 2025 at 10:00 AM/i)).toBeInTheDocument()
    })
  })

  describe('Add Transaction Modal', () => {
    it('should not show modal initially', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should open modal when clicking Add Transaction button', async () => {
      const user = userEvent.setup()
      render(<HomePageClient {...mockProps} />)

      const addButtons = screen.getAllByRole('button', { name: /add transaction/i })
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Check for dialog heading
      const dialogTitle = screen.getByRole('heading', { name: /add transaction/i })
      expect(dialogTitle).toBeInTheDocument()
    })

    it('should close modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(<HomePageClient {...mockProps} />)

      // Open modal
      const addButtons = screen.getAllByRole('button', { name: /add transaction/i })
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Cancel - find cancel button within dialog
      const dialog = screen.getByRole('dialog')
      const cancelButton = within(dialog).getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should show info toast when canceling', async () => {
      const user = userEvent.setup()
      render(<HomePageClient {...mockProps} />)

      const addButtons = screen.getAllByRole('button', { name: /add transaction/i })
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      const cancelButton = within(dialog).getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(toast.info).toHaveBeenCalledWith('Transaction discarded')
    })
  })

  describe('Header and Navigation', () => {
    it('should display page title', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    })

    it('should display user avatar with initials', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.getByText('TU')).toBeInTheDocument()
    })

    it('should show Add Transaction button on desktop', () => {
      render(<HomePageClient {...mockProps} />)

      const buttons = screen.getAllByRole('button', { name: /add transaction/i })
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Recent Transactions', () => {
    it('should display Recent Transactions section header', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
    })

    it('should display View all link', () => {
      render(<HomePageClient {...mockProps} />)

      const viewAllLink = screen.getByRole('link', { name: /view all/i })
      expect(viewAllLink).toBeInTheDocument()
      expect(viewAllLink).toHaveAttribute('href', '/transactions')
    })

    it('should display transaction groups', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.getByText('Oct 21, 2025')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      const errorProps = {
        ...mockProps,
        errorMessage: 'unauthorized',
      }

      render(<HomePageClient {...errorProps} />)

      expect(screen.getByText('Access denied. Admin privileges required.')).toBeInTheDocument()
    })

    it('should not display error message when not provided', () => {
      render(<HomePageClient {...mockProps} />)

      expect(screen.queryByText('Access denied')).not.toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should render mobile sticky footer', () => {
      render(<HomePageClient {...mockProps} />)

      // Footer is always rendered (visibility controlled by CSS)
      const footer = screen.getByTestId('sticky-footer')
      expect(footer).toBeInTheDocument()
    })

    it('should have responsive grid classes', () => {
      const { container } = render(<HomePageClient {...mockProps} />)

      const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-3')
      expect(grid).toBeInTheDocument()
    })

    it('should have responsive padding classes', () => {
      const { container } = render(<HomePageClient {...mockProps} />)

      const mainContent = container.querySelector('.px-6.md\\:px-10')
      expect(mainContent).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<HomePageClient {...mockProps} />)

      const heading = screen.getByRole('heading', { level: 1, name: 'Home' })
      expect(heading).toBeInTheDocument()
    })

    it('should have accessible labels for metrics', () => {
      render(<HomePageClient {...mockProps} />)

      const incomeLabels = screen.getAllByText('Total Income')
      expect(incomeLabels.length).toBeGreaterThan(0)

      const expenseLabels = screen.getAllByText('Total Expenses')
      expect(expenseLabels.length).toBeGreaterThan(0)

      const netLabels = screen.getAllByText(/Net (Surplus|Deficit)/)
      expect(netLabels.length).toBeGreaterThan(0)
    })

    it('should have accessible links', () => {
      render(<HomePageClient {...mockProps} />)

      const viewAllLink = screen.getByRole('link', { name: /view all/i })
      expect(viewAllLink).toHaveAccessibleName()
    })
  })

  describe('Currency Formatting', () => {
    it('should format currency with 2 decimal places', () => {
      render(<HomePageClient {...mockProps} />)

      const incomeValue = screen.getAllByText('$1000.00')
      const expenseValue = screen.getAllByText('$500.00')

      expect(incomeValue.length).toBeGreaterThan(0)
      expect(expenseValue.length).toBeGreaterThan(0)
    })

    it('should handle fractional amounts', () => {
      const fractionalProps = {
        ...mockProps,
        enhancedMonthlySummary: {
          ...mockProps.enhancedMonthlySummary,
          income: 1234.56,
          expenses: 678.90,
          net: 555.66,
        },
      }

      render(<HomePageClient {...fractionalProps} />)

      const incomeValue = screen.getAllByText('$1234.56')
      const expenseValue = screen.getAllByText('$678.90')
      const netValue = screen.getAllByText('$555.66')

      expect(incomeValue.length).toBeGreaterThan(0)
      expect(expenseValue.length).toBeGreaterThan(0)
      expect(netValue.length).toBeGreaterThan(0)
    })
  })
})
