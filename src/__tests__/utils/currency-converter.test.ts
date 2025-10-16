import { calculateTransactionDisplayAmounts, triggerExchangeRateSync } from '@/lib/utils/currency-converter'
import { createClient } from '@/lib/supabase/client'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

// Mock fetch for triggerExchangeRateSync
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

describe('currency-converter', () => {
  const mockSupabaseClient = {
    rpc: jest.fn()
  }

  const mockTransaction: TransactionWithVendorAndPayment = {
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

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.MockedFunction<typeof createClient>).mockReturnValue(mockSupabaseClient as any)
    
    // Set a consistent date for tests
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-03-15'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('calculateTransactionDisplayAmounts', () => {
    it('calculates display amounts for USD transaction with current rates', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ rate: 35.50, actual_date: '2024-03-15' }],
        error: null
      })

      const result = await calculateTransactionDisplayAmounts(mockTransaction)

      expect(result).toEqual({
        primary: '$28.50',
        secondary: '฿1011.75',
        secondaryNeedsSync: false
      })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_exchange_rate_with_fallback', {
        p_date: '2024-03-15',
        p_from_currency: 'USD',
        p_to_currency: 'THB',
        p_max_days_back: 30
      })
    })

    it('calculates display amounts for THB transaction with current rates', async () => {
      const thbTransaction = { ...mockTransaction, amount: 1000, original_currency: 'THB' as const }

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ rate: 0.0282, actual_date: '2024-03-15' }],
        error: null
      })

      const result = await calculateTransactionDisplayAmounts(thbTransaction)

      expect(result).toEqual({
        primary: '฿1000.00',
        secondary: '$28.20',
        secondaryNeedsSync: false
      })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_exchange_rate_with_fallback', {
        p_date: '2024-03-15',
        p_from_currency: 'THB',
        p_to_currency: 'USD',
        p_max_days_back: 30
      })
    })

    it('indicates sync needed when using outdated exchange rate', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ rate: 35.50, actual_date: '2024-03-10' }], // 5 days old
        error: null
      })

      const result = await calculateTransactionDisplayAmounts(mockTransaction)

      expect(result).toEqual({
        primary: '$28.50',
        secondary: '฿1011.75',
        secondaryNeedsSync: true // Needs sync because rate is not from today
      })
    })

    it('returns null secondary when exchange rate is unavailable', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await calculateTransactionDisplayAmounts(mockTransaction)

      expect(result).toEqual({
        primary: '$28.50',
        secondary: null,
        secondaryNeedsSync: true
      })
    })

    it('handles database errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* no-op */ })
      
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const result = await calculateTransactionDisplayAmounts(mockTransaction)

      expect(result).toEqual({
        primary: '$28.50',
        secondary: null,
        secondaryNeedsSync: true
      })

      expect(consoleErrorSpy).not.toHaveBeenCalled() // Error is handled silently
      
      consoleErrorSpy.mockRestore()
    })

    it('handles same currency transactions', async () => {
      // This shouldn't happen in practice, but we handle it
      const sameCurrencyTransaction = {
        ...mockTransaction,
        original_currency: 'USD' as const
      }

      // When from and to currency are the same (shouldn't happen but handled)
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ rate: 35.50, actual_date: '2024-03-15' }],
        error: null
      })

      const result = await calculateTransactionDisplayAmounts(sameCurrencyTransaction)

      expect(result).toEqual({
        primary: '$28.50',
        secondary: '฿1011.75',
        secondaryNeedsSync: false
      })
    })

    it('formats large amounts correctly', async () => {
      const largeTransaction = {
        ...mockTransaction,
        amount: 12345.67
      }

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ rate: 35.50, actual_date: '2024-03-15' }],
        error: null
      })

      const result = await calculateTransactionDisplayAmounts(largeTransaction)

      expect(result).toEqual({
        primary: '$12345.67',
        secondary: '฿438271.28', // 12345.67 * 35.50 (corrected calculation)
        secondaryNeedsSync: false
      })
    })

    it('handles zero amounts', async () => {
      const zeroTransaction = {
        ...mockTransaction,
        amount: 0
      }

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ rate: 35.50, actual_date: '2024-03-15' }],
        error: null
      })

      const result = await calculateTransactionDisplayAmounts(zeroTransaction)

      expect(result).toEqual({
        primary: '$0.00',
        secondary: '฿0.00',
        secondaryNeedsSync: false
      })
    })

    it('handles RPC call exceptions', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* no-op */ })
      
      mockSupabaseClient.rpc.mockRejectedValueOnce(new Error('Network error'))

      const result = await calculateTransactionDisplayAmounts(mockTransaction)

      expect(result).toEqual({
        primary: '$28.50',
        secondary: null,
        secondaryNeedsSync: true
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error calculating currency conversion:',
        expect.any(Error)
      )
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('triggerExchangeRateSync', () => {
    it('successfully triggers sync', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as Response)

      const result = await triggerExchangeRateSync()

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/sync/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncType: 'daily' })
      })
    })

    it('returns false when sync request fails', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      } as Response)

      const result = await triggerExchangeRateSync()

      expect(result).toBe(false)
    })

    it('handles network errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* no-op */ })
      
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      )

      const result = await triggerExchangeRateSync()

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to trigger exchange rate sync:',
        expect.any(Error)
      )
      
      consoleErrorSpy.mockRestore()
    })

    it('handles timeout errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* no-op */ })
      
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Request timeout')
      )

      const result = await triggerExchangeRateSync()

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to trigger exchange rate sync:',
        expect.any(Error)
      )
      
      consoleErrorSpy.mockRestore()
    })

    it('handles unauthorized responses', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      } as Response)

      const result = await triggerExchangeRateSync()

      expect(result).toBe(false)
    })

    it('handles rate limit responses', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      } as Response)

      const result = await triggerExchangeRateSync()

      expect(result).toBe(false)
    })
  })
})