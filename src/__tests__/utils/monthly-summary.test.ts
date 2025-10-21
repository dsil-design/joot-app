import { calculateMonthlySummary, calculateEnhancedMonthlySummary } from '@/lib/utils/monthly-summary'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'

describe('calculateMonthlySummary', () => {
  // Helper function to create mock transaction
  const createMockTransaction = (
    id: string,
    amount: number,
    currency: 'USD' | 'THB',
    type: 'income' | 'expense',
    date: string
  ): TransactionWithVendorAndPayment => ({
    id,
    amount,
    original_currency: currency,
    transaction_type: type,
    transaction_date: date,
    description: `Test transaction ${id}`,
    user_id: 'test-user-id',
    vendor_id: null,
    payment_method_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    vendors: null,
    payment_methods: null,
  })

  describe('basic calculations', () => {
    it('should calculate totals correctly for USD transactions', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 500, 'USD', 'expense', '2025-10-20'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.income).toBe(1000)
      expect(summary.expenses).toBe(500)
      expect(summary.net).toBe(500)
      expect(summary.currency).toBe('USD')
      expect(summary.incomeCount).toBe(1)
      expect(summary.expenseCount).toBe(1)
      expect(summary.transactionCount).toBe(2)
    })

    it('should calculate totals correctly for THB transactions', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 35000, 'THB', 'income', '2025-10-15'),
        createMockTransaction('2', 17500, 'THB', 'expense', '2025-10-20'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.income).toBeCloseTo(1000, 2) // 35000 / 35 = 1000
      expect(summary.expenses).toBeCloseTo(500, 2) // 17500 / 35 = 500
      expect(summary.net).toBeCloseTo(500, 2)
      expect(summary.currency).toBe('USD')
    })

    it('should calculate totals correctly for mixed USD/THB transactions', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 17500, 'THB', 'expense', '2025-10-20'),
        createMockTransaction('3', 500, 'USD', 'expense', '2025-10-25'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.income).toBe(1000)
      expect(summary.expenses).toBeCloseTo(1000, 2) // 500 + (17500 / 35) = 1000
      expect(summary.net).toBeCloseTo(0, 2)
      expect(summary.transactionCount).toBe(3)
      expect(summary.incomeCount).toBe(1)
      expect(summary.expenseCount).toBe(2)
    })
  })

  describe('month filtering', () => {
    it('should filter transactions by specified month', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 500, 'USD', 'expense', '2025-09-20'), // Previous month
        createMockTransaction('3', 300, 'USD', 'expense', '2025-11-05'), // Next month
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.income).toBe(1000)
      expect(summary.expenses).toBe(0)
      expect(summary.transactionCount).toBe(1)
    })

    it('should use current month when no month parameter provided', () => {
      const today = new Date()
      const thisMonth = today.toISOString().slice(0, 7)

      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', `${thisMonth}-15`),
        createMockTransaction('2', 500, 'USD', 'expense', '2020-01-15'), // Old transaction
      ]

      const summary = calculateMonthlySummary(transactions)

      expect(summary.transactionCount).toBe(1)
      expect(summary.income).toBe(1000)
    })

    it('should handle transactions on month boundaries', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-10-01'), // First day
        createMockTransaction('2', 500, 'USD', 'expense', '2025-10-31'), // Last day
        createMockTransaction('3', 200, 'USD', 'expense', '2025-09-30'), // Day before
        createMockTransaction('4', 300, 'USD', 'income', '2025-11-01'), // Day after
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.transactionCount).toBe(2)
      expect(summary.income).toBe(1000)
      expect(summary.expenses).toBe(500)
    })
  })

  describe('currency conversion', () => {
    it('should convert THB to USD using provided exchange rate', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 3550, 'THB', 'income', '2025-10-15'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35.5)

      expect(summary.income).toBeCloseTo(100, 2) // 3550 / 35.5 = 100
    })

    it('should use default exchange rate of 35 when not provided', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 3500, 'THB', 'income', '2025-10-15'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'))

      expect(summary.income).toBeCloseTo(100, 2) // 3500 / 35 = 100
    })

    it('should maintain precision in currency conversion', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1234.56, 'THB', 'expense', '2025-10-15'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.expenses).toBeCloseTo(35.27, 2) // 1234.56 / 35 ≈ 35.27
    })
  })

  describe('transaction categorization', () => {
    it('should separate income and expense transactions', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 2000, 'USD', 'income', '2025-10-16'),
        createMockTransaction('3', 500, 'USD', 'expense', '2025-10-20'),
        createMockTransaction('4', 300, 'USD', 'expense', '2025-10-21'),
        createMockTransaction('5', 200, 'USD', 'expense', '2025-10-22'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.incomeCount).toBe(2)
      expect(summary.expenseCount).toBe(3)
      expect(summary.income).toBe(3000)
      expect(summary.expenses).toBe(1000)
    })

    it('should calculate net position correctly', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 5000, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 3000, 'USD', 'expense', '2025-10-20'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.net).toBe(2000) // 5000 - 3000 = 2000 (surplus)
    })

    it('should handle negative net position (deficit)', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 3000, 'USD', 'expense', '2025-10-20'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.net).toBe(-2000) // 1000 - 3000 = -2000 (deficit)
    })
  })

  describe('edge cases', () => {
    it('should handle empty transaction array', () => {
      const summary = calculateMonthlySummary([], new Date('2025-10-01'), 35)

      expect(summary.income).toBe(0)
      expect(summary.expenses).toBe(0)
      expect(summary.net).toBe(0)
      expect(summary.currency).toBe('USD')
      expect(summary.transactionCount).toBe(0)
      expect(summary.incomeCount).toBe(0)
      expect(summary.expenseCount).toBe(0)
    })

    it('should handle month with no transactions', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-09-15'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.transactionCount).toBe(0)
      expect(summary.income).toBe(0)
      expect(summary.expenses).toBe(0)
    })

    it('should handle only income transactions', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 2000, 'USD', 'income', '2025-10-20'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.income).toBe(3000)
      expect(summary.expenses).toBe(0)
      expect(summary.net).toBe(3000)
      expect(summary.incomeCount).toBe(2)
      expect(summary.expenseCount).toBe(0)
    })

    it('should handle only expense transactions', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'expense', '2025-10-15'),
        createMockTransaction('2', 500, 'USD', 'expense', '2025-10-20'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.income).toBe(0)
      expect(summary.expenses).toBe(1500)
      expect(summary.net).toBe(-1500)
      expect(summary.incomeCount).toBe(0)
      expect(summary.expenseCount).toBe(2)
    })

    it('should handle future dates gracefully', () => {
      const futureDate = new Date('2030-01-01')
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
      ]

      const summary = calculateMonthlySummary(transactions, futureDate, 35)

      expect(summary.transactionCount).toBe(0)
      expect(summary.income).toBe(0)
    })

    it('should handle very large amounts', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 1000000, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 35000000, 'THB', 'expense', '2025-10-20'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.income).toBe(1000000)
      expect(summary.expenses).toBeCloseTo(1000000, 2) // 35000000 / 35 = 1000000
      expect(summary.net).toBeCloseTo(0, 2)
    })

    it('should handle zero amount transactions', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 0, 'USD', 'income', '2025-10-15'),
        createMockTransaction('2', 0, 'USD', 'expense', '2025-10-20'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.income).toBe(0)
      expect(summary.expenses).toBe(0)
      expect(summary.net).toBe(0)
      expect(summary.transactionCount).toBe(2)
    })
  })

  describe('return type', () => {
    it('should always return currency as USD', () => {
      const transactions: TransactionWithVendorAndPayment[] = [
        createMockTransaction('1', 35000, 'THB', 'income', '2025-10-15'),
      ]

      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary.currency).toBe('USD')
    })

    it('should return all required fields', () => {
      const transactions: TransactionWithVendorAndPayment[] = []
      const summary = calculateMonthlySummary(transactions, new Date('2025-10-01'), 35)

      expect(summary).toHaveProperty('income')
      expect(summary).toHaveProperty('expenses')
      expect(summary).toHaveProperty('net')
      expect(summary).toHaveProperty('currency')
      expect(summary).toHaveProperty('transactionCount')
      expect(summary).toHaveProperty('incomeCount')
      expect(summary).toHaveProperty('expenseCount')
    })
  })

  describe('calculateEnhancedMonthlySummary', () => {
    describe('basic enhanced data structure', () => {
      it('should include all base monthly summary fields', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
          createMockTransaction('2', 500, 'USD', 'expense', '2025-10-20'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.income).toBe(1000)
        expect(enhanced.expenses).toBe(500)
        expect(enhanced.net).toBe(500)
        expect(enhanced.currency).toBe('USD')
      })

      it('should include previous month comparison data', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          // Current month (October)
          createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
          createMockTransaction('2', 500, 'USD', 'expense', '2025-10-20'),
          // Previous month (September)
          createMockTransaction('3', 900, 'USD', 'income', '2025-09-15'),
          createMockTransaction('4', 600, 'USD', 'expense', '2025-09-20'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.previousMonth.income.current).toBe(1000)
        expect(enhanced.previousMonth.income.previous).toBe(900)
        expect(enhanced.previousMonth.income.changePercent).toBeCloseTo(11.1, 1)
        expect(enhanced.previousMonth.income.changeDirection).toBe('up')

        expect(enhanced.previousMonth.expenses.current).toBe(500)
        expect(enhanced.previousMonth.expenses.previous).toBe(600)
        expect(enhanced.previousMonth.expenses.changePercent).toBeCloseTo(-16.7, 1)
        expect(enhanced.previousMonth.expenses.changeDirection).toBe('down')
      })

      it('should include 12-month average comparison', () => {
        const transactions: TransactionWithVendorAndPayment[] = []

        // Generate 13 months of data (current + 12 past months)
        for (let i = 0; i <= 12; i++) {
          const date = new Date('2025-10-15')
          date.setMonth(date.getMonth() - i)
          transactions.push(
            createMockTransaction(`income-${i}`, 1000, 'USD', 'income', date.toISOString().slice(0, 10)),
            createMockTransaction(`expense-${i}`, 500, 'USD', 'expense', date.toISOString().slice(0, 10))
          )
        }

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.twelveMonthAverage.income.current).toBe(1000)
        expect(enhanced.twelveMonthAverage.income.previous).toBe(1000)
        expect(enhanced.twelveMonthAverage.income.changeDirection).toBe('neutral')

        expect(enhanced.twelveMonthAverage.expenses.current).toBe(500)
        expect(enhanced.twelveMonthAverage.expenses.previous).toBe(500)
        expect(enhanced.twelveMonthAverage.expenses.changeDirection).toBe('neutral')
      })

      it('should include daily spend trend', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 100, 'USD', 'expense', '2025-10-01'),
          createMockTransaction('2', 200, 'USD', 'expense', '2025-10-02'),
          createMockTransaction('3', 150, 'USD', 'expense', '2025-10-03'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        // Should include all days up to today, not just days with transactions
        expect(enhanced.dailySpendTrend.length).toBeGreaterThan(0)
        expect(enhanced.dailySpendTrend[0]).toEqual({ date: '2025-10-01', amount: 100 })
        expect(enhanced.dailySpendTrend[1]).toEqual({ date: '2025-10-02', amount: 200 })
        expect(enhanced.dailySpendTrend[2]).toEqual({ date: '2025-10-03', amount: 150 })
      })

      it('should include days elapsed data', () => {
        const enhanced = calculateEnhancedMonthlySummary([], new Date('2025-10-01'), 35)

        expect(enhanced.daysInMonth).toBe(31)
        expect(enhanced.daysElapsed).toBeGreaterThan(0)
        expect(enhanced.percentElapsed).toBeGreaterThan(0)
      })
    })

    describe('comparison calculations', () => {
      it('should calculate positive change direction correctly', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 1100, 'USD', 'income', '2025-10-15'),
          createMockTransaction('2', 1000, 'USD', 'income', '2025-09-15'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.previousMonth.income.changeDirection).toBe('up')
        expect(enhanced.previousMonth.income.changePercent).toBeCloseTo(10, 1)
      })

      it('should calculate negative change direction correctly', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 900, 'USD', 'income', '2025-10-15'),
          createMockTransaction('2', 1000, 'USD', 'income', '2025-09-15'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.previousMonth.income.changeDirection).toBe('down')
        expect(enhanced.previousMonth.income.changePercent).toBeCloseTo(-10, 1)
      })

      it('should handle neutral change (less than 0.5%)', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
          createMockTransaction('2', 1001, 'USD', 'income', '2025-09-15'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.previousMonth.income.changeDirection).toBe('neutral')
      })

      it('should handle zero to positive change', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.previousMonth.income.changePercent).toBe(100)
        expect(enhanced.previousMonth.income.changeDirection).toBe('up')
      })
    })

    describe('daily trend calculations', () => {
      it('should aggregate multiple expenses on same day', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 100, 'USD', 'expense', '2025-10-01'),
          createMockTransaction('2', 50, 'USD', 'expense', '2025-10-01'),
          createMockTransaction('3', 75, 'USD', 'expense', '2025-10-01'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.dailySpendTrend[0].amount).toBe(225)
      })

      it('should only include expenses in daily trend', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 1000, 'USD', 'income', '2025-10-01'),
          createMockTransaction('2', 100, 'USD', 'expense', '2025-10-01'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.dailySpendTrend[0].amount).toBe(100)
      })

      it('should convert THB to USD in daily trend', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 3500, 'THB', 'expense', '2025-10-01'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.dailySpendTrend[0].amount).toBeCloseTo(100, 2)
      })
    })

    describe('edge cases', () => {
      it('should handle empty transaction array', () => {
        const enhanced = calculateEnhancedMonthlySummary([], new Date('2025-10-01'), 35)

        expect(enhanced.income).toBe(0)
        expect(enhanced.expenses).toBe(0)
        expect(enhanced.previousMonth.income.changePercent).toBe(0)
        // Should have days from Oct 1 to today
        expect(enhanced.dailySpendTrend.length).toBeGreaterThan(0)
      })

      it('should handle sparse data across 12 months', () => {
        const transactions: TransactionWithVendorAndPayment[] = [
          createMockTransaction('1', 1000, 'USD', 'income', '2025-10-15'),
          createMockTransaction('2', 500, 'USD', 'income', '2025-07-15'),
        ]

        const enhanced = calculateEnhancedMonthlySummary(transactions, new Date('2025-10-01'), 35)

        expect(enhanced.twelveMonthAverage.income.previous).toBeGreaterThan(0)
      })
    })
  })
})
