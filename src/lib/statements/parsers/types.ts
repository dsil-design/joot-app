/**
 * Statement Parser Types
 *
 * Shared types for credit card and bank statement parsers.
 * These parsers extract transaction data from PDF statement text.
 */

/**
 * Parsed transaction from a statement
 */
export interface ParsedStatementTransaction {
  /** Transaction date (when the purchase was made) */
  transactionDate: Date;

  /** Posting date (when it appeared on the statement) */
  postingDate?: Date;

  /** Merchant/vendor description from statement */
  description: string;

  /** Transaction amount (positive for charges, negative for credits) */
  amount: number;

  /** Currency code (e.g., 'USD', 'THB') */
  currency: string;

  /** Transaction type */
  type: 'charge' | 'credit' | 'payment' | 'fee' | 'interest' | 'adjustment';

  /** Reference number if available */
  referenceNumber?: string;

  /** Category if detected from statement */
  category?: string;

  /** Foreign transaction details if applicable */
  foreignTransaction?: {
    originalAmount: number;
    originalCurrency: string;
    exchangeRate?: number;
  };

  /** Raw line from statement for debugging */
  rawLine?: string;
}

/**
 * Statement period information
 */
export interface StatementPeriod {
  /** Start date of statement period */
  startDate: Date;

  /** End date of statement period */
  endDate: Date;

  /** Closing date (when statement was generated) */
  closingDate?: Date;

  /** Payment due date */
  dueDate?: Date;
}

/**
 * Statement summary totals
 */
export interface StatementSummary {
  /** Previous balance */
  previousBalance?: number;

  /** Total payments and credits */
  paymentsAndCredits?: number;

  /** Total purchases and charges */
  purchasesAndCharges?: number;

  /** Fees charged */
  fees?: number;

  /** Interest charged */
  interest?: number;

  /** New balance */
  newBalance?: number;

  /** Minimum payment due */
  minimumPayment?: number;

  /** Credit limit */
  creditLimit?: number;

  /** Available credit */
  availableCredit?: number;
}

/**
 * Result of parsing a statement
 */
export interface StatementParseResult {
  /** Whether parsing was successful */
  success: boolean;

  /** Parser that processed this statement */
  parserKey: string;

  /** Statement period */
  period?: StatementPeriod;

  /** Summary totals */
  summary?: StatementSummary;

  /** Extracted transactions */
  transactions: ParsedStatementTransaction[];

  /** Parsing errors encountered */
  errors: string[];

  /** Warnings (non-fatal issues) */
  warnings: string[];

  /** Raw text used for parsing (for debugging) */
  rawText?: string;

  /** Confidence in the parse result (0-100) */
  confidence: number;

  /** Number of pages processed */
  pageCount?: number;

  /** Account information */
  accountInfo?: {
    accountNumber?: string;
    cardholderName?: string;
    cardType?: string;
  };
}

/**
 * Statement parser interface - all statement parsers must implement this
 */
export interface StatementParser {
  /** Unique parser identifier */
  readonly key: string;

  /** Human-readable parser name */
  readonly name: string;

  /** Currency this parser typically handles */
  readonly defaultCurrency: string;

  /**
   * Check if this parser can handle the given text
   * @param text - Extracted text from PDF
   * @returns true if this parser should handle this statement
   */
  canParse(text: string): boolean;

  /**
   * Parse statement text and extract transactions
   * @param text - Extracted text from PDF
   * @param options - Optional parsing options
   * @returns Parse result with transactions
   */
  parse(text: string, options?: ParseOptions): StatementParseResult;
}

/**
 * Options for parsing
 */
export interface ParseOptions {
  /** Include raw text in result for debugging */
  includeRawText?: boolean;

  /** Override default currency */
  currency?: string;

  /** Strict mode - fail on any parsing errors */
  strict?: boolean;
}

/**
 * Registry of available parsers
 */
export type ParserRegistry = Map<string, StatementParser>;
