import { GET as getMonthPlans, POST as createMonthPlan } from '@/app/api/month-plans/route'
import { GET as getMonthPlan, PATCH as updateMonthPlan } from '@/app/api/month-plans/[id]/route'
import { POST as generateExpected } from '@/app/api/month-plans/[id]/generate-expected/route'
import { GET as getMatchSuggestions } from '@/app/api/month-plans/[id]/match-suggestions/route'
import { POST as autoMatch } from '@/app/api/month-plans/[id]/auto-match/route'
import { GET as getVarianceReport } from '@/app/api/month-plans/[id]/variance-report/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Month Plans API', () => {
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

  describe('GET /api/month-plans', () => {
    it('should return month plans for authenticated user', async () => {
      const mockPlans = [
        {
          id: '1',
          month_year: '2025-01-01',
          status: 'active',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockPlans,
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/month-plans')
      const response = await getMonthPlans(request)

      expect(response.status).toBe(200)
    })

    it('should filter by year', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/month-plans?year=2025')
      const response = await getMonthPlans(request)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/month-plans', () => {
    it('should create or get month plan', async () => {
      const mockPlan = {
        id: '1',
        month_year: '2025-01-01',
        status: 'draft',
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPlan,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/month-plans', {
        method: 'POST',
        body: JSON.stringify({ month_year: '2025-01-01' }),
      })

      const response = await createMonthPlan(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.message).toBe('Month plan created successfully')
    })

    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest('http://localhost:3000/api/month-plans', {
        method: 'POST',
        body: JSON.stringify({ month_year: 'invalid-date' }),
      })

      const response = await createMonthPlan(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/month-plans/[id]/generate-expected', () => {
    it('should generate expected transactions', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: '1', month_year: '2025-01-01' },
              error: null,
            }),
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
          lte: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/month-plans/1/generate-expected', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await generateExpected(request, { params })

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/month-plans/[id]/match-suggestions', () => {
    it('should return match suggestions', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: '1', month_year: '2025-01-01' },
              error: null,
            }),
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
          is: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/month-plans/1/match-suggestions')
      const params = Promise.resolve({ id: '1' })
      const response = await getMatchSuggestions(request, { params })

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/month-plans/[id]/auto-match', () => {
    it('should auto-match transactions', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: '1', month_year: '2025-01-01' },
              error: null,
            }),
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
          is: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/month-plans/1/auto-match', {
        method: 'POST',
        body: JSON.stringify({ confidence_threshold: 80 }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await autoMatch(request, { params })

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/month-plans/[id]/variance-report', () => {
    it('should generate variance report', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: '1', month_year: '2025-01-01' },
              error: null,
            }),
          }),
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/month-plans/1/variance-report')
      const params = Promise.resolve({ id: '1' })
      const response = await getVarianceReport(request, { params })

      expect(response.status).toBe(200)
    })
  })
})
