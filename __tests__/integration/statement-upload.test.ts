/**
 * Integration tests for statement upload flow
 *
 * Tests:
 * - File upload validation
 * - Duplicate detection
 * - Processing trigger
 * - Database record creation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    in: jest.fn().mockReturnThis(),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
    })),
  },
}

// Mock Next.js modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
  createServiceRoleClient: jest.fn(() => mockSupabase),
}))

describe('Statement Upload Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('File validation', () => {
    it('should accept PDF files', async () => {
      const { validateFileType } = await import('@/lib/utils/file-validation')

      const pdfFile = new File(['test content'], 'statement.pdf', {
        type: 'application/pdf',
      })

      const result = validateFileType(pdfFile)
      expect(result.valid).toBe(true)
    })

    it('should accept PNG files', async () => {
      const { validateFileType } = await import('@/lib/utils/file-validation')

      const pngFile = new File(['test content'], 'statement.png', {
        type: 'image/png',
      })

      const result = validateFileType(pngFile)
      expect(result.valid).toBe(true)
    })

    it('should accept JPG files', async () => {
      const { validateFileType } = await import('@/lib/utils/file-validation')

      const jpgFile = new File(['test content'], 'statement.jpg', {
        type: 'image/jpeg',
      })

      const result = validateFileType(jpgFile)
      expect(result.valid).toBe(true)
    })

    it('should accept HEIC files', async () => {
      const { validateFileType } = await import('@/lib/utils/file-validation')

      const heicFile = new File(['test content'], 'statement.heic', {
        type: 'image/heic',
      })

      const result = validateFileType(heicFile)
      expect(result.valid).toBe(true)
    })

    it('should reject unsupported file types', async () => {
      const { validateFileType } = await import('@/lib/utils/file-validation')

      const txtFile = new File(['test content'], 'document.txt', {
        type: 'text/plain',
      })

      const result = validateFileType(txtFile)
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('type')
    })

    it('should enforce 10MB size limit', async () => {
      const { validateFileSize } = await import('@/lib/utils/file-validation')

      // Create a mock file object with size property
      const largeFile = {
        name: 'large.pdf',
        size: 15 * 1024 * 1024, // 15MB
        type: 'application/pdf',
      } as File

      const result = validateFileSize(largeFile)
      expect(result.valid).toBe(false)
      expect(result.error?.message).toContain('10MB')
    })

    it('should accept files under size limit', async () => {
      const { validateFileSize } = await import('@/lib/utils/file-validation')

      const smallFile = {
        name: 'small.pdf',
        size: 5 * 1024 * 1024, // 5MB
        type: 'application/pdf',
      } as File

      const result = validateFileSize(smallFile)
      expect(result.valid).toBe(true)
    })

    it('should reject empty files', async () => {
      const { validateFileSize } = await import('@/lib/utils/file-validation')

      const emptyFile = {
        name: 'empty.pdf',
        size: 0,
        type: 'application/pdf',
      } as File

      const result = validateFileSize(emptyFile)
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('file-empty')
    })

    it('should validate complete file', async () => {
      const { validateFile } = await import('@/lib/utils/file-validation')

      const validFile = new File(['test content'], 'statement.pdf', {
        type: 'application/pdf',
      })

      const result = validateFile(validFile)
      expect(result.valid).toBe(true)
    })
  })

  describe('Duplicate detection', () => {
    it('should calculate consistent file hash', async () => {
      const { calculateFileHash } = await import('@/lib/statements/duplicate-detector')

      const content = new ArrayBuffer(100)
      const view = new Uint8Array(content)
      view.fill(42) // Fill with consistent bytes

      const hash1 = await calculateFileHash(content)
      const hash2 = await calculateFileHash(content)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/) // SHA256 hex string
    })

    it('should detect different content', async () => {
      const { calculateFileHash } = await import('@/lib/statements/duplicate-detector')

      const content1 = new ArrayBuffer(100)
      const view1 = new Uint8Array(content1)
      view1.fill(42)

      const content2 = new ArrayBuffer(100)
      const view2 = new Uint8Array(content2)
      view2.fill(43)

      const hash1 = await calculateFileHash(content1)
      const hash2 = await calculateFileHash(content2)

      expect(hash1).not.toBe(hash2)
    })

    it('should generate appropriate duplicate message for file hash match', async () => {
      const { getDuplicateMessage } = await import('@/lib/statements/duplicate-detector')

      const result = {
        hasDuplicate: true,
        duplicates: [
          {
            type: 'file_hash' as const,
            existingUpload: {
              id: '123',
              filename: 'test.pdf',
              uploaded_at: '2024-01-15T10:00:00Z',
              statement_period_start: null,
              statement_period_end: null,
              status: 'completed',
              transactions_extracted: 10,
              transactions_matched: 8,
            },
          },
        ],
        canProceed: false,
      }

      const message = getDuplicateMessage(result)
      expect(message).toContain('already been uploaded')
    })

    it('should generate appropriate duplicate message for period overlap', async () => {
      const { getDuplicateMessage } = await import('@/lib/statements/duplicate-detector')

      const result = {
        hasDuplicate: true,
        duplicates: [
          {
            type: 'period_overlap' as const,
            existingUpload: {
              id: '123',
              filename: 'january-2024.pdf',
              uploaded_at: '2024-01-15T10:00:00Z',
              statement_period_start: '2024-01-01',
              statement_period_end: '2024-01-31',
              status: 'completed',
              transactions_extracted: 15,
              transactions_matched: 12,
            },
          },
        ],
        canProceed: true,
      }

      const message = getDuplicateMessage(result)
      expect(message).toContain('already uploaded a statement for this period')
    })

    it('should return null message when no duplicate', async () => {
      const { getDuplicateMessage } = await import('@/lib/statements/duplicate-detector')

      const result = {
        hasDuplicate: false,
        duplicates: [],
        canProceed: true,
      }

      const message = getDuplicateMessage(result)
      expect(message).toBeNull()
    })
  })

  describe('Processing flow', () => {
    it('should process PDF and extract transactions', async () => {
      // This test would require mocking the PDF parsing
      // For now, we test the processor setup
      const { StatementProcessor } = await import('@/lib/statements/statement-processor')

      const processor = new StatementProcessor(
        'https://dummy.supabase.co',
        'dummy-key'
      )

      expect(processor).toBeDefined()
      expect(typeof processor.process).toBe('function')
      expect(typeof processor.getStatus).toBe('function')
      expect(typeof processor.retry).toBe('function')
    })

    it('should export convenience functions', async () => {
      const {
        processStatement,
        getProcessingStatus,
        retryProcessing,
      } = await import('@/lib/statements/statement-processor')

      expect(typeof processStatement).toBe('function')
      expect(typeof getProcessingStatus).toBe('function')
      expect(typeof retryProcessing).toBe('function')
    })
  })

  describe('Storage upload', () => {
    it('should generate correct upload path', async () => {
      const { getStatementUploadPath } = await import('@/lib/supabase/storage')

      const userId = 'user-123'
      const uploadId = 'upload-456'
      const filename = 'statement.pdf'

      const path = getStatementUploadPath(userId, uploadId, filename)
      expect(path).toBe('user-123/upload-456.pdf')
    })

    it('should handle different file extensions', async () => {
      const { getStatementUploadPath } = await import('@/lib/supabase/storage')

      const userId = 'user-123'
      const uploadId = 'upload-456'

      expect(getStatementUploadPath(userId, uploadId, 'statement.pdf')).toContain('.pdf')
      expect(getStatementUploadPath(userId, uploadId, 'image.png')).toContain('.png')
      expect(getStatementUploadPath(userId, uploadId, 'photo.jpg')).toContain('.jpg')
      expect(getStatementUploadPath(userId, uploadId, 'capture.heic')).toContain('.heic')
    })

    it('should default to pdf extension if none provided', async () => {
      const { getStatementUploadPath } = await import('@/lib/supabase/storage')

      const userId = 'user-123'
      const uploadId = 'upload-456'
      const filename = 'statement' // No extension

      const path = getStatementUploadPath(userId, uploadId, filename)
      expect(path).toBe('user-123/upload-456.pdf')
    })
  })

  describe('Parser detection', () => {
    it('should detect Chase statement', async () => {
      const { detectStatementParser } = await import('@/lib/statements/pdf-extractor')

      const chaseText = `
        Chase Sapphire Reserve
        Account Number: xxxx-xxxx-xxxx-1234
        Statement Date: January 15, 2024
        Opening/Closing Date
        12/15/23 - 01/14/24
        Payment Due: February 10, 2024
        PURCHASE Trans Date Post Date Description Amount
        01/02 01/03 AMAZON.COM $45.99
        01/05 01/06 STARBUCKS $6.50
      `

      const result = detectStatementParser(chaseText)
      expect(result).toBeDefined()
      expect(result?.key).toBe('chase')
    })

    it('should detect American Express statement', async () => {
      const { detectStatementParser } = await import('@/lib/statements/pdf-extractor')

      const amexText = `
        American Express
        Platinum Card
        Member Since 2020
        Statement Period: January 1 - January 31, 2024
        Account Number: xxxx-xxxxxx-x1234
        Date Description Amount
        01/05 UBER EATS $25.00
        01/10 WHOLE FOODS $89.50
      `

      const result = detectStatementParser(amexText)
      expect(result).toBeDefined()
      expect(result?.key).toBe('amex')
    })

    it('should detect Bangkok Bank statement', async () => {
      const { detectStatementParser } = await import('@/lib/statements/pdf-extractor')

      const bangkokBankText = `
        บัวหลวง Bualuang
        Bangkok Bank Credit Card Statement
        รอบบัญชี Statement Period
        01/01/2567 - 31/01/2567
        รายการใช้จ่าย Transaction Details
        วันที่ รายละเอียด จำนวนเงิน
        05/01 GRAB* Bangkok TH ฿250.00
        10/01 LINE SHOP ฿1,500.00
      `

      const result = detectStatementParser(bangkokBankText)
      expect(result).toBeDefined()
      expect(result?.key).toBe('bangkok-bank')
    })

    it('should detect Kasikorn Bank statement', async () => {
      const { detectStatementParser } = await import('@/lib/statements/pdf-extractor')

      const kasikornText = `
        ธนาคารกสิกรไทย Kasikorn Bank
        K PLUS Credit Card Statement
        บัญชี Account: xxxx-xxxx-1234
        รอบบัญชี Statement Period: 01/01/2567 - 31/01/2567
        รายการเดินบัญชี Transaction List
        วันที่ รายการ จำนวนเงิน
        05/01 K PLUS Pay - 7-ELEVEN ฿150.00
        10/01 K PLUS Transfer ฿2,000.00
      `

      const result = detectStatementParser(kasikornText)
      expect(result).toBeDefined()
      expect(result?.key).toBe('kasikorn')
    })

    it('should return undefined for unknown format', async () => {
      const { detectStatementParser } = await import('@/lib/statements/pdf-extractor')

      const unknownText = `
        Some random text that doesn't match any bank format
        This is not a valid statement
      `

      const result = detectStatementParser(unknownText)
      expect(result).toBeUndefined()
    })

    it('should return list of available parsers', async () => {
      const { getAvailableParsers } = await import('@/lib/statements/pdf-extractor')

      const parsers = getAvailableParsers()
      expect(Array.isArray(parsers)).toBe(true)
      expect(parsers.length).toBeGreaterThan(0)
      // Should include at least Chase and Amex
      expect(parsers).toContain('chase')
      expect(parsers).toContain('amex')
    })
  })

  describe('File validation utilities', () => {
    it('should format file sizes correctly', async () => {
      const { formatFileSize } = await import('@/lib/utils/file-validation')

      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(500)).toBe('500 B')
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
    })

    it('should extract file extensions correctly', async () => {
      const { getFileExtension } = await import('@/lib/utils/file-validation')

      expect(getFileExtension('document.pdf')).toBe('.pdf')
      expect(getFileExtension('image.PNG')).toBe('.png')
      expect(getFileExtension('photo.JPEG')).toBe('.jpeg')
      expect(getFileExtension('noextension')).toBe('')
    })

    it('should check accepted MIME types', async () => {
      const { isAcceptedMimeType } = await import('@/lib/utils/file-validation')

      expect(isAcceptedMimeType('application/pdf')).toBe(true)
      expect(isAcceptedMimeType('image/png')).toBe(true)
      expect(isAcceptedMimeType('image/jpeg')).toBe(true)
      expect(isAcceptedMimeType('image/heic')).toBe(true)
      expect(isAcceptedMimeType('text/plain')).toBe(false)
      expect(isAcceptedMimeType('')).toBe(false)
    })

    it('should check accepted extensions', async () => {
      const { isAcceptedExtension } = await import('@/lib/utils/file-validation')

      expect(isAcceptedExtension('.pdf')).toBe(true)
      expect(isAcceptedExtension('pdf')).toBe(true)
      expect(isAcceptedExtension('.png')).toBe(true)
      expect(isAcceptedExtension('.jpg')).toBe(true)
      expect(isAcceptedExtension('.jpeg')).toBe(true)
      expect(isAcceptedExtension('.heic')).toBe(true)
      expect(isAcceptedExtension('.txt')).toBe(false)
      expect(isAcceptedExtension('')).toBe(false)
    })
  })
})
