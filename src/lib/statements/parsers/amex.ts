/**
 * American Express Statement Parser
 *
 * Parses American Express PDF statements (Platinum, Gold, Green, etc.).
 * Extracts transactions including foreign purchases with exchange rates.
 *
 * Amex statement format characteristics:
 * - Statement period shown in header (e.g., "Statement Period: Dec 1, 2024 - Dec 31, 2024")
 * - Also uses "Closing Date" format (e.g., "Closing Date 12/31/24")
 * - Transactions listed with date, description, amount
 * - Credits/returns shown as negative amounts or with "CR" suffix
 * - Foreign transactions show original currency and conversion
 * - Often includes membership rewards points info
 */

import type {
  StatementParser,
  StatementParseResult,
  ParsedStatementTransaction,
  StatementPeriod,
  StatementSummary,
  ParseOptions,
} from './types';

// Amex identifier patterns
const AMEX_IDENTIFIERS = [
  'american express',
  'amex',
  'americanexpress.com',
  'member since',
  'membership rewards',
  'platinum card',
  'gold card',
  'green card',
  'blue cash',
  'delta skymiles',
  'hilton honors',
  'marriott bonvoy',
];

// Date patterns in Amex statements
// MM/DD/YY, MM/DD/YYYY, or "Dec 15, 2024" format
const DATE_PATTERN_NUMERIC = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
const DATE_PATTERN_NAMED = /([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/i;

// Month name to number mapping
const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// Statement period patterns
const PERIOD_PATTERNS = [
  // "Statement Period: Dec 1, 2024 - Dec 31, 2024"
  /statement\s+period[:\s]*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})\s*[-–to]+\s*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})/i,
  // "Statement Period: 12/01/24 - 12/31/24"
  /statement\s+period[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–to]+\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  // "Closing Date 12/31/24" (derive period from this)
  /closing\s+date[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  // "Billing Period: Dec 1 - Dec 31, 2024"
  /billing\s+period[:\s]*([A-Z][a-z]{2,8}\s+\d{1,2})\s*[-–]\s*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})/i,
];

// Payment due date pattern
const DUE_DATE_PATTERNS = [
  /payment\s+due\s+date[:\s]*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})/i,
  /payment\s+due\s+date[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /please\s+pay\s+by[:\s]*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})/i,
  /due[:\s]*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})/i,
];

// Transaction line patterns - Amex has several formats
// Format 1: "12/05  MERCHANT NAME                           $25.00"
// Format 2: "Dec 5  MERCHANT NAME                          $25.00 CR"
// Format 3: "12/05/24  MERCHANT NAME                       25.00"
const TRANSACTION_PATTERNS = [
  // MM/DD with amount at end (with optional $ and CR)
  /^(\d{1,2}\/\d{1,2})(?:\/\d{2,4})?\s+(.+?)\s+\$?([\d,]+\.\d{2})(\s*CR)?$/i,
  // Named month date format
  /^([A-Z][a-z]{2})\s+(\d{1,2})\s+(.+?)\s+\$?([\d,]+\.\d{2})(\s*CR)?$/i,
];

// Foreign transaction patterns
// "FOREIGN TRANSACTION FEE $2.50"
// "CURRENCY CONVERSION: 340.00 THB = 10.00 USD at 0.02941"
const FOREIGN_FEE_PATTERN = /foreign\s+(?:transaction|exchange)\s+fee[:\s]*\$?([\d,]+\.\d{2})/i;
const FOREIGN_CURRENCY_PATTERN =
  /(?:currency\s+conversion|foreign\s+(?:currency|amount))[:\s]*([\d,]+\.?\d*)\s*([A-Z]{3})\s*(?:=|at|@)\s*(?:\$?([\d,]+\.\d{2})\s*(?:USD|usd)?\s*(?:at|@)?\s*)?([\d.]+)?/i;
const FOREIGN_TRANSACTION_MARKER =
  /(?:original\s+amount|foreign\s+spend|international)[:\s]*([\d,]+\.?\d*)\s*([A-Z]{3})/i;

// Amount patterns
const AMOUNT_PATTERN = /\$?([\d,]+\.\d{2})/;

// Section headers in Amex statements
const SECTION_HEADERS = {
  payments: /(?:payments?\s+(?:and\s+)?(?:other\s+)?credits?|credits?\s+and\s+payments?)/i,
  purchases: /(?:new\s+)?(?:charges?|purchases?|transactions?|activity)/i,
  fees: /(?:fees?\s+(?:and\s+)?charges?|annual\s+fee)/i,
  interest: /(?:interest\s+(?:charged?|expense)|finance\s+charges?)/i,
  totals: /(?:total\s+(?:new\s+)?(?:charges?|balance|activity)|account\s+summary)/i,
  rewards: /(?:membership\s+rewards?|points?\s+(?:summary|earned))/i,
};

// Summary line patterns
const SUMMARY_PATTERNS = {
  previousBalance: /(?:previous|opening)\s+balance[:\s]*\$?([\d,]+\.\d{2})/i,
  newBalance: /(?:new|closing|total)\s+balance[:\s]*\$?([\d,]+\.\d{2})/i,
  minimumPayment: /minimum\s+(?:payment|amount)\s+due[:\s]*\$?([\d,]+\.\d{2})/i,
  totalCredits: /total\s+(?:payments?\s+and\s+)?credits?[:\s]*\$?([\d,]+\.\d{2})/i,
  totalCharges: /total\s+(?:new\s+)?charges?[:\s]*\$?([\d,]+\.\d{2})/i,
  totalFees: /(?:total\s+)?fees?\s+charged?[:\s]*\$?([\d,]+\.\d{2})/i,
  totalInterest: /(?:total\s+)?interest\s+charged?[:\s]*\$?([\d,]+\.\d{2})/i,
};

// Account info patterns
const ACCOUNT_PATTERNS = {
  accountNumber: /(?:account\s+(?:number|ending\s+in)|card\s+ending)[:\s]*(?:\.\.\.|x+|-)?(\d{4,5})/i,
  memberSince: /member\s+since[:\s]*(\d{4})/i,
};

/**
 * Parse a date string in various Amex formats
 */
function parseDate(dateStr: string, referenceYear?: number): Date | null {
  // Try numeric format first: MM/DD/YY or MM/DD/YYYY
  const numericMatch = dateStr.match(DATE_PATTERN_NUMERIC);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10) - 1;
    const day = parseInt(numericMatch[2], 10);
    let year = parseInt(numericMatch[3], 10);

    // Handle 2-digit year
    if (year < 100) {
      year = year > 50 ? 1900 + year : 2000 + year;
    }

    // Use reference year if provided and makes sense
    if (referenceYear && Math.abs(year - referenceYear) > 1) {
      year = referenceYear;
    }

    const date = new Date(year, month, day);
    if (isNaN(date.getTime()) || date.getMonth() !== month) return null;
    return date;
  }

  // Try named month format: "Dec 15, 2024"
  const namedMatch = dateStr.match(DATE_PATTERN_NAMED);
  if (namedMatch) {
    const monthName = namedMatch[1].toLowerCase();
    const month = MONTH_NAMES[monthName];
    if (month === undefined) return null;

    const day = parseInt(namedMatch[2], 10);
    const year = parseInt(namedMatch[3], 10);

    const date = new Date(year, month, day);
    if (isNaN(date.getTime()) || date.getMonth() !== month) return null;
    return date;
  }

  return null;
}

/**
 * Parse a short date (MM/DD or "Dec 5") using a reference date for the year
 */
function parseShortDate(dateStr: string, referenceDate: Date): Date | null {
  // Try numeric format: MM/DD
  const numericMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10) - 1;
    const day = parseInt(numericMatch[2], 10);
    let year = referenceDate.getFullYear();

    // Handle year boundary
    const refMonth = referenceDate.getMonth();
    if (month > refMonth + 1) {
      year -= 1;
    }

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  // Try named month format: "Dec 5"
  const namedMatch = dateStr.match(/([A-Z][a-z]{2})\s+(\d{1,2})/i);
  if (namedMatch) {
    const monthName = namedMatch[1].toLowerCase();
    const month = MONTH_NAMES[monthName];
    if (month === undefined) return null;

    const day = parseInt(namedMatch[2], 10);
    let year = referenceDate.getFullYear();

    // Handle year boundary
    const refMonth = referenceDate.getMonth();
    if (month > refMonth + 1) {
      year -= 1;
    }

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  return null;
}

/**
 * Parse an amount string, handling commas and optional CR suffix
 */
function parseAmount(amountStr: string, hasCR: boolean = false): number | null {
  const match = amountStr.match(AMOUNT_PATTERN);
  if (!match) return null;

  const cleaned = match[1].replace(/,/g, '');
  const value = parseFloat(cleaned);

  if (isNaN(value)) return null;

  // CR suffix means credit (negative)
  return hasCR ? -value : value;
}

/**
 * Determine transaction type based on description and section
 */
function determineTransactionType(
  description: string,
  amount: number,
  section: string,
  isCR: boolean
): ParsedStatementTransaction['type'] {
  const lowerDesc = description.toLowerCase();
  const lowerSection = section.toLowerCase();

  // Payments
  if (
    lowerDesc.includes('payment') ||
    lowerDesc.includes('autopay') ||
    lowerDesc.includes('thank you') ||
    lowerSection.includes('payment')
  ) {
    return 'payment';
  }

  // Interest
  if (
    lowerDesc.includes('interest') ||
    lowerDesc.includes('finance charge') ||
    lowerSection.includes('interest')
  ) {
    return 'interest';
  }

  // Fees
  if (
    lowerDesc.includes('fee') ||
    lowerDesc.includes('annual membership') ||
    lowerDesc.includes('card member') ||
    lowerSection.includes('fee')
  ) {
    return 'fee';
  }

  // Adjustments
  if (
    lowerDesc.includes('adjustment') ||
    lowerDesc.includes('dispute') ||
    lowerDesc.includes('reversal') ||
    lowerDesc.includes('correction')
  ) {
    return 'adjustment';
  }

  // Credits (CR suffix, negative amounts, or in credits section)
  if (
    isCR ||
    amount < 0 ||
    lowerSection.includes('credit') ||
    lowerDesc.includes('refund') ||
    lowerDesc.includes('return') ||
    lowerDesc.includes('credit')
  ) {
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

  // Try the main foreign currency pattern
  const currencyMatch = searchLines.match(FOREIGN_CURRENCY_PATTERN);
  if (currencyMatch) {
    return {
      originalAmount: parseFloat(currencyMatch[1].replace(/,/g, '')),
      originalCurrency: currencyMatch[2],
      exchangeRate: currencyMatch[4] ? parseFloat(currencyMatch[4]) : undefined,
    };
  }

  // Try the foreign transaction marker
  const markerMatch = searchLines.match(FOREIGN_TRANSACTION_MARKER);
  if (markerMatch) {
    return {
      originalAmount: parseFloat(markerMatch[1].replace(/,/g, '')),
      originalCurrency: markerMatch[2],
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
    lowerDesc.includes('hilton') ||
    lowerDesc.includes('hyatt') ||
    lowerDesc.includes('jetblue') ||
    lowerDesc.includes('southwest') ||
    lowerDesc.includes('amtrak')
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
    lowerDesc.includes('uber eats') ||
    lowerDesc.includes('grubhub') ||
    lowerDesc.includes('seamless')
  ) {
    return 'Dining';
  }

  // Transportation
  if (
    lowerDesc.includes('uber') ||
    lowerDesc.includes('lyft') ||
    lowerDesc.includes('taxi') ||
    lowerDesc.includes('bolt') ||
    lowerDesc.includes('grab') ||
    lowerDesc.includes('parking')
  ) {
    return 'Transportation';
  }

  // Shopping
  if (
    lowerDesc.includes('amazon') ||
    lowerDesc.includes('walmart') ||
    lowerDesc.includes('target') ||
    lowerDesc.includes('costco') ||
    lowerDesc.includes('best buy') ||
    lowerDesc.includes('apple.com') ||
    lowerDesc.includes('apple store')
  ) {
    return 'Shopping';
  }

  // Groceries
  if (
    lowerDesc.includes('grocery') ||
    lowerDesc.includes('whole foods') ||
    lowerDesc.includes('trader joe') ||
    lowerDesc.includes('safeway') ||
    lowerDesc.includes('kroger') ||
    lowerDesc.includes('publix')
  ) {
    return 'Groceries';
  }

  // Entertainment
  if (
    lowerDesc.includes('netflix') ||
    lowerDesc.includes('spotify') ||
    lowerDesc.includes('hulu') ||
    lowerDesc.includes('disney') ||
    lowerDesc.includes('hbo') ||
    lowerDesc.includes('theater') ||
    lowerDesc.includes('cinema')
  ) {
    return 'Entertainment';
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
      // Handle closing date only pattern - derive period (usually ~30 days)
      if (pattern.source.includes('closing')) {
        const endDate = parseDate(match[1]);
        if (endDate) {
          const startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 30);

          const period: StatementPeriod = {
            startDate,
            endDate,
            closingDate: endDate,
          };

          // Try to find due date
          for (const duePattern of DUE_DATE_PATTERNS) {
            const dueMatch = text.match(duePattern);
            if (dueMatch) {
              const dueDate = parseDate(dueMatch[1]);
              if (dueDate) {
                period.dueDate = dueDate;
                break;
              }
            }
          }

          return period;
        }
        continue;
      }

      // Handle full period pattern with start and end dates
      const startDate = parseDate(match[1]);
      const endDate = parseDate(match[2]);

      if (startDate && endDate) {
        const period: StatementPeriod = { startDate, endDate };

        // Try to find due date
        for (const duePattern of DUE_DATE_PATTERNS) {
          const dueMatch = text.match(duePattern);
          if (dueMatch) {
            const dueDate = parseDate(dueMatch[1]);
            if (dueDate) {
              period.dueDate = dueDate;
              break;
            }
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
        (summary as Record<string, number>)[key] = value;
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
  const lowerText = text.toLowerCase();
  if (lowerText.includes('platinum card') || lowerText.includes('platinum member')) {
    info.cardType = 'American Express Platinum';
    hasData = true;
  } else if (lowerText.includes('gold card')) {
    info.cardType = 'American Express Gold';
    hasData = true;
  } else if (lowerText.includes('green card')) {
    info.cardType = 'American Express Green';
    hasData = true;
  } else if (lowerText.includes('blue cash')) {
    info.cardType = 'American Express Blue Cash';
    hasData = true;
  } else if (lowerText.includes('delta skymiles')) {
    info.cardType = 'American Express Delta SkyMiles';
    hasData = true;
  } else if (lowerText.includes('hilton honors')) {
    info.cardType = 'American Express Hilton Honors';
    hasData = true;
  } else if (lowerText.includes('marriott bonvoy')) {
    info.cardType = 'American Express Marriott Bonvoy';
    hasData = true;
  }

  return hasData ? info : undefined;
}

/**
 * Parse multi-line transactions (format used in some Amex statements)
 * Format:
 *   09/27/25
 *   SHEETZLINDENPA
 *   800-487-5444
 *   $15.46
 *
 * Or for foreign transactions:
 *   09/22/25
 *   GRAB* A-CC8D4D04SINGAPORE SG
 *   1.28 SINGAPORE DOLLAR @
 *   0.7742291
 *   $0.99
 */
function parseMultiLineTransactions(
  lines: string[],
  referenceDate: Date,
  currentSection: string
): { transactions: ParsedStatementTransaction[]; endIndex: number } {
  const transactions: ParsedStatementTransaction[] = [];

  // Date patterns for multi-line format (MM/DD/YY at the start of line)
  const dateLinePattern = /^(\d{1,2}\/\d{1,2}\/\d{2})$/;
  // Amount pattern (standalone $XX.XX on a line, possibly with CR)
  const amountLinePattern = /^\$?([\d,]+\.\d{2})(\s*CR)?$/i;
  // Foreign currency pattern (e.g., "1.28 SINGAPORE DOLLAR @")
  const foreignCurrencyLinePattern = /^([\d,.]+)\s+([A-Z][A-Z\s]+?)\s*@?\s*$/i;
  // Exchange rate line (just a decimal number)
  const exchangeRatePattern = /^(0\.\d+|\d+\.\d+)$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check if this line starts a new transaction (date line)
    const dateMatch = line.match(dateLinePattern);
    if (!dateMatch) {
      i++;
      continue;
    }

    // Found a date - collect the transaction parts
    const dateStr = dateMatch[1];
    const transactionDate = parseShortDate(dateStr, referenceDate);

    if (!transactionDate) {
      i++;
      continue;
    }

    // Collect description lines until we hit an amount
    const descriptionParts: string[] = [];
    let amount: number | null = null;
    let hasCR = false;
    let foreignAmount: number | undefined;
    let foreignCurrency: string | undefined;
    let exchangeRate: number | undefined;
    const rawLines: string[] = [line];

    i++; // Move past date line

    while (i < lines.length) {
      const nextLine = lines[i];

      // Check for section headers that would end transaction parsing
      let isHeader = false;
      for (const pattern of Object.values(SECTION_HEADERS)) {
        if (pattern.test(nextLine)) {
          isHeader = true;
          break;
        }
      }
      if (isHeader) break;

      // Check if it's the amount line
      const amountMatch = nextLine.match(amountLinePattern);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        hasCR = !!amountMatch[2];
        rawLines.push(nextLine);
        i++;
        break; // Transaction complete
      }

      // Check if it's a foreign currency line
      const foreignMatch = nextLine.match(foreignCurrencyLinePattern);
      if (foreignMatch) {
        foreignAmount = parseFloat(foreignMatch[1].replace(/,/g, ''));
        foreignCurrency = foreignMatch[2].trim();
        rawLines.push(nextLine);
        i++;
        continue;
      }

      // Check if it's an exchange rate line
      const rateMatch = nextLine.match(exchangeRatePattern);
      if (rateMatch) {
        exchangeRate = parseFloat(rateMatch[1]);
        rawLines.push(nextLine);
        i++;
        continue;
      }

      // Check if it's a new date (next transaction) - don't include it
      if (dateLinePattern.test(nextLine)) {
        break;
      }

      // Skip empty lines but don't add to description
      if (!nextLine) {
        i++;
        continue;
      }

      // Otherwise it's part of the description
      descriptionParts.push(nextLine);
      rawLines.push(nextLine);
      i++;
    }

    // Create transaction if we have required fields
    if (transactionDate && amount !== null && descriptionParts.length > 0) {
      const description = descriptionParts.join(' ').trim();
      const type = determineTransactionType(description, amount, currentSection, hasCR);

      const transaction: ParsedStatementTransaction = {
        transactionDate,
        description,
        amount: type === 'credit' || type === 'payment' ? -Math.abs(amount) : Math.abs(amount),
        currency: 'USD',
        type,
        rawLine: rawLines.join('\n'),
      };

      // Add foreign transaction details if found
      if (foreignAmount && foreignCurrency) {
        transaction.foreignTransaction = {
          originalAmount: foreignAmount,
          originalCurrency: foreignCurrency,
          exchangeRate,
        };
      }

      // Detect category
      transaction.category = detectCategory(description);

      transactions.push(transaction);
    }
  }

  return { transactions, endIndex: i };
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

  // First, try multi-line parsing for statements that use that format
  // Detect if this is a multi-line format statement by looking for standalone date lines
  const standaloneDataLines = lines.filter(l => /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(l));
  const hasMultiLineFormat = standaloneDataLines.length >= 3;

  if (hasMultiLineFormat) {
    // Use multi-line parser for the entire document
    const { transactions: multiLineTransactions } = parseMultiLineTransactions(
      lines,
      referenceDate,
      currentSection
    );

    if (multiLineTransactions.length > 0) {
      // Multi-line parsing worked, use those results
      transactions.push(...multiLineTransactions);
      transactions.sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());
      return { transactions, warnings };
    }
  }

  // Fall back to single-line parsing for traditional format statements
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

    // Skip rewards/points sections
    if (currentSection === 'rewards') continue;

    // Try each transaction pattern
    let matched = false;

    for (const pattern of TRANSACTION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        let transactionDate: Date | null = null;
        let description: string;
        let amountStr: string;
        let hasCR = false;

        if (pattern.source.includes('[A-Z][a-z]{2}')) {
          // Named month format: "Dec 5 MERCHANT 25.00 CR"
          const monthStr = match[1] + ' ' + match[2];
          transactionDate = parseShortDate(monthStr, referenceDate);
          description = match[3];
          amountStr = match[4];
          hasCR = !!match[5];
        } else {
          // Numeric format: "12/05 MERCHANT 25.00 CR"
          transactionDate = parseShortDate(match[1], referenceDate);
          description = match[2];
          amountStr = match[3];
          hasCR = !!match[4];
        }

        const amount = parseAmount(amountStr, hasCR);

        if (transactionDate && amount !== null) {
          const type = determineTransactionType(description, amount, currentSection, hasCR);

          const transaction: ParsedStatementTransaction = {
            transactionDate,
            description: description.trim(),
            amount: type === 'credit' || type === 'payment' ? -Math.abs(amount) : Math.abs(amount),
            currency: 'USD',
            type,
            rawLine: line,
          };

          // Check for foreign transaction
          const foreignDetails = extractForeignDetails(lines, i);
          if (foreignDetails) {
            transaction.foreignTransaction = foreignDetails;
          }

          // Detect category
          transaction.category = detectCategory(description);

          transactions.push(transaction);
          matched = true;
          break;
        }
      }
    }

    // Also try a more flexible pattern for Amex's various formats
    if (
      !matched &&
      !SECTION_HEADERS.totals.test(line) &&
      !line.toLowerCase().includes('total')
    ) {
      // Flexible pattern: look for date at start, amount at end
      const flexMatch = line.match(
        /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|[A-Z][a-z]{2}\s+\d{1,2})\s+(.+?)\s+\$?([\d,]+\.\d{2})(\s*CR)?$/i
      );

      if (flexMatch) {
        const dateStr = flexMatch[1];
        const description = flexMatch[2];
        const amountStr = flexMatch[3];
        const hasCR = !!flexMatch[4];

        // Skip if description looks like a header or summary
        if (description.length > 3 && !description.match(/^[\d$,.\s-]+$/)) {
          const transactionDate = parseShortDate(dateStr, referenceDate);
          const amount = parseAmount(amountStr, hasCR);

          if (transactionDate && amount !== null) {
            // Avoid duplicates
            const isDuplicate = transactions.some(
              (t) =>
                t.transactionDate.getTime() === transactionDate.getTime() &&
                Math.abs(t.amount) === Math.abs(amount) &&
                t.description === description.trim()
            );

            if (!isDuplicate) {
              const type = determineTransactionType(description, amount, currentSection, hasCR);

              const transaction: ParsedStatementTransaction = {
                transactionDate,
                description: description.trim(),
                amount: type === 'credit' || type === 'payment' ? -Math.abs(amount) : Math.abs(amount),
                currency: 'USD',
                type,
                rawLine: line,
              };

              transaction.category = detectCategory(description);
              transactions.push(transaction);
            }
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

  // Base confidence for identifying as Amex
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
 * American Express Statement Parser implementation
 */
export const amexParser: StatementParser = {
  key: 'amex',
  name: 'American Express Statement Parser',
  defaultCurrency: 'USD',

  /**
   * Check if this parser can handle the given statement text
   */
  canParse(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Count how many Amex identifiers are present
    // Require at least 2 matches to avoid false positives from transaction descriptions
    // (e.g., "Amex Epayment" in a PNC statement shouldn't trigger Amex parser)
    let matches = 0;
    for (const id of AMEX_IDENTIFIERS) {
      if (lowerText.includes(id)) {
        matches++;
        if (matches >= 2) return true;
      }
    }

    // Single match is okay if it's a strong identifier
    if (matches === 1) {
      // Strong identifiers that definitely indicate an Amex statement
      const strongIdentifiers = ['american express', 'americanexpress.com', 'membership rewards'];
      return strongIdentifiers.some((id) => lowerText.includes(id));
    }

    return false;
  },

  /**
   * Parse Amex statement text and extract transactions
   */
  parse(text: string, options?: ParseOptions): StatementParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify this is an Amex statement
    if (!this.canParse(text)) {
      return {
        success: false,
        parserKey: this.key,
        transactions: [],
        errors: ['Text does not appear to be an American Express statement'],
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
  parseMultiLineTransactions,
  determineTransactionType,
  extractForeignDetails,
  detectCategory,
  calculateConfidence,
  AMEX_IDENTIFIERS,
  DATE_PATTERN_NUMERIC,
  DATE_PATTERN_NAMED,
  PERIOD_PATTERNS,
  TRANSACTION_PATTERNS,
  MONTH_NAMES,
};
