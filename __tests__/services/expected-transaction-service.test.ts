/**
 * @jest-environment jsdom
 */

import { ExpectedTransactionService } from '../../src/lib/services/expected-transaction-service'

const mockSupabaseClient = {
  from: jest.fn(),
}

describe('ExpectedTransactionService', () => {
  let service: ExpectedTransactionService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ExpectedTransactionService(mockSupabaseClient as any)
  })

  describe('createExpectedTransaction', () => {
    it('should create manual expected transaction', async () => {
      const data = {
        month_plan_id: 'plan1',
        description: 'One-time expense',
        expected_amount: 150,
        original_currency: 'USD' as const,
        transaction_type: 'expense' as const,
        expected_date: '2025-01-15',
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'expected_transactions') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'new-id', ...data },
                  error: null,
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'new-id', ...data },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await service.createExpectedTransaction(data, 'user1')

      expect(result.error).toBeNull()
      expect(result.data?.description).toBe('One-time expense')
    })

    it('should reject negative amounts', async () => {
      const data = {
        month_plan_id: 'plan1',
        description: 'Invalid',
        expected_amount: -100,
        original_currency: 'USD' as const,
        transaction_type: 'expense' as const,
        expected_date: '2025-01-15',
      }

      const result = await service.createExpectedTransaction(data, 'user1')

      expect(result.error).toBe('Expected amount must be positive')
      expect(result.data).toBeNull()
    })
  })

  describe('matchTransaction', () => {
    it('should match expected to actual transaction', async () => {
      const mockTransaction = {
        id: 'tx1',
        amount: 150,
        transaction_date: '2025-01-15',
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'transactions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockTransaction,
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        if (table === 'expected_transactions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'expected1', status: 'matched' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await service.matchTransaction('expected1', 'tx1', 'user1')

      expect(result.error).toBeNull()
    })
  })

  describe('skipExpectedTransaction', () => {
    it('should mark transaction as skipped', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'expected_transactions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'expected1', status: 'skipped' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await service.skipExpectedTransaction(
        'expected1',
        'Already paid last month',
        'user1'
      )

      expect(result.error).toBeNull()
    })
  })

  describe('markOverdueTransactions', () => {
    it('should mark pending transactions as overdue', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({
                  data: [{ id: '1' }, { id: '2' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.markOverdueTransactions('user1')

      expect(result.error).toBeNull()
      expect(result.data).toBe(2)
    })
  })
})
