/**
 * Tests for duplicate statement detection utilities
 */

import {
  calculateFileHash,
  checkForDuplicates,
  getDuplicateMessage,
  DuplicateCheckResult,
  DuplicateMatch,
} from '@/lib/statements/duplicate-detector'

// Mock Supabase client
const createMockSupabase = (options: {
  hashMatch?: boolean
  periodMatches?: number
  hashMatchData?: Record<string, unknown>
  periodMatchData?: Record<string, unknown>[]
} = {}) => {
  const { hashMatch = false, periodMatches = 0, hashMatchData, periodMatchData } = options

  const hashResponse = hashMatch
    ? {
        data: hashMatchData || {
          id: 'upload-123',
          filename: 'statement-jan-2024.pdf',
          uploaded_at: '2024-01-15T10:30:00Z',
          statement_period_start: '2024-01-01',
          statement_period_end: '2024-01-31',
          status: 'completed',
          transactions_extracted: 15,
          transactions_matched: 12,
        },
        error: null,
      }
    : { data: null, error: { code: 'PGRST116', message: 'No rows found' } }

  const periodResponse = periodMatches > 0
    ? {
        data: periodMatchData || Array.from({ length: periodMatches }, (_, i) => ({
          id: `upload-period-${i + 1}`,
          filename: `statement-overlap-${i + 1}.pdf`,
          uploaded_at: '2024-01-10T10:30:00Z',
          statement_period_start: '2024-01-01',
          statement_period_end: '2024-01-31',
          status: 'completed',
          transactions_extracted: 10,
          transactions_matched: 8,
        })),
        error: null,
      }
    : { data: [], error: null }

  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(hashResponse),
            }),
            not: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    neq: jest.fn().mockResolvedValue(periodResponse),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof checkForDuplicates>[0]
}

describe('Duplicate Statement Detection', () => {
  describe('calculateFileHash', () => {
    it('should calculate SHA256 hash for a File object', async () => {
      // Create a simple test file
      const content = 'Hello, World!'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const hash = await calculateFileHash(file)

      // SHA256 hash of 'Hello, World!' is a known value
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
      expect(hash.length).toBe(64)
    })

    it('should calculate SHA256 hash for an ArrayBuffer', async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode('Test content').buffer

      const hash = await calculateFileHash(buffer)

      expect(hash).toMatch(/^[a-f0-9]{64}$/)
      expect(hash.length).toBe(64)
    })

    it('should produce consistent hashes for the same content', async () => {
      const content = 'Same content for both files'
      const file1 = new File([content], 'file1.txt', { type: 'text/plain' })
      const file2 = new File([content], 'file2.txt', { type: 'text/plain' })

      const hash1 = await calculateFileHash(file1)
      const hash2 = await calculateFileHash(file2)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different content', async () => {
      const file1 = new File(['Content A'], 'file1.txt', { type: 'text/plain' })
      const file2 = new File(['Content B'], 'file2.txt', { type: 'text/plain' })

      const hash1 = await calculateFileHash(file1)
      const hash2 = await calculateFileHash(file2)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty files', async () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' })
      const hash = await calculateFileHash(file)

      // SHA256 of empty string is a known value
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })
  })

  describe('checkForDuplicates', () => {
    const userId = 'user-123'
    const fileHash = 'abc123def456'
    const paymentMethodId = 'pm-123'
    const periodStart = '2024-01-01'
    const periodEnd = '2024-01-31'

    it('should return no duplicates when none exist', async () => {
      const mockSupabase = createMockSupabase({ hashMatch: false, periodMatches: 0 })

      const result = await checkForDuplicates(
        mockSupabase,
        userId,
        fileHash,
        paymentMethodId,
        periodStart,
        periodEnd
      )

      expect(result.hasDuplicate).toBe(false)
      expect(result.duplicates).toHaveLength(0)
      expect(result.canProceed).toBe(true)
    })

    it('should detect exact file hash duplicate', async () => {
      const mockSupabase = createMockSupabase({ hashMatch: true, periodMatches: 0 })

      const result = await checkForDuplicates(
        mockSupabase,
        userId,
        fileHash,
        paymentMethodId,
        periodStart,
        periodEnd
      )

      expect(result.hasDuplicate).toBe(true)
      expect(result.duplicates).toHaveLength(1)
      expect(result.duplicates[0].type).toBe('file_hash')
      expect(result.duplicates[0].existingUpload.id).toBe('upload-123')
      // File hash duplicates should not allow proceeding
      expect(result.canProceed).toBe(false)
    })

    it('should detect period overlap duplicate', async () => {
      const mockSupabase = createMockSupabase({ hashMatch: false, periodMatches: 1 })

      const result = await checkForDuplicates(
        mockSupabase,
        userId,
        fileHash,
        paymentMethodId,
        periodStart,
        periodEnd
      )

      expect(result.hasDuplicate).toBe(true)
      expect(result.duplicates).toHaveLength(1)
      expect(result.duplicates[0].type).toBe('period_overlap')
      // Period overlap should allow proceeding (different file for same period)
      expect(result.canProceed).toBe(true)
    })

    it('should detect multiple period overlap duplicates', async () => {
      const mockSupabase = createMockSupabase({ hashMatch: false, periodMatches: 3 })

      const result = await checkForDuplicates(
        mockSupabase,
        userId,
        fileHash,
        paymentMethodId,
        periodStart,
        periodEnd
      )

      expect(result.hasDuplicate).toBe(true)
      expect(result.duplicates).toHaveLength(3)
      expect(result.duplicates.every(d => d.type === 'period_overlap')).toBe(true)
      expect(result.canProceed).toBe(true)
    })

    it('should check without period info (no period overlap check)', async () => {
      const mockSupabase = createMockSupabase({ hashMatch: false, periodMatches: 0 })

      const result = await checkForDuplicates(
        mockSupabase,
        userId,
        fileHash
        // No payment method or period info
      )

      expect(result.hasDuplicate).toBe(false)
      expect(result.canProceed).toBe(true)
    })

    it('should include correct metadata in duplicates', async () => {
      const mockSupabase = createMockSupabase({
        hashMatch: true,
        hashMatchData: {
          id: 'upload-abc',
          filename: 'chase-jan-2024.pdf',
          uploaded_at: '2024-01-15T10:30:00Z',
          statement_period_start: '2024-01-01',
          statement_period_end: '2024-01-31',
          status: 'completed',
          transactions_extracted: 25,
          transactions_matched: 20,
        },
      })

      const result = await checkForDuplicates(
        mockSupabase,
        userId,
        fileHash,
        paymentMethodId,
        periodStart,
        periodEnd
      )

      expect(result.duplicates[0].existingUpload).toEqual({
        id: 'upload-abc',
        filename: 'chase-jan-2024.pdf',
        uploaded_at: '2024-01-15T10:30:00Z',
        statement_period_start: '2024-01-01',
        statement_period_end: '2024-01-31',
        status: 'completed',
        transactions_extracted: 25,
        transactions_matched: 20,
      })
    })
  })

  describe('getDuplicateMessage', () => {
    it('should return null for no duplicates', () => {
      const result: DuplicateCheckResult = {
        hasDuplicate: false,
        duplicates: [],
        canProceed: true,
      }

      expect(getDuplicateMessage(result)).toBeNull()
    })

    it('should return file hash message for file duplicates', () => {
      const result: DuplicateCheckResult = {
        hasDuplicate: true,
        duplicates: [
          {
            type: 'file_hash',
            existingUpload: {
              id: 'upload-123',
              filename: 'statement.pdf',
              uploaded_at: '2024-01-15T10:30:00Z',
              statement_period_start: '2024-01-01',
              statement_period_end: '2024-01-31',
              status: 'completed',
              transactions_extracted: 10,
              transactions_matched: 8,
            },
          },
        ],
        canProceed: false,
      }

      const message = getDuplicateMessage(result)
      expect(message).toContain('This file has already been uploaded')
      expect(message).toContain('Jan 15, 2024')
    })

    it('should return period overlap message for period duplicates', () => {
      const result: DuplicateCheckResult = {
        hasDuplicate: true,
        duplicates: [
          {
            type: 'period_overlap',
            existingUpload: {
              id: 'upload-456',
              filename: 'statement.pdf',
              uploaded_at: '2024-01-10T10:30:00Z',
              statement_period_start: '2024-01-01',
              statement_period_end: '2024-01-31',
              status: 'completed',
              transactions_extracted: 10,
              transactions_matched: 8,
            },
          },
        ],
        canProceed: true,
      }

      const message = getDuplicateMessage(result)
      expect(message).toContain('You already uploaded a statement for this period')
      expect(message).toContain('Jan 1, 2024')
      expect(message).toContain('Jan 31, 2024')
    })

    it('should prioritize file hash message over period overlap', () => {
      const result: DuplicateCheckResult = {
        hasDuplicate: true,
        duplicates: [
          {
            type: 'file_hash',
            existingUpload: {
              id: 'upload-123',
              filename: 'statement.pdf',
              uploaded_at: '2024-01-15T10:30:00Z',
              statement_period_start: null,
              statement_period_end: null,
              status: 'pending',
              transactions_extracted: 0,
              transactions_matched: 0,
            },
          },
          {
            type: 'period_overlap',
            existingUpload: {
              id: 'upload-456',
              filename: 'other.pdf',
              uploaded_at: '2024-01-10T10:30:00Z',
              statement_period_start: '2024-01-01',
              statement_period_end: '2024-01-31',
              status: 'completed',
              transactions_extracted: 10,
              transactions_matched: 8,
            },
          },
        ],
        canProceed: false,
      }

      const message = getDuplicateMessage(result)
      expect(message).toContain('This file has already been uploaded')
    })
  })
})
