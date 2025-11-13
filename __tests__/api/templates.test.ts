import { GET as getTemplates, POST as createTemplate } from '@/app/api/templates/route'
import { GET as getTemplate, PATCH as updateTemplate, DELETE as deleteTemplate } from '@/app/api/templates/[id]/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Templates API', () => {
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

  describe('GET /api/templates', () => {
    it('should return templates for authenticated user', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Rent',
          amount: 2500,
          is_active: true,
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockTemplates,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/templates')
      const response = await getTemplates(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/templates')
      const response = await getTemplates(request)

      expect(response.status).toBe(401)
    })

    it('should filter templates by is_active', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/templates?is_active=true')
      const response = await getTemplates(request)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/templates', () => {
    it('should create template with valid data', async () => {
      const newTemplate = {
        id: '1',
        name: 'Rent',
        amount: 2500,
        original_currency: 'USD',
        transaction_type: 'expense',
        frequency: 'monthly',
        start_date: '2025-01-01',
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newTemplate,
              error: null,
            }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newTemplate,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify(newTemplate),
      })

      const response = await createTemplate(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.message).toBe('Template created successfully')
    })

    it('should return 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          amount: -100,
        }),
      })

      const response = await createTemplate(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/templates/[id]', () => {
    it('should return template by id', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Rent',
        amount: 2500,
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTemplate,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/templates/1')
      const params = Promise.resolve({ id: '1' })
      const response = await getTemplate(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toBeDefined()
    })

    it('should return 404 for non-existent template', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/templates/999')
      const params = Promise.resolve({ id: '999' })
      const response = await getTemplate(request, { params })

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/templates/[id]', () => {
    it('should update template', async () => {
      const updatedTemplate = {
        id: '1',
        name: 'Updated Rent',
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
              data: updatedTemplate,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/templates/1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Rent' }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await updateTemplate(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.message).toBe('Template updated successfully')
    })
  })

  describe('DELETE /api/templates/[id]', () => {
    it('should soft delete template', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/templates/1', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: '1' })
      const response = await deleteTemplate(request, { params })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.message).toBe('Template deleted successfully')
    })
  })
})
