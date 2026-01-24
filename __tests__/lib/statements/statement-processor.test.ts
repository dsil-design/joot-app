/**
 * Statement Processing Service Tests
 */

import {
  StatementProcessor,
  ProcessingResult,
  ProcessingProgress,
  ProcessingStatus,
} from '@/lib/statements/statement-processor';

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseStorage = {
  from: jest.fn().mockReturnValue({
    download: jest.fn(),
  }),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
    storage: mockSupabaseStorage,
  })),
}));

// Mock PDF extractor
jest.mock('@/lib/statements/pdf-extractor', () => ({
  processPDF: jest.fn(),
  isValidPDF: jest.fn(),
}));

import { processPDF, isValidPDF } from '@/lib/statements/pdf-extractor';

const mockProcessPDF = processPDF as jest.Mock;
const mockIsValidPDF = isValidPDF as jest.Mock;

describe('StatementProcessor', () => {
  let processor: StatementProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new StatementProcessor('https://test.supabase.co', 'test-key');

    // Reset all mocks
    mockSupabaseFrom.mockReset();
    mockSupabaseStorage.from.mockReset();
    mockSupabaseStorage.from.mockReturnValue({
      download: jest.fn(),
    });
  });

  describe('process', () => {
    const mockUpload = {
      id: 'upload-123',
      user_id: 'user-456',
      filename: 'statement.pdf',
      file_path: 'user-456/upload-123.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      payment_method_id: 'pm-789',
      statement_period_start: '2024-01-01',
      statement_period_end: '2024-01-31',
      status: 'pending' as ProcessingStatus,
      transactions_extracted: 0,
      transactions_matched: 0,
      transactions_new: 0,
      extraction_started_at: null,
      extraction_completed_at: null,
      extraction_error: null,
      extraction_log: null,
    };

    const mockPdfBuffer = Buffer.from('%PDF-1.4');

    const mockParseResult = {
      success: true,
      parserKey: 'chase',
      transactions: [
        {
          transactionDate: new Date('2024-01-15'),
          description: 'STARBUCKS',
          amount: 5.50,
          currency: 'USD',
          type: 'charge' as const,
        },
        {
          transactionDate: new Date('2024-01-16'),
          description: 'AMAZON',
          amount: 25.00,
          currency: 'USD',
          type: 'charge' as const,
        },
      ],
      errors: [],
      warnings: [],
      confidence: 85,
      pageCount: 2,
    };

    function setupMocks(overrides: {
      uploadRecord?: typeof mockUpload | null;
      downloadError?: boolean;
      isValidPdf?: boolean;
      parseError?: string;
    } = {}) {
      const {
        uploadRecord = mockUpload,
        downloadError = false,
        isValidPdf = true,
        parseError,
      } = overrides;

      // Mock upload record query
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'statement_uploads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: uploadRecord,
                  error: uploadRecord ? null : { message: 'Not found' },
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'transactions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      // Mock file download
      mockSupabaseStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue(
          downloadError
            ? { data: null, error: { message: 'Download failed' } }
            : { data: new Blob([mockPdfBuffer]), error: null }
        ),
      });

      // Mock PDF validation
      mockIsValidPDF.mockReturnValue(isValidPdf);

      // Mock PDF processing
      mockProcessPDF.mockResolvedValue(
        parseError
          ? { extraction: { success: false }, error: parseError }
          : { extraction: { success: true }, parseResult: mockParseResult }
      );
    }

    it('should process a statement successfully', async () => {
      setupMocks();

      const result = await processor.process('upload-123');

      expect(result.success).toBe(true);
      expect(result.uploadId).toBe('upload-123');
      expect(result.transactionsExtracted).toBe(2);
      expect(result.log.length).toBeGreaterThan(0);
      expect(result.log[result.log.length - 1].step).toBe('completed');
    });

    it('should report progress during processing', async () => {
      setupMocks();
      const progressUpdates: ProcessingProgress[] = [];

      const result = await processor.process('upload-123', {
        onProgress: (p) => progressUpdates.push(p),
      });

      expect(result.log.length).toBeGreaterThan(0);
      expect(result.log.some(p => p.step === 'downloading')).toBe(true);
      expect(result.log.some(p => p.step === 'extracting')).toBe(true);
      expect(result.log.some(p => p.step === 'completed')).toBe(true);
    });

    it('should fail if upload record not found', async () => {
      setupMocks({ uploadRecord: null });

      const result = await processor.process('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if upload is already processing', async () => {
      setupMocks({ uploadRecord: { ...mockUpload, status: 'processing' } });

      const result = await processor.process('upload-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already being processed');
    });

    it('should fail if file download fails', async () => {
      setupMocks({ downloadError: true });

      const result = await processor.process('upload-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to download');
    });

    it('should fail if PDF is invalid', async () => {
      setupMocks({ isValidPdf: false });

      const result = await processor.process('upload-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid PDF');
    });

    it('should fail if PDF parsing fails', async () => {
      setupMocks({ parseError: 'Could not detect statement type' });

      const result = await processor.process('upload-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not detect statement type');
    });

    it('should skip matching when option is set', async () => {
      setupMocks();

      const result = await processor.process('upload-123', { skipMatching: true });

      expect(result.success).toBe(true);
      expect(result.transactionsExtracted).toBe(2);
      expect(result.transactionsNew).toBe(2);
      expect(result.transactionsMatched).toBe(0);
    });

    it('should use specified parser when provided', async () => {
      setupMocks();

      await processor.process('upload-123', { parser: 'chase' });

      expect(mockProcessPDF).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({ parser: 'chase' })
      );
    });

    it('should include all transactions as suggestions', async () => {
      setupMocks();

      const result = await processor.process('upload-123');

      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].statementTransaction.description).toBe('STARBUCKS');
      expect(result.suggestions[1].statementTransaction.description).toBe('AMAZON');
    });
  });

  describe('getStatus', () => {
    it('should return null for non-existent upload', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const status = await processor.getStatus('nonexistent');

      expect(status).toBeNull();
    });

    it('should return status for existing upload', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                status: 'completed',
                extraction_log: { log: [{ step: 'completed', percent: 100, message: 'Done' }] },
                extraction_error: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const status = await processor.getStatus('upload-123');

      expect(status).not.toBeNull();
      expect(status!.status).toBe('completed');
    });
  });

  describe('retry', () => {
    it('should throw if upload not found', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      await expect(processor.retry('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw if upload is not in failed state', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'completed' },
              error: null,
            }),
          }),
        }),
      });

      await expect(processor.retry('upload-123')).rejects.toThrow('Cannot retry');
    });
  });
});

describe('Processing steps', () => {
  it('should progress through all steps in order', async () => {
    // Mock setup for full processing
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'statement_uploads') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'upload-123',
                  user_id: 'user-456',
                  filename: 'test.pdf',
                  file_path: 'user-456/upload-123.pdf',
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      if (table === 'transactions') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockSupabaseFrom.mockImplementation(mockFrom);

    mockSupabaseStorage.from.mockReturnValue({
      download: jest.fn().mockResolvedValue({
        data: new Blob([Buffer.from('%PDF-1.4')]),
        error: null,
      }),
    });

    mockIsValidPDF.mockReturnValue(true);
    mockProcessPDF.mockResolvedValue({
      extraction: { success: true },
      parseResult: {
        success: true,
        parserKey: 'chase',
        transactions: [],
        errors: [],
        warnings: [],
        confidence: 80,
      },
    });

    const processor = new StatementProcessor('https://test.supabase.co', 'test-key');
    const result = await processor.process('upload-123');

    // Verify steps are in order
    const steps = result.log.map(p => p.step);
    expect(steps).toContain('downloading');
    expect(steps).toContain('validating');
    expect(steps).toContain('extracting');

    // Verify completed is last
    expect(steps[steps.length - 1]).toBe('completed');
  });
});
