/**
 * @jest-environment jsdom
 */

import { MonthPlanService } from '../../src/lib/services/month-plan-service'
import { TemplateService } from '../../src/lib/services/template-service'

const mockSupabaseClient = {
  from: jest.fn(),
}

const mockTemplateService = {
  getActiveTemplatesForMonth: jest.fn(),
}

describe('MonthPlanService', () => {
  let service: MonthPlanService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new MonthPlanService(
      mockSupabaseClient as any,
      mockTemplateService as any
    )
  })

  describe('getOrCreateMonthPlan', () => {
    it('should return existing month plan', async () => {
      const existingPlan = {
        id: '1',
        user_id: 'user1',
        month_year: '2025-01-01',
        status: 'active',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: existingPlan,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await service.getOrCreateMonthPlan('user1', '2025-01-15')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(existingPlan)
    })

    it('should create new month plan if none exists', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'month_plans') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'new-id', month_year: '2025-01-01' },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      const result = await service.getOrCreateMonthPlan('user1', '2025-01-15')

      expect(result.error).toBeNull()
      expect(result.data?.month_year).toBe('2025-01-01')
    })

    it('should normalize month_year to first day', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-id', month_year: '2025-01-01' },
              error: null,
            }),
          }),
        }),
      })

      await service.getOrCreateMonthPlan('user1', '2025-01-15')

      // Check that insert was called with first day of month
      const insertCall = mockSupabaseClient.from.mock.results[0].value.insert.mock.calls[0][0]
      expect(insertCall.month_year).toBe('2025-01-01')
    })
  })

  describe('generateExpectedTransactions', () => {
    it('should generate expected transactions from templates', async () => {
      const mockMonthPlan = {
        id: 'plan1',
        user_id: 'user1',
        month_year: '2025-01-01',
        status: 'draft',
      }

      const mockTemplates = [
        {
          id: 'template1',
          name: 'Rent',
          amount: 2500,
          original_currency: 'USD',
          transaction_type: 'expense',
          frequency: 'monthly',
          day_of_month: 1,
        },
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
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockMonthPlan,
                      error: null,
                    }),
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
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
      })

      mockTemplateService.getActiveTemplatesForMonth.mockResolvedValue({
        data: mockTemplates,
        error: null,
      })

      const result = await service.generateExpectedTransactions('plan1', 'user1')

      expect(result.error).toBeNull()
      expect(result.data?.generated_count).toBe(1)
    })
  })

  describe('getMonthPlanStats', () => {
    it('should calculate stats correctly', async () => {
      const mockExpectedTransactions = [
        {
          id: '1',
          status: 'matched',
          transaction_type: 'expense',
          original_currency: 'USD',
          expected_amount: 100,
          actual_amount: 95,
        },
        {
          id: '2',
          status: 'pending',
          transaction_type: 'expense',
          original_currency: 'USD',
          expected_amount: 50,
          actual_amount: null,
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

      const result = await service.getMonthPlanStats('plan1', 'user1')

      expect(result.error).toBeNull()
      expect(result.data?.expected_count).toBe(2)
      expect(result.data?.matched_count).toBe(1)
      expect(result.data?.pending_count).toBe(1)
      expect(result.data?.total_expected_expenses.USD).toBe(150)
      expect(result.data?.total_actual_expenses.USD).toBe(95)
    })
  })
})
