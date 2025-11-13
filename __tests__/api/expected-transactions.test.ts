import { GET as getExpectedTransactions, POST as createExpectedTransaction } from '@/app/api/expected-transactions/route'
import { GET as getExpectedTransaction, PATCH as updateExpectedTransaction, DELETE as deleteExpectedTransaction } from '@/app/api/expected-transactions/[id]/route'
import { POST as matchTransaction } from '@/app/api/expected-transactions/[id]/match/route'
import { POST as unmatchTransaction } from '@/app/api/expected-transactions/[id]/unmatch/route'
import { POST as skipTransaction } from '@/app/api/expected-transactions/[id]/skip/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Expected Transactions API', () => {
  const mockUser = { id: 'user-123' }
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: jest.fn(),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('GET /api/expected-transactions', () => {
    it('should return expected transactions for a month plan', async () => {
      const mockTransactions = [
        {
          id: '1',
          description: 'Rent',
          expected_amount: 2500,
          status: 'pending',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions?month_plan_id=plan-1')
      const response = await getExpectedTransactions(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
    })

    it('should return 400 without month_plan_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/expected-transactions')
      const response = await getExpectedTransactions(request)

      expect(response.status).toBe(400)
    })

    it('should filter by status', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions?month_plan_id=plan-1&status=pending')
      const response = await getExpectedTransactions(request)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/expected-transactions', () => {
    it('should create expected transaction with valid data', async () => {
      const newTransaction = {
        id: '1',
        month_plan_id: 'plan-1',
        description: 'Rent',
        expected_amount: 2500,
        original_currency: 'USD',
        transaction_type: 'expense',
        expected_date: '2025-01-01',
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newTransaction,
              error: null,
            }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newTransaction,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions', {
        method: 'POST',
        body: JSON.stringify(newTransaction),
      })

      const response = await createExpectedTransaction(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.message).toBe('Expected transaction created successfully')
    })

    it('should return 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/expected-transactions', {
        method: 'POST',
        body: JSON.stringify({
          description: '',
          expected_amount: -100,
        }),
      })

      const response = await createExpectedTransaction(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/expected-transactions/[id]', () => {
    it('should return expected transaction by id', async () => {
      const mockTransaction = {
        id: '1',
        description: 'Rent',
        expected_amount: 2500,
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTransaction,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions/1')
      const params = Promise.resolve({ id: '1' })
      const response = await getExpectedTransaction(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
    })

    it('should return 404 for non-existent transaction', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'not found' },
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions/999')
      const params = Promise.resolve({ id: '999' })
      const response = await getExpectedTransaction(request, { params })

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/expected-transactions/[id]', () => {
    it('should update expected transaction', async () => {
      const updatedTransaction = {
        id: '1',
        description: 'Updated Rent',
      }

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedTransaction,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions/1', {
        method: 'PATCH',
        body: JSON.stringify({ description: 'Updated Rent' }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await updateExpectedTransaction(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.message).toBe('Expected transaction updated successfully')
    })
  })

  describe('DELETE /api/expected-transactions/[id]', () => {
    it('should delete expected transaction', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { matched_transaction_id: null },
              error: null,
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions/1', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: '1' })
      const response = await deleteExpectedTransaction(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.message).toBe('Expected transaction deleted successfully')
    })
  })

  describe('POST /api/expected-transactions/[id]/match', () => {
    it('should match transaction', async () => {
      const matchedTransaction = {
        id: '1',
        status: 'matched',
        matched_transaction_id: 'tx-1',
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { amount: 2500, transaction_date: '2025-01-01' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions/1/match', {
        method: 'POST',
        body: JSON.stringify({ transaction_id: 'tx-1' }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await matchTransaction(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.message).toBe('Transaction matched successfully')
    })

    it('should return 400 for invalid transaction_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/expected-transactions/1/match', {
        method: 'POST',
        body: JSON.stringify({ transaction_id: 'invalid' }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await matchTransaction(request, { params })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/expected-transactions/[id]/unmatch', () => {
    it('should unmatch transaction', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                matched_transaction_id: 'tx-1',
                expected_date: '2025-01-01',
              },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions/1/unmatch', {
        method: 'POST',
      })

      const params = Promise.resolve({ id: '1' })
      const response = await unmatchTransaction(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.message).toBe('Transaction unmatched successfully')
    })
  })

  describe('POST /api/expected-transactions/[id]/skip', () => {
    it('should skip transaction', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: '1', status: 'skipped' },
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/expected-transactions/1/skip', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Not needed this month' }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await skipTransaction(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.message).toBe('Expected transaction marked as skipped')
    })
  })
})
