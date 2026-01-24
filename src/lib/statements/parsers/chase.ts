/**
 * Chase Sapphire Statement Parser
 *
 * Parses Chase Sapphire Reserve and Sapphire Preferred PDF statements.
 * Extracts transactions including foreign purchases with exchange rates.
 *
 * Chase statement format characteristics:
 * - Statement period shown in header (e.g., "Opening/Closing Date: 11/19/24 - 12/18/24")
 * - Transactions listed with date, description, amount
 * - Credits shown as negative amounts or in separate section
 * - Foreign transactions show original currency and exchange rate
 */

import type {
  StatementParser,
  StatementParseResult,
  ParsedStatementTransaction,
  StatementPeriod,
  StatementSummary,
  ParseOptions,
} from './types';

// Chase identifier patterns
const CHASE_IDENTIFIERS = [
  'chase sapphire',
  'j.p. morgan',
  'jpmorgan chase',
  'chase.com',
  'chase card services',
  'sapphire reserve',
  'sapphire preferred',
];

// Date patterns in Chase statements
// MM/DD/YY or MM/DD/YYYY
const DATE_PATTERN = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;

// Statement period pattern
// "Opening/Closing Date 11/19/24 - 12/18/24" or variations
const PERIOD_PATTERNS = [
  /opening\/closing\s+date[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /statement\s+period[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:to|[-–])\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /billing\s+period[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:to|[-–])\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
];

// Payment due date pattern
const DUE_DATE_PATTERN = /payment\s+due\s+date[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i;

// Transaction line pattern
// Captures: date, description, amount
// Example: "12/05  GRAB* BANGKOK TH                        10.00"
// Example: "12/05  12/06  AMAZON.COM                      -25.99"  (with posting date)
const TRANSACTION_PATTERN =
  /^(\d{1,2}\/\d{1,2})\s+(?:(\d{1,2}\/\d{1,2})\s+)?(.+?)\s+([-]?\$?[\d,]+\.\d{2})$/;

// Foreign transaction patterns
// Example: "FOREIGN TRANSACTION FEE on $36.35 purchase"
// Example: "Foreign currency: 1,234.56 THB at exchange rate 0.02912"
const FOREIGN_FEE_PATTERN = /foreign\s+transaction\s+fee\s+on\s+\$?([\d,]+\.\d{2})/i;
const FOREIGN_CURRENCY_PATTERN =
  /foreign\s+(?:currency|amount)[:\s]*([\d,]+\.\d{2})\s*([A-Z]{3})\s*(?:at\s+)?(?:exchange\s+)?rate[:\s]*([\d.]+)/i;

// Amount patterns
const AMOUNT_PATTERN = /[-]?\$?([\d,]+\.\d{2})/;

// Section headers that indicate different parts of the statement
const SECTION_HEADERS = {
  payments: /payments?\s+and\s+(?:other\s+)?credits?/i,
  purchases: /(?:new\s+)?purchases?|transactions?|charges?/i,
  fees: /fees?\s+charged?/i,
  interest: /interest\s+charged?/i,
  totals: /total\s+(?:charges?|activity|balance)/i,
};

// Summary line patterns
const SUMMARY_PATTERNS = {
  previousBalance: /previous\s+balance[:\s]*\$?([\d,]+\.\d{2})/i,
  newBalance: /new\s+balance[:\s]*\$?([\d,]+\.\d{2})/i,
  minimumPayment: /minimum\s+payment(?:\s+due)?[:\s]*\$?([\d,]+\.\d{2})/i,
  creditLimit: /credit\s+(?:line|limit)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  availableCredit: /available\s+credit[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  totalPayments: /total\s+payments?\s+and\s+credits?[:\s]*\$?([\d,]+\.\d{2})/i,
  totalPurchases: /total\s+(?:purchases?|charges?)[:\s]*\$?([\d,]+\.\d{2})/i,
  totalFees: /total\s+fees?[:\s]*\$?([\d,]+\.\d{2})/i,
  totalInterest: /total\s+interest[:\s]*\$?([\d,]+\.\d{2})/i,
};

// Account info patterns
const ACCOUNT_PATTERNS = {
  accountNumber: /account\s+(?:number|ending\s+in)[:\s]*(?:\.\.\.|x+)?(\d{4})/i,
  cardholderName: /^([A-Z][A-Z\s.'-]+)$/m,
};

/**
 * Parse a date string in MM/DD/YY or MM/DD/YYYY format
 */
function parseDate(dateStr: string, referenceYear?: number): Date | null {
  const match = dateStr.match(DATE_PATTERN);
  if (!match) return null;

  const month = parseInt(match[1], 10) - 1; // JS months are 0-indexed
  const day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // Handle 2-digit year
  if (year < 100) {
    // Assume 2000s for years 00-50, 1900s for 51-99
    year = year > 50 ? 1900 + year : 2000 + year;
  }

  // Use reference year if provided and the parsed year seems off
  if (referenceYear && Math.abs(year - referenceYear) > 1) {
    year = referenceYear;
  }

  const date = new Date(year, month, day);

  // Validate the date is real
  if (isNaN(date.getTime())) return null;
  if (date.getMonth() !== month) return null; // Catches invalid dates like 2/30

  return date;
}

/**
 * Parse a short date (MM/DD) using a reference date for the year
 */
function parseShortDate(dateStr: string, referenceDate: Date): Date | null {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;

  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  let year = referenceDate.getFullYear();

  // Handle year boundary - if the date is in a month after the reference,
  // it might be from the previous year
  const refMonth = referenceDate.getMonth();
  if (month > refMonth + 1) {
    year -= 1;
  }

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Parse an amount string, handling commas and optional negative sign
 */
function parseAmount(amountStr: string): number | null {
  const match = amountStr.match(AMOUNT_PATTERN);
  if (!match) return null;

  const cleaned = match[1].replace(/,/g, '');
  const value = parseFloat(cleaned);

  if (isNaN(value)) return null;

  // Handle negative sign at the beginning of the original string
  return amountStr.trim().startsWith('-') ? -value : value;
}

/**
 * Determine transaction type based on description and section
 */
function determineTransactionType(
  description: string,
  amount: number,
  section: string
): ParsedStatementTransaction['type'] {
  const lowerDesc = description.toLowerCase();
  const lowerSection = section.toLowerCase();

  // Payments
  if (lowerDesc.includes('payment') || lowerDesc.includes('autopay') || lowerSection.includes('payment')) {
    return 'payment';
  }

  // Interest
  if (lowerDesc.includes('interest') || lowerSection.includes('interest')) {
    return 'interest';
  }

  // Fees
  if (
    lowerDesc.includes('fee') ||
    lowerDesc.includes('annual membership') ||
    lowerSection.includes('fee')
  ) {
    return 'fee';
  }

  // Adjustments
  if (lowerDesc.includes('adjustment') || lowerDesc.includes('dispute') || lowerDesc.includes('reversal')) {
    return 'adjustment';
  }

  // Credits (negative amounts or in credits section)
  if (amount < 0 || lowerSection.includes('credit') || lowerDesc.includes('refund') || lowerDesc.includes('return')) {
    return 'credit';
  }

  // Default to charge
  return 'charge';
}

/**
 * Extract foreign transaction details from surrounding lines
 */
function extractForeignDetails(
  lines: string[],
  currentIndex: number
): ParsedStatementTransaction['foreignTransaction'] | undefined {
  // Look at the next few lines for foreign currency info
  const searchLines = lines.slice(currentIndex + 1, currentIndex + 4).join(' ');

  const currencyMatch = searchLines.match(FOREIGN_CURRENCY_PATTERN);
  if (currencyMatch) {
    return {
      originalAmount: parseFloat(currencyMatch[1].replace(/,/g, '')),
      originalCurrency: currencyMatch[2],
      exchangeRate: parseFloat(currencyMatch[3]),
    };
  }

  return undefined;
}

/**
 * Detect category from merchant description
 */
function detectCategory(description: string): string | undefined {
  const lowerDesc = description.toLowerCase();

  // Travel
  if (
    lowerDesc.includes('airline') ||
    lowerDesc.includes('hotel') ||
    lowerDesc.includes('airbnb') ||
    lowerDesc.includes('booking.com') ||
    lowerDesc.includes('expedia') ||
    lowerDesc.includes('united') ||
    lowerDesc.includes('delta') ||
    lowerDesc.includes('marriott') ||
    lowerDesc.includes('hilton')
  ) {
    return 'Travel';
  }

  // Dining
  if (
    lowerDesc.includes('restaurant') ||
    lowerDesc.includes('cafe') ||
    lowerDesc.includes('coffee') ||
    lowerDesc.includes('starbucks') ||
    lowerDesc.includes('mcdonald') ||
    lowerDesc.includes('grab*') ||
    lowerDesc.includes('doordash') ||
    lowerDesc.includes('uber eats')
  ) {
    return 'Dining';
  }

  // Transportation
  if (
    lowerDesc.includes('uber') ||
    lowerDesc.includes('lyft') ||
    lowerDesc.includes('taxi') ||
    lowerDesc.includes('bolt') ||
    lowerDesc.includes('grab')
  ) {
    return 'Transportation';
  }

  // Shopping
  if (
    lowerDesc.includes('amazon') ||
    lowerDesc.includes('walmart') ||
    lowerDesc.includes('target') ||
    lowerDesc.includes('costco')
  ) {
    return 'Shopping';
  }

  // Groceries
  if (
    lowerDesc.includes('grocery') ||
    lowerDesc.includes('whole foods') ||
    lowerDesc.includes('trader joe') ||
    lowerDesc.includes('safeway')
  ) {
    return 'Groceries';
  }

  return undefined;
}

/**
 * Parse statement period from text
 */
function parseStatementPeriod(text: string): StatementPeriod | undefined {
  for (const pattern of PERIOD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const startDate = parseDate(match[1]);
      const endDate = parseDate(match[2]);

      if (startDate && endDate) {
        const period: StatementPeriod = { startDate, endDate };

        // Try to find due date
        const dueMatch = text.match(DUE_DATE_PATTERN);
        if (dueMatch) {
          const dueDate = parseDate(dueMatch[1]);
          if (dueDate) {
            period.dueDate = dueDate;
          }
        }

        return period;
      }
    }
  }

  return undefined;
}

/**
 * Parse summary totals from text
 */
function parseSummary(text: string): StatementSummary | undefined {
  const summary: StatementSummary = {};
  let hasData = false;

  for (const [key, pattern] of Object.entries(SUMMARY_PATTERNS)) {
    const match = text.match(pattern);
    if (match) {
      const value = parseAmount(match[1]);
      if (value !== null) {
        summary[key as keyof StatementSummary] = value;
        hasData = true;
      }
    }
  }

  return hasData ? summary : undefined;
}

/**
 * Parse account information
 */
function parseAccountInfo(text: string): StatementParseResult['accountInfo'] | undefined {
  const info: NonNullable<StatementParseResult['accountInfo']> = {};
  let hasData = false;

  const accountMatch = text.match(ACCOUNT_PATTERNS.accountNumber);
  if (accountMatch) {
    info.accountNumber = accountMatch[1];
    hasData = true;
  }

  // Detect card type
  if (text.toLowerCase().includes('sapphire reserve')) {
    info.cardType = 'Chase Sapphire Reserve';
    hasData = true;
  } else if (text.toLowerCase().includes('sapphire preferred')) {
    info.cardType = 'Chase Sapphire Preferred';
    hasData = true;
  }

  return hasData ? info : undefined;
}

/**
 * Parse transactions from statement text
 */
function parseTransactions(
  text: string,
  period: StatementPeriod | undefined
): { transactions: ParsedStatementTransaction[]; warnings: string[] } {
  const transactions: ParsedStatementTransaction[] = [];
  const warnings: string[] = [];

  const lines = text.split('\n').map((line) => line.trim());
  let currentSection = 'purchases';
  const referenceDate = period?.endDate || new Date();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line) continue;

    // Check for section headers
    for (const [section, pattern] of Object.entries(SECTION_HEADERS)) {
      if (pattern.test(line)) {
        currentSection = section;
        break;
      }
    }

    // Try to parse as transaction line
    const match = line.match(TRANSACTION_PATTERN);
    if (match) {
      const [, dateStr, postingDateStr, description, amountStr] = match;

      const transactionDate = parseShortDate(dateStr, referenceDate);
      const amount = parseAmount(amountStr);

      if (transactionDate && amount !== null) {
        const transaction: ParsedStatementTransaction = {
          transactionDate,
          description: description.trim(),
          amount: Math.abs(amount),
          currency: 'USD',
          type: determineTransactionType(description, amount, currentSection),
          rawLine: line,
        };

        // Handle credits - they should be stored with negative amount
        if (transaction.type === 'credit' || transaction.type === 'payment') {
          transaction.amount = -Math.abs(amount);
        }

        // Parse posting date if present
        if (postingDateStr) {
          const postingDate = parseShortDate(postingDateStr, referenceDate);
          if (postingDate) {
            transaction.postingDate = postingDate;
          }
        }

        // Check for foreign transaction
        const foreignDetails = extractForeignDetails(lines, i);
        if (foreignDetails) {
          transaction.foreignTransaction = foreignDetails;
        }

        // Detect category
        transaction.category = detectCategory(description);

        transactions.push(transaction);
      }
    }

    // Also try a more flexible pattern for Chase's various formats
    const flexMatch = line.match(
      /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/
    );
    if (
      flexMatch &&
      !match &&
      !SECTION_HEADERS.totals.test(line) &&
      !line.toLowerCase().includes('total')
    ) {
      const [, dateStr, description, amountStr] = flexMatch;

      // Skip if description looks like a header or summary
      if (description.length > 5 && !description.match(/^[\d$,.\s-]+$/)) {
        const transactionDate = parseShortDate(dateStr, referenceDate);
        const amount = parseAmount(amountStr);

        if (transactionDate && amount !== null) {
          // Avoid duplicates
          const isDuplicate = transactions.some(
            (t) =>
              t.transactionDate.getTime() === transactionDate.getTime() &&
              t.amount === Math.abs(amount) &&
              t.description === description.trim()
          );

          if (!isDuplicate) {
            const transaction: ParsedStatementTransaction = {
              transactionDate,
              description: description.trim(),
              amount: Math.abs(amount),
              currency: 'USD',
              type: determineTransactionType(description, amount, currentSection),
              rawLine: line,
            };

            if (transaction.type === 'credit' || transaction.type === 'payment') {
              transaction.amount = -Math.abs(amount);
            }

            transaction.category = detectCategory(description);
            transactions.push(transaction);
          }
        }
      }
    }
  }

  // Sort transactions by date
  transactions.sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());

  return { transactions, warnings };
}

/**
 * Calculate parsing confidence based on extracted data
 */
function calculateConfidence(result: StatementParseResult): number {
  let confidence = 0;

  // Base confidence for identifying as Chase
  confidence += 20;

  // Period found
  if (result.period) {
    confidence += 15;
  }

  // Summary found
  if (result.summary) {
    confidence += 10;
  }

  // Transactions found
  if (result.transactions.length > 0) {
    confidence += 30;

    // More confidence if we have many transactions
    if (result.transactions.length >= 10) {
      confidence += 10;
    }

    // Higher confidence if transactions have all fields
    const completeTransactions = result.transactions.filter(
      (t) => t.transactionDate && t.description && t.amount !== undefined
    );
    if (completeTransactions.length === result.transactions.length) {
      confidence += 10;
    }
  }

  // Account info found
  if (result.accountInfo) {
    confidence += 5;
  }

  return Math.min(confidence, 100);
}

/**
 * Chase Sapphire Statement Parser implementation
 */
export const chaseParser: StatementParser = {
  key: 'chase',
  name: 'Chase Sapphire Statement Parser',
  defaultCurrency: 'USD',

  /**
   * Check if this parser can handle the given statement text
   */
  canParse(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Check for Chase identifiers
    return CHASE_IDENTIFIERS.some((id) => lowerText.includes(id));
  },

  /**
   * Parse Chase statement text and extract transactions
   */
  parse(text: string, options?: ParseOptions): StatementParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify this is a Chase statement
    if (!this.canParse(text)) {
      return {
        success: false,
        parserKey: this.key,
        transactions: [],
        errors: ['Text does not appear to be a Chase statement'],
        warnings: [],
        confidence: 0,
      };
    }

    // Extract statement period
    const period = parseStatementPeriod(text);
    if (!period) {
      warnings.push('Could not extract statement period');
    }

    // Extract summary
    const summary = parseSummary(text);

    // Extract account info
    const accountInfo = parseAccountInfo(text);

    // Parse transactions
    const { transactions, warnings: txWarnings } = parseTransactions(text, period);
    warnings.push(...txWarnings);

    if (transactions.length === 0) {
      warnings.push('No transactions extracted from statement');
    }

    // Estimate page count from text length
    // Average page has ~3000 characters after extraction
    const pageCount = Math.max(1, Math.ceil(text.length / 3000));

    const result: StatementParseResult = {
      success: true,
      parserKey: this.key,
      period,
      summary,
      transactions,
      errors,
      warnings,
      confidence: 0,
      pageCount,
      accountInfo,
    };

    // Include raw text if requested
    if (options?.includeRawText) {
      result.rawText = text;
    }

    // Calculate confidence
    result.confidence = calculateConfidence(result);

    return result;
  },
};

// Export helper functions for testing
export {
  parseDate,
  parseShortDate,
  parseAmount,
  parseStatementPeriod,
  parseSummary,
  parseAccountInfo,
  parseTransactions,
  determineTransactionType,
  extractForeignDetails,
  detectCategory,
  calculateConfidence,
  CHASE_IDENTIFIERS,
  DATE_PATTERN,
  PERIOD_PATTERNS,
  TRANSACTION_PATTERN,
};
