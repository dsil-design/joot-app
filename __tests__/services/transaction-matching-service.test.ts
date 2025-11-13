/**
 * @jest-environment jsdom
 */

import { TransactionMatchingService } from '../../src/lib/services/transaction-matching-service'
import { ExpectedTransactionService } from '../../src/lib/services/expected-transaction-service'

const mockSupabaseClient = {
  from: jest.fn(),
}

const mockExpectedTransactionService = {
  getExpectedTransactions: jest.fn(),
  matchTransaction: jest.fn(),
}

describe('TransactionMatchingService', () => {
  let service: TransactionMatchingService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new TransactionMatchingService(
      mockSupabaseClient as any,
      mockExpectedTransactionService as any
    )
  })

  describe('calculateMatchConfidence', () => {
    it('should give high score for exact matches', async () => {
      const expected: any = {
        vendor_id: 'v1',
        payment_method_id: 'p1',
        expected_amount: 100,
        expected_date: '2025-01-15',
        original_currency: 'USD',
        transaction_type: 'expense',
        tags: [],
      }

      const actual: any = {
        vendor_id: 'v1',
        payment_method_id: 'p1',
        amount: 100,
        transaction_date: '2025-01-15',
        original_currency: 'USD',
        transaction_type: 'expense',
        id: 'tx1',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const result = await service.calculateMatchConfidence(expected, actual)

      expect(result.confidence).toBeGreaterThan(80)
      expect(result.reasons.length).toBeGreaterThan(0)
    })

    it('should disqualify different transaction types', async () => {
      const expected: any = {
        transaction_type: 'expense',
        original_currency: 'USD',
        expected_amount: 100,
        expected_date: '2025-01-15',
        tags: [],
      }

      const actual: any = {
        transaction_type: 'income',
        original_currency: 'USD',
        amount: 100,
        transaction_date: '2025-01-15',
        id: 'tx1',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const result = await service.calculateMatchConfidence(expected, actual)

      expect(result.confidence).toBe(0)
      expect(result.penalties.length).toBeGreaterThan(0)
    })

    it('should score amount proximity correctly', async () => {
      const expected: any = {
        expected_amount: 100,
        expected_date: '2025-01-15',
        original_currency: 'USD',
        transaction_type: 'expense',
        tags: [],
      }

      const actual: any = {
        amount: 103, // 3% difference
        transaction_date: '2025-01-15',
        original_currency: 'USD',
        transaction_type: 'expense',
        id: 'tx1',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const result = await service.calculateMatchConfidence(expected, actual)

      expect(result.breakdown.amount_score).toBeGreaterThan(0)
    })
  })

  describe('autoMatchTransactions', () => {
    it('should auto-match high confidence suggestions', async () => {
      const mockSuggestions = [
        {
          expected_transaction_id: 'e1',
          transaction_id: 't1',
          confidence_score: 95,
          match_reasons: ['Exact vendor match', 'Same amount'],
          expected: {} as any,
          actual: {} as any,
        },
      ]

      // Mock findMatchSuggestions
      jest.spyOn(service, 'findMatchSuggestions').mockResolvedValue({
        data: mockSuggestions,
        error: null,
      })

      mockExpectedTransactionService.matchTransaction.mockResolvedValue({
        data: { id: 'e1', status: 'matched' },
        error: null,
      })

      const result = await service.autoMatchTransactions('plan1', 'user1', {
        confidence_threshold: 85,
        require_manual_review: false,
      })

      expect(result.error).toBeNull()
      expect(result.data?.matched_count).toBe(1)
      expect(mockExpectedTransactionService.matchTransaction).toHaveBeenCalled()
    })

    it('should not auto-match when require_manual_review is true', async () => {
      const mockSuggestions = [
        {
          expected_transaction_id: 'e1',
          transaction_id: 't1',
          confidence_score: 95,
          match_reasons: [],
          expected: {} as any,
          actual: {} as any,
        },
      ]

      jest.spyOn(service, 'findMatchSuggestions').mockResolvedValue({
        data: mockSuggestions,
        error: null,
      })

      const result = await service.autoMatchTransactions('plan1', 'user1', {
        confidence_threshold: 85,
        require_manual_review: true,
      })

      expect(result.data?.matched_count).toBe(0)
      expect(result.data?.suggestions_count).toBe(1)
      expect(mockExpectedTransactionService.matchTransaction).not.toHaveBeenCalled()
    })
  })

  describe('getUnmatchedTransactions', () => {
    it('should fetch unmatched transactions for month', async () => {
      const mockMonthPlan = {
        month_year: '2025-01-01',
      }

      const mockTransactions = [
        { id: 't1', amount: 100, expected_transaction_id: null },
        { id: 't2', amount: 200, expected_transaction_id: null },
      ]

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'month_plans') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockMonthPlan,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'transactions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    lte: jest.fn().mockReturnValue({
                      order: jest.fn().mockResolvedValue({
                        data: mockTransactions,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await service.getUnmatchedTransactions('user1', 'plan1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
    })
  })
})
