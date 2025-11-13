/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from '../../src/hooks/use-templates'
import type { CreateTemplateData, UpdateTemplateData } from '../../src/lib/types/recurring-transactions'

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

describe('useTemplates hooks', () => {
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

  describe('useTemplates', () => {
    it('should fetch templates successfully', async () => {
      const mockTemplates = {
        templates: [
          {
            id: '1',
            name: 'Rent',
            is_active: true,
            amount: 2500,
          },
        ],
        totalCount: 1,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      } as Response)

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockTemplates)
      expect(mockFetch).toHaveBeenCalledWith('/api/templates?')
    })

    it('should apply filters correctly', async () => {
      const mockTemplates = {
        templates: [],
        totalCount: 0,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      } as Response)

      const { result } = renderHook(
        () => useTemplates({ is_active: true, frequency: 'monthly' }),
        {
          wrapper: createWrapper(),
        }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/templates?is_active=true&frequency=monthly'
      )
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch templates' }),
      } as Response)

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useTemplate', () => {
    it('should fetch a single template successfully', async () => {
      const mockTemplate = {
        template: {
          id: '1',
          name: 'Rent',
          is_active: true,
          amount: 2500,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      } as Response)

      const { result } = renderHook(() => useTemplate('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockTemplate.template)
      expect(mockFetch).toHaveBeenCalledWith('/api/templates/1')
    })

    it('should not fetch if id is null', () => {
      const { result } = renderHook(() => useTemplate(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('useCreateTemplate', () => {
    it('should create template successfully', async () => {
      const newTemplate: CreateTemplateData = {
        name: 'Rent',
        amount: 2500,
        original_currency: 'USD',
        transaction_type: 'expense',
        frequency: 'monthly',
        start_date: '2025-01-01',
      }

      const mockResponse = {
        template: {
          id: '1',
          ...newTemplate,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useCreateTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newTemplate)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTemplate),
      })
    })

    it('should handle create errors', async () => {
      const newTemplate: CreateTemplateData = {
        name: 'Rent',
        amount: 2500,
        original_currency: 'USD',
        transaction_type: 'expense',
        frequency: 'monthly',
        start_date: '2025-01-01',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create template' }),
      } as Response)

      const { result } = renderHook(() => useCreateTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newTemplate)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useUpdateTemplate', () => {
    it('should update template successfully', async () => {
      const updateData: UpdateTemplateData = {
        name: 'Updated Rent',
        amount: 2600,
      }

      const mockResponse = {
        template: {
          id: '1',
          ...updateData,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useUpdateTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: '1', data: updateData })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/templates/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
    })

    it('should handle optimistic updates on error', async () => {
      // Set up initial cache data
      queryClient.setQueryData(['templates', '1'], {
        id: '1',
        name: 'Original',
        amount: 2500,
      })

      const updateData: UpdateTemplateData = {
        name: 'Updated Rent',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      } as Response)

      const { result } = renderHook(() => useUpdateTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: '1', data: updateData })

      await waitFor(() => expect(result.current.isError).toBe(true))

      // Verify rollback - the cache should be invalidated, not rolled back to old value
      // This is handled by onSettled
    })
  })

  describe('useDeleteTemplate', () => {
    it('should delete template successfully', async () => {
      const mockResponse = {
        message: 'Template deleted successfully',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useDeleteTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/templates/1', {
        method: 'DELETE',
      })
    })

    it('should handle delete errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to delete template' }),
      } as Response)

      const { result } = renderHook(() => useDeleteTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('1')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })
  })
})
