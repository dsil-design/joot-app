/**
 * PDF Text Extraction Service Tests
 */

import {
  extractPDFText,
  processPDF,
  isValidPDF,
  detectStatementParser,
  getAvailableParsers,
  getParserInfo,
  getAllParsersInfo,
} from '@/lib/statements/pdf-extractor';

// The extractor loads pdfjs-dist lazily via dynamic import, and pre-loads the
// worker onto globalThis. Both are mocked virtually so the suite never touches
// the real ESM build. The document below has THREE pages so that `maxPages`
// truncation is observable.
jest.mock('pdfjs-dist/legacy/build/pdf.worker.mjs', () => ({ WorkerMessageHandler: {} }), {
  virtual: true,
});

const PAGE_TEXT: Record<string, string[]> = {
  CHASE: [
    'Chase Sapphire Reserve',
    'Statement Period: 01/01/2024 - 01/31/2024',
    'Purchases',
  ],
  KASIKORNBANK: [
    'KASIKORNBANK',
    'Statement Period: 01/12/2024 - 31/12/2024',
    '05/12/2024  MERCHANT 100.00  -',
  ],
  AMEX: ['American Express', 'Statement Period: 01/01/2024 - 01/31/2024', 'Transactions'],
  DEFAULT: ['Unknown content', 'for testing', 'page three'],
};

function pageFor(marker: string, pageNumber: number) {
  const lines = PAGE_TEXT[marker] ?? PAGE_TEXT.DEFAULT;
  const line = lines[pageNumber - 1] ?? `page ${pageNumber}`;
  return {
    // One item per line; the extractor starts a new line whenever the y
    // coordinate in transform[5] changes, so give each its own y.
    getTextContent: async () => ({
      items: [{ str: line, transform: [1, 0, 0, 1, 0, 700 - pageNumber * 10] }],
    }),
    cleanup: () => {},
  };
}

const pdfjsMock = {
  getDocument: ({ data }: { data: Uint8Array }) => {
    const content = Buffer.from(data).toString('utf-8');

    if (content.includes('MOCK_ERROR')) {
      return { promise: Promise.reject(new Error('Mock PDF parsing error')) };
    }

    const marker = ['CHASE', 'KASIKORNBANK', 'AMEX'].find((m) => content.includes(m)) ?? 'DEFAULT';

    return {
      promise: Promise.resolve({
        numPages: 3,
        getPage: async (n: number) => pageFor(marker, n),
        getMetadata: async () => ({
          info: {
            Title: 'Test Statement',
            Author: 'Test Author',
            Creator: 'Test Creator',
            Producer: 'Test Producer',
            CreationDate: '2024-01-01',
            ModDate: '2024-01-15',
          },
        }),
        destroy: async () => {},
      }),
    };
  },
};

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => pdfjsMock, { virtual: true });

describe('PDF Text Extraction Service', () => {
  describe('extractPDFText', () => {
    it('should extract text from a PDF buffer', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await extractPDFText(mockBuffer);

      expect(result.success).toBe(true);
      expect(result.text).toContain('Chase');
      expect(result.pageCount).toBe(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should extract metadata from PDF', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await extractPDFText(mockBuffer);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe('Test Statement');
      expect(result.metadata?.author).toBe('Test Author');
    });

    it('should handle ArrayBuffer input', async () => {
      const mockArrayBuffer = new ArrayBuffer(20);
      const view = new Uint8Array(mockArrayBuffer);
      for (let i = 0; i < 'CHASE'.length; i++) {
        view[i] = 'CHASE'.charCodeAt(i);
      }

      const result = await extractPDFText(mockArrayBuffer);

      expect(result.success).toBe(true);
      expect(result.text).toContain('Chase');
    });

    it('should respect maxPages option', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await extractPDFText(mockBuffer, { maxPages: 2 });

      expect(result.success).toBe(true);
      // maxPages caps how much text is read, not what the document reports.
      expect(result.pageCount).toBe(3);
      expect(result.text).toContain('Chase Sapphire Reserve');
      expect(result.text).toContain('Statement Period');
      expect(result.text).not.toContain('Purchases');
    });

    it('should extract every page when maxPages is not set', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await extractPDFText(mockBuffer);

      expect(result.text).toContain('Purchases');
    });

    it('should handle PDF parsing errors', async () => {
      const mockBuffer = Buffer.from('MOCK_ERROR');
      const result = await extractPDFText(mockBuffer);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Mock PDF parsing error');
      expect(result.text).toBe('');
    });
  });

  describe('detectStatementParser', () => {
    it('should detect Chase statements', () => {
      const text = 'Chase Sapphire Reserve Statement for January 2024';
      const result = detectStatementParser(text);

      expect(result).toBeDefined();
      expect(result?.key).toBe('chase');
    });

    it('should detect Amex statements', () => {
      const text = 'American Express Platinum Card Statement';
      const result = detectStatementParser(text);

      expect(result).toBeDefined();
      expect(result?.key).toBe('amex');
    });

    it('should detect Bangkok Bank statements', () => {
      const text = 'Bangkok Bank Credit Card Statement';
      const result = detectStatementParser(text);

      expect(result).toBeDefined();
      expect(result?.key).toBe('bangkok-bank');
    });

    it('should detect Kasikorn statements', () => {
      const text = 'KASIKORNBANK Credit Card Statement';
      const result = detectStatementParser(text);

      expect(result).toBeDefined();
      expect(result?.key).toBe('kasikorn');
    });

    it('should return undefined for unknown statements', () => {
      const text = 'Random text that is not a statement';
      const result = detectStatementParser(text);

      expect(result).toBeUndefined();
    });
  });

  describe('getAvailableParsers', () => {
    it('should return all available parser keys', () => {
      const parsers = getAvailableParsers();

      expect(parsers).toContain('chase');
      expect(parsers).toContain('amex');
      expect(parsers).toContain('bangkok-bank');
      expect(parsers).toContain('kasikorn');
    });
  });

  describe('getParserInfo', () => {
    it('should return parser info for valid key', () => {
      const info = getParserInfo('chase');

      expect(info).toBeDefined();
      expect(info?.key).toBe('chase');
      expect(info?.name).toBe('Chase Sapphire Statement Parser');
      expect(info?.defaultCurrency).toBe('USD');
    });

    it('should return info for Thai bank parser', () => {
      const info = getParserInfo('kasikorn');

      expect(info).toBeDefined();
      expect(info?.defaultCurrency).toBe('THB');
    });

    it('should return undefined for invalid key', () => {
      const info = getParserInfo('nonexistent');

      expect(info).toBeUndefined();
    });
  });

  describe('getAllParsersInfo', () => {
    it('should return info for all parsers', () => {
      const parsersInfo = getAllParsersInfo();

      expect(parsersInfo.length).toBeGreaterThanOrEqual(4);
      expect(parsersInfo.some(p => p.key === 'chase')).toBe(true);
      expect(parsersInfo.some(p => p.key === 'kasikorn')).toBe(true);
    });
  });

  describe('isValidPDF', () => {
    it('should return true for valid PDF magic number', () => {
      // PDF magic number: %PDF-
      const validPDF = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);

      expect(isValidPDF(validPDF)).toBe(true);
    });

    it('should return false for non-PDF content', () => {
      const notPDF = Buffer.from('This is not a PDF');

      expect(isValidPDF(notPDF)).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const empty = Buffer.alloc(0);

      expect(isValidPDF(empty)).toBe(false);
    });

    it('should return false for too short buffer', () => {
      const short = Buffer.from([0x25, 0x50]);

      expect(isValidPDF(short)).toBe(false);
    });

    it('should handle ArrayBuffer input', () => {
      const arrayBuffer = new ArrayBuffer(7);
      const view = new Uint8Array(arrayBuffer);
      // %PDF-1.
      view[0] = 0x25;
      view[1] = 0x50;
      view[2] = 0x44;
      view[3] = 0x46;
      view[4] = 0x2d;
      view[5] = 0x31;
      view[6] = 0x2e;

      expect(isValidPDF(arrayBuffer)).toBe(true);
    });
  });

  describe('processPDF', () => {
    it('should extract and parse Chase statement', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await processPDF(mockBuffer);

      expect(result.extraction.success).toBe(true);
      expect(result.parserUsed).toBe('chase');
      expect(result.parseResult).toBeDefined();
      expect(result.parseResult?.parserKey).toBe('chase');
      expect(result.error).toBeUndefined();
    });

    it('should extract and parse Kasikorn statement', async () => {
      const mockBuffer = Buffer.from('KASIKORNBANK statement content');
      const result = await processPDF(mockBuffer);

      expect(result.extraction.success).toBe(true);
      expect(result.parserUsed).toBe('kasikorn');
      expect(result.parseResult).toBeDefined();
    });

    it('should use specified parser when provided', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await processPDF(mockBuffer, { parser: 'chase' });

      expect(result.parserUsed).toBe('chase');
    });

    it('should return error for unknown specified parser', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await processPDF(mockBuffer, { parser: 'nonexistent' });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unknown parser');
      expect(result.error).toContain('nonexistent');
    });

    it('should return error when specified parser cannot parse document', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      // Try to parse Chase statement with Kasikorn parser
      const result = await processPDF(mockBuffer, { parser: 'kasikorn' });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('cannot parse this document');
    });

    it('should return error for extraction failure', async () => {
      const mockBuffer = Buffer.from('MOCK_ERROR');
      const result = await processPDF(mockBuffer);

      expect(result.extraction.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when no parser matches', async () => {
      const mockBuffer = Buffer.from('UNKNOWN statement type');
      const result = await processPDF(mockBuffer);

      expect(result.extraction.success).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Could not detect statement type');
    });

    it('should include raw text when requested', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await processPDF(mockBuffer, { includeRawText: true });

      expect(result.parseResult?.rawText).toBeDefined();
    });

    it('should set page count from extraction', async () => {
      const mockBuffer = Buffer.from('CHASE statement content');
      const result = await processPDF(mockBuffer, { maxPages: 5 });

      // The document's real page count, not the requested cap.
      expect(result.parseResult?.pageCount).toBe(3);
    });
  });
});

describe('Integration with parsers', () => {
  it('should have all expected parsers registered', () => {
    const parsers = getAvailableParsers();

    // Expected parsers based on P2-008 through P2-011
    expect(parsers).toContain('chase');
    expect(parsers).toContain('amex');
    expect(parsers).toContain('bangkok-bank');
    expect(parsers).toContain('kasikorn');
  });

  it('should have correct currencies for each parser', () => {
    const parsersInfo = getAllParsersInfo();

    const chase = parsersInfo.find(p => p.key === 'chase');
    expect(chase?.defaultCurrency).toBe('USD');

    const amex = parsersInfo.find(p => p.key === 'amex');
    expect(amex?.defaultCurrency).toBe('USD');

    const bangkok = parsersInfo.find(p => p.key === 'bangkok-bank');
    expect(bangkok?.defaultCurrency).toBe('THB');

    const kasikorn = parsersInfo.find(p => p.key === 'kasikorn');
    expect(kasikorn?.defaultCurrency).toBe('THB');
  });
});
