/**
 * @jest-environment jsdom
 */

import { VarianceReportService } from '../../src/lib/services/variance-report-service'

const mockSupabaseClient = {
  from: jest.fn(),
}

describe('VarianceReportService', () => {
  let service: VarianceReportService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new VarianceReportService(mockSupabaseClient as any)
  })

  describe('getVariancesByCategory', () => {
    it('should group variances by tag', async () => {
      const mockExpectedTransactions = [
        {
          id: '1',
          status: 'matched',
          transaction_type: 'expense',
          original_currency: 'USD',
          expected_amount: 100,
          actual_amount: 95,
          expected_transaction_tags: [
            { tags: { id: 't1', name: 'Housing', color: '#dbeafe' } },
          ],
        },
        {
          id: '2',
          status: 'matched',
          transaction_type: 'expense',
          original_currency: 'USD',
          expected_amount: 50,
          actual_amount: 55,
          expected_transaction_tags: [
            { tags: { id: 't1', name: 'Housing', color: '#dbeafe' } },
          ],
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockExpectedTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await service.getVariancesByCategory('plan1', 'user1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].tag.name).toBe('Housing')
      expect(result.data![0].expected.USD).toBe(150)
      expect(result.data![0].actual.USD).toBe(150)
    })

    it('should handle uncategorized transactions', async () => {
      const mockExpectedTransactions = [
        {
          id: '1',
          status: 'matched',
          transaction_type: 'expense',
          original_currency: 'USD',
          expected_amount: 100,
          actual_amount: 95,
          expected_transaction_tags: [],
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockExpectedTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await service.getVariancesByCategory('plan1', 'user1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].tag.name).toBe('Uncategorized')
    })
  })

  describe('getVariancesByVendor', () => {
    it('should group variances by vendor', async () => {
      const mockExpectedTransactions = [
        {
          id: '1',
          status: 'matched',
          transaction_type: 'expense',
          original_currency: 'USD',
          expected_amount: 100,
          actual_amount: 95,
          vendor_id: 'v1',
          vendors: { id: 'v1', name: 'Landlord' },
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({
                data: mockExpectedTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await service.getVariancesByVendor('plan1', 'user1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].vendor.name).toBe('Landlord')
    })
  })

  describe('getLargestVariances', () => {
    it('should return transactions with largest variances', async () => {
      const mockExpectedTransactions = [
        {
          id: '1',
          status: 'matched',
          variance_amount: -50,
          variance_percentage: -50,
          expected_amount: 100,
          actual_amount: 50,
        },
        {
          id: '2',
          status: 'matched',
          variance_amount: 10,
          variance_percentage: 10,
          expected_amount: 100,
          actual_amount: 110,
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: mockExpectedTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.getLargestVariances('plan1', 'user1', 10)

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
      // First should be the one with largest absolute variance percentage
      expect(Math.abs(result.data![0].variance_percentage)).toBeGreaterThanOrEqual(
        Math.abs(result.data![1].variance_percentage)
      )
    })
  })

  describe('getCriticalVariances', () => {
    it('should return only critical variances', async () => {
      const mockExpectedTransactions = [
        {
          id: '1',
          status: 'matched',
          variance_amount: -25,
          variance_percentage: -25,
          expected_amount: 100,
        },
        {
          id: '2',
          status: 'matched',
          variance_amount: 5,
          variance_percentage: 5,
          expected_amount: 100,
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({
                  data: mockExpectedTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await service.getCriticalVariances('plan1', 'user1')

      expect(result.error).toBeNull()
      // Only variance >20% should be returned
      expect(result.data).toHaveLength(1)
      expect(Math.abs(result.data![0].variance_percentage)).toBeGreaterThan(20)
    })
  })

  describe('generateMonthVarianceReport', () => {
    it('should generate complete variance report', async () => {
      const mockMonthPlan = {
        month_year: '2025-01-01',
      }

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
        if (table === 'expected_transactions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      const result = await service.generateMonthVarianceReport('plan1', 'user1')

      expect(result.error).toBeNull()
      expect(result.data?.month_year).toBe('2025-01-01')
      expect(result.data?.summary).toBeDefined()
      expect(result.data?.by_category).toBeDefined()
      expect(result.data?.by_vendor).toBeDefined()
      expect(result.data?.largest_variances).toBeDefined()
    })
  })
})
