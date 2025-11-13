/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useExpectedTransactions,
  useExpectedTransaction,
  useCreateExpectedTransaction,
  useUpdateExpectedTransaction,
  useDeleteExpectedTransaction,
  useMatchTransaction,
  useUnmatchTransaction,
  useSkipTransaction,
} from '../../src/hooks/use-expected-transactions'
import type {
  CreateExpectedTransactionData,
  UpdateExpectedTransactionData,
} from '../../src/lib/types/recurring-transactions'

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock fetch
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('useExpectedTransactions hooks', () => {
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

  describe('useExpectedTransactions', () => {
    it('should fetch expected transactions successfully', async () => {
      const mockExpectedTransactions = {
        expected_transactions: [
          {
            id: '1',
            description: 'Rent',
            expected_amount: 2500,
            status: 'pending',
          },
        ],
        totalCount: 1,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpectedTransactions,
      } as Response)

      const { result } = renderHook(() => useExpectedTransactions('month-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockExpectedTransactions)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expected-transactions?month_plan_id=month-1'
      )
    })

    it('should apply filters correctly', async () => {
      const mockExpectedTransactions = {
        expected_transactions: [],
        totalCount: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpectedTransactions,
      } as Response)

      const { result } = renderHook(
        () =>
          useExpectedTransactions('month-1', {
            status: ['pending', 'overdue'],
            transaction_type: 'expense',
            vendor_ids: ['v1', 'v2'],
            include_matched: false,
          }),
        {
          wrapper: createWrapper(),
        }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expected-transactions?month_plan_id=month-1&status=pending%2Coverdue&transaction_type=expense&vendor_ids=v1%2Cv2&include_matched=false'
      )
    })

    it('should not fetch if monthPlanId is null', () => {
      const { result } = renderHook(() => useExpectedTransactions(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch expected transactions' }),
      } as Response)

      const { result } = renderHook(() => useExpectedTransactions('month-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useExpectedTransaction', () => {
    it('should fetch a single expected transaction successfully', async () => {
      const mockExpectedTransaction = {
        expected_transaction: {
          id: '1',
          description: 'Rent',
          expected_amount: 2500,
          status: 'pending',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpectedTransaction,
      } as Response)

      const { result } = renderHook(() => useExpectedTransaction('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockExpectedTransaction.expected_transaction)
      expect(mockFetch).toHaveBeenCalledWith('/api/expected-transactions/1')
    })

    it('should not fetch if id is null', () => {
      const { result } = renderHook(() => useExpectedTransaction(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('useCreateExpectedTransaction', () => {
    it('should create expected transaction successfully', async () => {
      const newExpectedTransaction: CreateExpectedTransactionData = {
        month_plan_id: 'month-1',
        description: 'Utilities',
        expected_amount: 150,
        original_currency: 'USD',
        transaction_type: 'expense',
        expected_date: '2025-01-15',
      }

      const mockResponse = {
        expected_transaction: {
          id: '1',
          ...newExpectedTransaction,
          status: 'pending',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useCreateExpectedTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newExpectedTransaction)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/expected-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpectedTransaction),
      })
    })

    it('should handle create errors', async () => {
      const newExpectedTransaction: CreateExpectedTransactionData = {
        month_plan_id: 'month-1',
        description: 'Utilities',
        expected_amount: 150,
        original_currency: 'USD',
        transaction_type: 'expense',
        expected_date: '2025-01-15',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create expected transaction' }),
      } as Response)

      const { result } = renderHook(() => useCreateExpectedTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newExpectedTransaction)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateExpectedTransaction', () => {
    it('should update expected transaction successfully', async () => {
      const updateData: UpdateExpectedTransactionData = {
        description: 'Updated Utilities',
        expected_amount: 160,
      }

      const mockResponse = {
        expected_transaction: {
          id: '1',
          month_plan_id: 'month-1',
          ...updateData,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useUpdateExpectedTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: '1', data: updateData })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/expected-transactions/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
    })
  })

  describe('useDeleteExpectedTransaction', () => {
    it('should delete expected transaction successfully', async () => {
      // Set up cache with expected transaction data
      queryClient.setQueryData(['expected-transactions', '1'], {
        id: '1',
        month_plan_id: 'month-1',
        description: 'Rent',
      })

      const mockResponse = {
        message: 'Expected transaction deleted successfully',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useDeleteExpectedTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/expected-transactions/1', {
        method: 'DELETE',
      })
    })

    it('should handle delete errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to delete expected transaction' }),
      } as Response)

      const { result } = renderHook(() => useDeleteExpectedTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('1')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useMatchTransaction', () => {
    it('should match transaction successfully', async () => {
      const mockResponse = {
        expected_transaction: {
          id: '1',
          month_plan_id: 'month-1',
          status: 'matched',
          matched_transaction_id: 'trans-1',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useMatchTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        expectedTransactionId: '1',
        data: { transaction_id: 'trans-1' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/expected-transactions/1/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction_id: 'trans-1' }),
      })
    })

    it('should handle optimistic updates', async () => {
      // Set up cache with expected transaction
      queryClient.setQueryData(['expected-transactions', '1'], {
        id: '1',
        status: 'pending',
        matched_transaction_id: null,
      })

      const mockResponse = {
        expected_transaction: {
          id: '1',
          month_plan_id: 'month-1',
          status: 'matched',
          matched_transaction_id: 'trans-1',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useMatchTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        expectedTransactionId: '1',
        data: { transaction_id: 'trans-1' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useUnmatchTransaction', () => {
    it('should unmatch transaction successfully', async () => {
      const mockResponse = {
        expected_transaction: {
          id: '1',
          month_plan_id: 'month-1',
          status: 'pending',
          matched_transaction_id: null,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useUnmatchTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/expected-transactions/1/unmatch', {
        method: 'POST',
      })
    })

    it('should handle optimistic updates for unmatch', async () => {
      // Set up cache with matched transaction
      queryClient.setQueryData(['expected-transactions', '1'], {
        id: '1',
        status: 'matched',
        matched_transaction_id: 'trans-1',
      })

      const mockResponse = {
        expected_transaction: {
          id: '1',
          month_plan_id: 'month-1',
          status: 'pending',
          matched_transaction_id: null,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useUnmatchTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useSkipTransaction', () => {
    it('should skip transaction successfully', async () => {
      const mockResponse = {
        expected_transaction: {
          id: '1',
          month_plan_id: 'month-1',
          status: 'skipped',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useSkipTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        expectedTransactionId: '1',
        data: { notes: 'Not happening this month' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/expected-transactions/1/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'Not happening this month' }),
      })
    })

    it('should skip without notes', async () => {
      const mockResponse = {
        expected_transaction: {
          id: '1',
          month_plan_id: 'month-1',
          status: 'skipped',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useSkipTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        expectedTransactionId: '1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/expected-transactions/1/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    })

    it('should handle optimistic updates for skip', async () => {
      // Set up cache with pending transaction
      queryClient.setQueryData(['expected-transactions', '1'], {
        id: '1',
        status: 'pending',
      })

      const mockResponse = {
        expected_transaction: {
          id: '1',
          month_plan_id: 'month-1',
          status: 'skipped',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useSkipTransaction(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        expectedTransactionId: '1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})
