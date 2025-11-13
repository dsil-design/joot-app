/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useMonthPlans,
  useMonthPlan,
  useCreateMonthPlan,
  useUpdateMonthPlan,
  useGenerateExpectedTransactions,
  useAutoMatch,
  useMatchSuggestions,
  useVarianceReport,
} from '../../src/hooks/use-month-plans'
import type {
  CreateMonthPlanData,
  UpdateMonthPlanData,
} from '../../src/lib/types/recurring-transactions'

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

// Mock fetch
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('useMonthPlans hooks', () => {
  let queryClient: QueryClient

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient?.clear()
  })

  describe('useMonthPlans', () => {
    it('should fetch month plans successfully', async () => {
      const mockMonthPlans = {
        month_plans: [
          {
            id: '1',
            month_year: '2025-01-01',
            status: 'active',
            stats: {
              expected_count: 10,
              matched_count: 5,
              pending_count: 5,
            },
          },
        ],
        totalCount: 1,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMonthPlans,
      } as Response)

      const { result } = renderHook(() => useMonthPlans(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockMonthPlans)
      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans?')
    })

    it('should apply filters correctly', async () => {
      const mockMonthPlans = {
        month_plans: [],
        totalCount: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMonthPlans,
      } as Response)

      const { result } = renderHook(
        () => useMonthPlans({ year: 2025, status: 'active', limit: 12 }),
        {
          wrapper: createWrapper(),
        }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/month-plans?year=2025&status=active&limit=12'
      )
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch month plans' }),
      } as Response)

      const { result } = renderHook(() => useMonthPlans(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useMonthPlan', () => {
    it('should fetch a single month plan with stats successfully', async () => {
      const mockMonthPlan = {
        month_plan: {
          id: '1',
          month_year: '2025-01-01',
          status: 'active',
          stats: {
            expected_count: 10,
            matched_count: 5,
            pending_count: 5,
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMonthPlan,
      } as Response)

      const { result } = renderHook(() => useMonthPlan('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockMonthPlan.month_plan)
      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans/1')
    })

    it('should not fetch if id is null', () => {
      const { result } = renderHook(() => useMonthPlan(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('useMatchSuggestions', () => {
    it('should fetch match suggestions successfully', async () => {
      const mockSuggestions = {
        suggestions: [
          {
            expected_transaction_id: '1',
            transaction_id: '2',
            confidence_score: 95,
            match_reasons: ['Same vendor', 'Similar amount'],
          },
        ],
        totalCount: 1,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestions,
      } as Response)

      const { result } = renderHook(() => useMatchSuggestions('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSuggestions)
      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans/1/match-suggestions')
    })
  })

  describe('useVarianceReport', () => {
    it('should fetch variance report successfully', async () => {
      const mockReport = {
        report: {
          month_year: '2025-01-01',
          summary: {
            total_expected_expenses: { USD: 5000 },
            total_actual_expenses: { USD: 4800 },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReport,
      } as Response)

      const { result } = renderHook(() => useVarianceReport('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockReport.report)
      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans/1/variance-report')
    })
  })

  describe('useCreateMonthPlan', () => {
    it('should create month plan successfully', async () => {
      const newMonthPlan: CreateMonthPlanData = {
        month_year: '2025-01-01',
        notes: 'January budget',
      }

      const mockResponse = {
        month_plan: {
          id: '1',
          ...newMonthPlan,
          status: 'draft',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useCreateMonthPlan(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newMonthPlan)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMonthPlan),
      })
    })

    it('should handle create errors', async () => {
      const newMonthPlan: CreateMonthPlanData = {
        month_year: '2025-01-01',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create month plan' }),
      } as Response)

      const { result } = renderHook(() => useCreateMonthPlan(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newMonthPlan)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateMonthPlan', () => {
    it('should update month plan successfully', async () => {
      const updateData: UpdateMonthPlanData = {
        status: 'active',
        notes: 'Updated notes',
      }

      const mockResponse = {
        month_plan: {
          id: '1',
          ...updateData,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useUpdateMonthPlan(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: '1', data: updateData })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
    })
  })

  describe('useGenerateExpectedTransactions', () => {
    it('should generate expected transactions successfully', async () => {
      const mockResult = {
        generated_count: 10,
        skipped_count: 0,
        message: 'Generated 10 expected transactions',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response)

      const { result } = renderHook(() => useGenerateExpectedTransactions(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ monthPlanId: '1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans/1/generate-expected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    })

    it('should pass options when generating', async () => {
      const mockResult = {
        generated_count: 5,
        skipped_count: 5,
        message: 'Generated 5 expected transactions',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response)

      const { result } = renderHook(() => useGenerateExpectedTransactions(), {
        wrapper: createWrapper(),
      })

      const options = {
        template_ids: ['t1', 't2'],
        override_existing: true,
      }

      result.current.mutate({ monthPlanId: '1', options })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans/1/generate-expected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })
    })
  })

  describe('useAutoMatch', () => {
    it('should auto-match transactions successfully', async () => {
      const mockResult = {
        matched_count: 8,
        suggestions_count: 2,
        message: 'Auto-matched 8 transactions',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response)

      const { result } = renderHook(() => useAutoMatch(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ monthPlanId: '1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans/1/auto-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    })

    it('should pass auto-match options', async () => {
      const mockResult = {
        matched_count: 0,
        suggestions_count: 10,
        message: 'No automatic matches found',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response)

      const { result } = renderHook(() => useAutoMatch(), {
        wrapper: createWrapper(),
      })

      const options = {
        confidence_threshold: 90,
        require_manual_review: true,
      }

      result.current.mutate({ monthPlanId: '1', options })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/month-plans/1/auto-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })
    })
  })
})
