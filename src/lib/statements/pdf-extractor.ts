/**
 * PDF Text Extraction Service
 *
 * Extracts text from PDF files and routes to the appropriate statement parser.
 * Uses pdfjs-dist directly (legacy ESM build for Node compatibility).
 *
 * Replaces the prior pdf-parse@1.1.4 wrapper, which bundled an old pdfjs that
 * triggered a Buffer() deprecation warning. Iteration logic mirrors pdf-parse's
 * default Y-coordinate-aware concatenation so the text output stays compatible
 * with the existing statement parsers (Bangkok Bank, Kasikorn, Chase, etc.).
 */

import type { StatementParseResult, StatementParser } from './parsers/types';
import { parserRegistry, detectParser, getParser } from './parsers';

// Polyfill DOMMatrix for Node.js — pdfjs uses it internally even when we only
// extract text. Lightweight no-op-ish polyfill is sufficient for text content.
if (typeof globalThis.DOMMatrix === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;

    constructor(init?: string | number[]) {
      if (Array.isArray(init) && init.length >= 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        this.m11 = this.a;
        this.m12 = this.b;
        this.m21 = this.c;
        this.m22 = this.d;
        this.m41 = this.e;
        this.m42 = this.f;
      }
    }

    inverse() { return new DOMMatrix(); }
    multiply() { return new DOMMatrix(); }
    scale() { return new DOMMatrix(); }
    translate() { return new DOMMatrix(); }
    transformPoint(point: { x: number; y: number }) { return point; }
  };
}

// Lazy-loaded pdfjs handle — kept module-scoped so we only import once.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsModulePromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPdfjs(): Promise<any> {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = (async () => {
      // Pre-load the worker module and expose it on globalThis. pdfjs checks
      // `globalThis.pdfjsWorker?.WorkerMessageHandler` before falling back to a
      // dynamic `import("./pdf.worker.mjs")`. On Vercel that dynamic import
      // fails — the worker file isn't traced into the serverless bundle —
      // surfacing as `Setting up fake worker failed: Cannot find module …`.
      // Importing it statically here pulls it into the bundle and bypasses the
      // dynamic resolution path entirely.
      const workerModule = await import(
        // @ts-expect-error — pdfjs-dist ships no .d.ts for the worker entry.
        'pdfjs-dist/legacy/build/pdf.worker.mjs'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).pdfjsWorker = workerModule;
      return import('pdfjs-dist/legacy/build/pdf.mjs');
    })();
  }
  return pdfjsModulePromise;
}

/**
 * Result of PDF extraction
 */
export interface PDFExtractionResult {
  /** Whether extraction was successful */
  success: boolean;

  /** Extracted text content */
  text: string;

  /** Number of pages in the PDF */
  pageCount: number;

  /** PDF metadata */
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modDate?: string;
  };

  /** Errors encountered during extraction */
  errors: string[];
}

/**
 * Result of PDF processing (extraction + parsing)
 */
export interface PDFProcessingResult {
  /** Extraction result */
  extraction: PDFExtractionResult;

  /** Parse result (if a parser was found and text was extracted) */
  parseResult?: StatementParseResult;

  /** The parser that was used (if any) */
  parserUsed?: string;

  /** Error if processing failed */
  error?: string;
}

/**
 * Options for PDF extraction
 */
export interface PDFExtractionOptions {
  /** Maximum number of pages to extract (default: all) */
  maxPages?: number;

  /** Specific parser to use (skip auto-detection) */
  parser?: string;

  /** Include raw text in parse result for debugging */
  includeRawText?: boolean;
}

/**
 * Extract text from a PDF buffer
 *
 * @param pdfBuffer - PDF file content as Buffer or ArrayBuffer
 * @param options - Extraction options
 * @returns Extraction result with text and metadata
 */
export async function extractPDFText(
  pdfBuffer: Buffer | ArrayBuffer,
  options: PDFExtractionOptions = {}
): Promise<PDFExtractionResult> {
  const errors: string[] = [];

  try {
    // pdfjs expects a Uint8Array. We give it a fresh copy because pdfjs may
    // detach/transfer the underlying buffer.
    const source = Buffer.isBuffer(pdfBuffer)
      ? new Uint8Array(pdfBuffer)
      : new Uint8Array(pdfBuffer);
    // Make a copy so pdfjs doesn't detach a shared backing store.
    const data = new Uint8Array(source);

    const pdfjs = await getPdfjs();

    const loadingTask = pdfjs.getDocument({
      data,
      // Disable on-disk fonts/cmaps lookup — we only care about text content.
      disableFontFace: true,
      // Quiet pdfjs's own console warnings during parsing.
      verbosity: 0,
    });
    const doc = await loadingTask.promise;

    const totalPages: number = doc.numPages;
    const counter = options.maxPages && options.maxPages > 0
      ? Math.min(options.maxPages, totalPages)
      : totalPages;

    // Mirror pdf-parse's behavior: concat each page's text with `\n\n`
    // separator and a leading blank, so the first character is `\n\n` followed
    // by page 1 — keeps the output identical to the previous implementation.
    let text = '';
    for (let i = 1; i <= counter; i++) {
      try {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        let lastY: number | null = null;
        let pageText = '';
        for (const item of textContent.items) {
          // Marked content / structural items don't have `str` — skip them.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const it = item as any;
          if (typeof it.str !== 'string') continue;
          const y: number | undefined = Array.isArray(it.transform) ? it.transform[5] : undefined;
          if (lastY !== null && y !== lastY) {
            pageText += '\n';
          }
          pageText += it.str;
          lastY = typeof y === 'number' ? y : null;
        }
        // Release the page promptly to free pdfjs internal caches.
        page.cleanup();
        text = `${text}\n\n${pageText}`;
      } catch {
        // Match pdf-parse: swallow per-page errors and continue.
      }
    }

    // Pull document metadata (title, author, etc.)
    const metadata: PDFExtractionResult['metadata'] = {};
    try {
      const meta = await doc.getMetadata();
      const info = meta?.info as Record<string, unknown> | undefined;
      if (info) {
        if (typeof info.Title === 'string') metadata.title = info.Title;
        if (typeof info.Author === 'string') metadata.author = info.Author;
        if (typeof info.Subject === 'string') metadata.subject = info.Subject;
        if (typeof info.Creator === 'string') metadata.creator = info.Creator;
        if (typeof info.Producer === 'string') metadata.producer = info.Producer;
        if (typeof info.CreationDate === 'string') metadata.creationDate = info.CreationDate;
        if (typeof info.ModDate === 'string') metadata.modDate = info.ModDate;
      }
    } catch {
      // Metadata is best-effort; continue without it.
    }

    await doc.destroy();

    return {
      success: true,
      text,
      pageCount: totalPages,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      errors,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during PDF extraction';
    errors.push(errorMessage);

    return {
      success: false,
      text: '',
      pageCount: 0,
      errors,
    };
  }
}

/**
 * Detect which parser should handle the given PDF text
 *
 * @param text - Extracted text from PDF
 * @returns Parser key and parser instance, or undefined if no match
 */
export function detectStatementParser(
  text: string
): { key: string; parser: StatementParser } | undefined {
  return detectParser(text);
}

/**
 * Get all available parser keys
 *
 * @returns Array of parser keys
 */
export function getAvailableParsers(): string[] {
  return Array.from(parserRegistry.keys());
}

/**
 * Process a PDF file: extract text and parse with appropriate parser
 *
 * @param pdfBuffer - PDF file content as Buffer or ArrayBuffer
 * @param options - Processing options
 * @returns Processing result with extraction and parse results
 */
export async function processPDF(
  pdfBuffer: Buffer | ArrayBuffer,
  options: PDFExtractionOptions = {}
): Promise<PDFProcessingResult> {
  // Step 1: Extract text from PDF
  const extraction = await extractPDFText(pdfBuffer, options);

  if (!extraction.success || !extraction.text) {
    return {
      extraction,
      error: extraction.errors.length > 0
        ? extraction.errors.join('; ')
        : 'Failed to extract text from PDF',
    };
  }

  // Step 2: Find appropriate parser
  let parser: StatementParser | undefined;
  let parserKey: string | undefined;

  if (options.parser) {
    // Use specified parser
    parser = getParser(options.parser);
    parserKey = options.parser;

    if (!parser) {
      return {
        extraction,
        error: `Unknown parser: ${options.parser}. Available parsers: ${getAvailableParsers().join(', ')}`,
      };
    }

    // Verify parser can handle this text
    if (!parser.canParse(extraction.text)) {
      return {
        extraction,
        error: `Parser '${options.parser}' cannot parse this document. The statement doesn't appear to be from ${parser.name}.`,
      };
    }
  } else {
    // Auto-detect parser
    const detected = detectStatementParser(extraction.text);

    if (!detected) {
      // No parser found - provide helpful suggestions
      const availableParsers = getAvailableParsers();
      return {
        extraction,
        error: `Could not detect statement type. The document doesn't appear to match any supported statement format. ` +
          `Supported formats: ${availableParsers.join(', ')}. ` +
          `Please verify this is a valid credit card or bank statement.`,
      };
    }

    parser = detected.parser;
    parserKey = detected.key;
  }

  // Step 3: Parse the statement
  const parseResult = parser.parse(extraction.text, {
    includeRawText: options.includeRawText,
  });

  // Always use page count from actual PDF extraction (more accurate than parser estimate)
  if (extraction.pageCount) {
    parseResult.pageCount = extraction.pageCount;
  }

  return {
    extraction,
    parseResult,
    parserUsed: parserKey,
  };
}

/**
 * Validate that a buffer appears to be a valid PDF
 *
 * @param buffer - File buffer to check
 * @returns True if the buffer appears to be a PDF
 */
export function isValidPDF(buffer: Buffer | ArrayBuffer): boolean {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // Check for PDF magic number: %PDF-
  if (bytes.length < 5) return false;

  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d    // -
  );
}

/**
 * Get parser information
 *
 * @param parserKey - Parser key to get info for
 * @returns Parser info or undefined
 */
export function getParserInfo(
  parserKey: string
): { key: string; name: string; defaultCurrency: string } | undefined {
  const parser = getParser(parserKey);
  if (!parser) return undefined;

  return {
    key: parser.key,
    name: parser.name,
    defaultCurrency: parser.defaultCurrency,
  };
}

/**
 * Get all parser info
 *
 * @returns Array of parser info
 */
export function getAllParsersInfo(): Array<{
  key: string;
  name: string;
  defaultCurrency: string;
}> {
  const parsers = Array.from(parserRegistry.entries());
  return parsers.map(([key, parser]) => ({
    key,
    name: parser.name,
    defaultCurrency: parser.defaultCurrency,
  }));
}
