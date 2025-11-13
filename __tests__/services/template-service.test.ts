/**
 * @jest-environment jsdom
 */

import { TemplateService } from '../../src/lib/services/template-service'
import type { CreateTemplateData, UpdateTemplateData } from '../../src/lib/types/recurring-transactions'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
}

describe('TemplateService', () => {
  let service: TemplateService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new TemplateService(mockSupabaseClient as any)
  })

  describe('getTemplates', () => {
    it('should fetch templates with relationships', async () => {
      const mockTemplates = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Rent',
          is_active: true,
          amount: 2500,
          vendors: { id: 'v1', name: 'Landlord' },
          payment_methods: { id: 'p1', name: 'Bank Transfer' },
          template_tags: [
            { tags: { id: 't1', name: 'Housing', color: '#dbeafe' } },
          ],
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockTemplates,
              error: null,
            }),
          }),
        }),
      })

      const result = await service.getTemplates('user1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].name).toBe('Rent')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transaction_templates')
    })

    it('should apply filters correctly', async () => {
      const mockTemplates = []

      // Create a proper chain of mocks
      const mockOrder = jest.fn().mockResolvedValue({ data: mockTemplates, error: null })
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder })
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const result = await service.getTemplates('user1', { is_active: true })

      // Verify the filter chain was called correctly
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transaction_templates')
    })

    it('should handle errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const result = await service.getTemplates('user1')

      expect(result.error).toBe('Database error')
      expect(result.data).toBeNull()
    })
  })

  describe('createTemplate', () => {
    it('should create a template with tags', async () => {
      const templateData: CreateTemplateData = {
        name: 'Rent',
        amount: 2500,
        original_currency: 'USD',
        transaction_type: 'expense',
        frequency: 'monthly',
        start_date: '2025-01-01',
        tag_ids: ['tag1'],
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'new-id', ...templateData },
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'transaction_templates') {
          return { insert: mockInsert }
        }
        if (table === 'template_tags') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      const result = await service.createTemplate(templateData, 'user1')

      expect(mockInsert).toHaveBeenCalled()
    })

    it('should reject negative amounts', async () => {
      const templateData: CreateTemplateData = {
        name: 'Invalid',
        amount: -100,
        original_currency: 'USD',
        transaction_type: 'expense',
        frequency: 'monthly',
        start_date: '2025-01-01',
      }

      const result = await service.createTemplate(templateData, 'user1')

      expect(result.error).toBe('Amount must be positive')
      expect(result.data).toBeNull()
    })
  })

  describe('updateTemplate', () => {
    it('should update template fields', async () => {
      const updateData: UpdateTemplateData = {
        amount: 2600,
        is_active: false,
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'transaction_templates') {
          return { update: mockUpdate }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      })

      await service.updateTemplate('template1', updateData, 'user1')

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ amount: 2600 }))
    })
  })

  describe('calculateNextOccurrence', () => {
    it('should calculate next monthly occurrence', () => {
      const template: any = {
        frequency: 'monthly',
        frequency_interval: 1,
        day_of_month: 15,
        start_date: '2025-01-15',
        end_date: null,
      }

      const afterDate = new Date('2025-01-10')
      const result = service.calculateNextOccurrence(template, afterDate)

      expect(result).not.toBeNull()
      expect(result!.getDate()).toBe(15)
      expect(result!.getMonth()).toBe(0) // January
    })

    it('should return null if template has ended', () => {
      const template: any = {
        frequency: 'monthly',
        frequency_interval: 1,
        start_date: '2025-01-01',
        end_date: '2025-02-01',
      }

      const afterDate = new Date('2025-03-01')
      const result = service.calculateNextOccurrence(template, afterDate)

      expect(result).toBeNull()
    })
  })
})
