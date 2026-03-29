/**
 * Bangkok Bank (Bualuang) Statement Parser
 *
 * Parses Bangkok Bank PDF statements for credit card and savings accounts.
 * Handles Thai language content and THB currency.
 *
 * Bangkok Bank statement format characteristics:
 * - Statement header with "Bangkok Bank" or "ธนาคารกรุงเทพ" (Thai name)
 * - Account info shown at top (account number, name)
 * - Transactions listed with date, description, debit/credit columns
 * - Statement period typically shown as date range
 * - Amounts in Thai Baht (THB) format: 1,234.56
 * - May include both Thai and English descriptions
 */

import type {
  StatementParser,
  StatementParseResult,
  ParsedStatementTransaction,
  StatementPeriod,
  StatementSummary,
  ParseOptions,
} from './types';

// Bangkok Bank identifier patterns (English and Thai)
const BANGKOK_BANK_IDENTIFIERS = [
  'bangkok bank',
  'bualuang',
  'ธนาคารกรุงเทพ',
  'บัวหลวง',
  'bangkokbank.com',
  'บัตรบัวหลวง', // Bualuang card
];

// Savings account identifiers
const SAVINGS_ACCOUNT_IDENTIFIERS = [
  'saving account',
  'เงินฝากสะสมทรัพย',
];

/**
 * Savings account transaction line pattern.
 * pdf-parse concatenates columns with no spaces, producing lines like:
 *   01/10/25TRANSFER2,782.0053,506.43mPhone
 *   02/10/25TRF FR OTH BK228.2553,734.68mPhone
 *   18/10/25CASH W/D ATM2,000.0019,010.90ATM SARAPHI,CHIANG MAI
 *
 * Structure: date(DD/MM/YY) + description(letters/spaces/dots/slashes) + amount(s) + via?
 * Descriptions never contain digits, so the first digit after the description marks amounts.
 */
const SAVINGS_TX_PATTERN = /^(\d{2}\/\d{2}\/\d{2})([A-Z][A-Z/. ,'&]+?)([\d,]+\.\d{2})([\d,]+\.\d{2})?(.*)$/;

// B/F (brought forward) line - only has balance
const SAVINGS_BF_PATTERN = /^(\d{2}\/\d{2}\/\d{2})B\/F([\d,]+\.\d{2})$/;

// Date patterns in Bangkok Bank statements
// DD/MM/YYYY or DD/MM/YY (Thai format - day first)
const DATE_PATTERN_NUMERIC = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
// DD MMM YYYY or DD MMM YY format (e.g., "15 ธ.ค. 67" or "15 Dec 24")
const DATE_PATTERN_THAI_ABBREV = /(\d{1,2})\s+([ก-๙]+\.?|[A-Za-z]{3})\.?\s+(\d{2,4})/;

// Thai month abbreviations to number mapping
const THAI_MONTH_NAMES: Record<string, number> = {
  // Thai abbreviations
  'ม.ค.': 0, 'มค': 0, 'มกราคม': 0,
  'ก.พ.': 1, 'กพ': 1, 'กุมภาพันธ์': 1,
  'มี.ค.': 2, 'มีค': 2, 'มีนาคม': 2,
  'เม.ย.': 3, 'เมย': 3, 'เมษายน': 3,
  'พ.ค.': 4, 'พค': 4, 'พฤษภาคม': 4,
  'มิ.ย.': 5, 'มิย': 5, 'มิถุนายน': 5,
  'ก.ค.': 6, 'กค': 6, 'กรกฎาคม': 6,
  'ส.ค.': 7, 'สค': 7, 'สิงหาคม': 7,
  'ก.ย.': 8, 'กย': 8, 'กันยายน': 8,
  'ต.ค.': 9, 'ตค': 9, 'ตุลาคม': 9,
  'พ.ย.': 10, 'พย': 10, 'พฤศจิกายน': 10,
  'ธ.ค.': 11, 'ธค': 11, 'ธันวาคม': 11,
  // English abbreviations
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

// Statement period patterns (Thai and English)
const PERIOD_PATTERNS = [
  // "Statement Period: 01/12/2024 - 31/12/2024"
  /(?:statement\s+period|งวด\s*(?:บัญชี|ใบแจ้ง)?)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–ถึง]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  // "รอบบัญชี 1 - 31 ธ.ค. 2567"
  /(?:รอบ\s*(?:บัญชี|บิล)|cycle)[:\s]*(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([ก-๙]+\.?)\s+(\d{2,4})/i,
  // "From 01/12/2024 To 31/12/2024"
  /(?:from|จาก)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:to|ถึง)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
];

// Payment due date patterns
const DUE_DATE_PATTERNS = [
  /(?:due\s+date|วันครบกำหนด(?:ชำระ)?|กำหนดชำระ)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /(?:please\s+pay\s+by|ชำระภายใน)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
];

// Transaction line patterns for Bangkok Bank
// Format 1: "15/12/24  MERCHANT NAME                 1,234.56      -"
// Format 2: "15/12/24  MERCHANT NAME                     -     1,234.56"
// Format 3: Date | Description | Debit | Credit (tabular)
const TRANSACTION_PATTERNS = [
  // DD/MM/YY with debit amount
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(?:[-–]|$)/,
  // DD/MM/YY with credit amount (typically has - before amount or different column)
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+[-–]\s+([\d,]+\.\d{2})$/,
  // DD/MM/YY with optional debit/credit columns
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?$/,
];

// Amount pattern
const AMOUNT_PATTERN = /([\d,]+\.\d{2})/;

// Section headers in Bangkok Bank statements (Thai and English)
const SECTION_HEADERS = {
  payments: /(?:payment|ชำระเงิน|รายการชำระ)/i,
  purchases: /(?:purchases?|transactions?|รายการซื้อ|รายการใช้จ่าย|ยอดใช้จ่าย)/i,
  fees: /(?:fees?|charges?|ค่าธรรมเนียม)/i,
  interest: /(?:interest|ดอกเบี้ย)/i,
  totals: /(?:total|summary|รวม|ยอดรวม|สรุป)/i,
};

// Summary line patterns
const SUMMARY_PATTERNS = {
  previousBalance: /(?:previous\s*balance|opening\s*balance|ยอดยกมา|ยอดคงเหลือยกมา)[:\s]*([\d,]+\.\d{2})/i,
  newBalance: /(?:new\s*balance|closing\s*balance|total\s*balance|ยอดรวม|ยอดที่ต้องชำระ|ยอดคงเหลือ)[:\s]*([\d,]+\.\d{2})/i,
  minimumPayment: /(?:minimum\s*payment|ขั้นต่ำ|ยอดชำระขั้นต่ำ)[:\s]*([\d,]+\.\d{2})/i,
  totalCredits: /(?:total\s+(?:credits?|payments?)|รวมชำระ)[:\s]*([\d,]+\.\d{2})/i,
  totalCharges: /(?:total\s+(?:charges?|purchases?)|รวมใช้จ่าย)[:\s]*([\d,]+\.\d{2})/i,
  creditLimit: /(?:credit\s+limit|วงเงิน)[:\s]*([\d,]+\.\d{2})/i,
};

// Account info patterns
const ACCOUNT_PATTERNS = {
  accountNumber: /(?:account|บัญชี|เลขที่บัญชี|card|บัตร)[:\s#]*(?:no\.?|number|หมายเลข|ending(?:\s+in)?)?[:\s]*([x\d]{4}[-\s]?[x\d]{4}[-\s]?[x\d]{4}[-\s]?[x\d]{4}|\d{10,16}|[x]+[-]?[x]+[-]?[x]+[-]?\d{4})/i,
  cardholderName: /(?:name|ชื่อ|ผู้ถือบัตร)[:\s]*([A-Za-zก-๙\s]+)/i,
};

/**
 * Parse a date string in Thai DD/MM/YYYY format
 */
function parseThaiDate(dateStr: string, referenceYear?: number): Date | null {
  // Try numeric format first: DD/MM/YY or DD/MM/YYYY
  const numericMatch = dateStr.match(DATE_PATTERN_NUMERIC);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1; // 0-indexed
    let year = parseInt(numericMatch[3], 10);

    // Handle 2-digit year
    if (year < 100) {
      // Thai Buddhist year offset (BE = CE + 543)
      // If year > 43 (2543 BE = 2000 CE), it's likely Buddhist Era
      if (year > 43 && year < 100) {
        year = year + 2500 - 543; // Convert from 2-digit BE to CE
      } else {
        year = year > 50 ? 1900 + year : 2000 + year;
      }
    } else if (year > 2400) {
      // Full Buddhist Era year (e.g., 2567 BE = 2024 CE)
      year = year - 543;
    }

    // Use reference year if provided and makes sense
    if (referenceYear && Math.abs(year - referenceYear) > 1) {
      year = referenceYear;
    }

    const date = new Date(year, month, day);
    if (isNaN(date.getTime()) || date.getMonth() !== month) return null;
    return date;
  }

  // Try Thai abbreviated month format: "15 ธ.ค. 67"
  const thaiMatch = dateStr.match(DATE_PATTERN_THAI_ABBREV);
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1], 10);
    const monthStr = thaiMatch[2].toLowerCase().replace('.', '');
    const month = THAI_MONTH_NAMES[monthStr] ?? THAI_MONTH_NAMES[thaiMatch[2]];
    if (month === undefined) return null;

    let year = parseInt(thaiMatch[3], 10);

    // Handle Buddhist Era years
    if (year < 100) {
      if (year > 43) {
        year = year + 2500 - 543;
      } else {
        year = 2000 + year;
      }
    } else if (year > 2400) {
      year = year - 543;
    }

    const date = new Date(year, month, day);
    if (isNaN(date.getTime()) || date.getMonth() !== month) return null;
    return date;
  }

  return null;
}

/**
 * Parse a short date (DD/MM) using a reference date for the year
 */
function parseShortDate(dateStr: string, referenceDate: Date): Date | null {
  // Try numeric format: DD/MM
  const numericMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1;
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
 * Parse an amount string, handling Thai number format (commas)
 */
function parseAmount(amountStr: string): number | null {
  const match = amountStr.match(AMOUNT_PATTERN);
  if (!match) return null;

  const cleaned = match[1].replace(/,/g, '');
  const value = parseFloat(cleaned);

  if (isNaN(value)) return null;
  return value;
}

/**
 * Determine transaction type based on description and context
 */
function determineTransactionType(
  description: string,
  isCredit: boolean
): ParsedStatementTransaction['type'] {
  const lowerDesc = description.toLowerCase();

  // Payments
  if (
    lowerDesc.includes('payment') ||
    lowerDesc.includes('ชำระ') ||
    lowerDesc.includes('thank you')
  ) {
    return 'payment';
  }

  // Interest
  if (
    lowerDesc.includes('interest') ||
    lowerDesc.includes('ดอกเบี้ย') ||
    lowerDesc.includes('finance charge')
  ) {
    return 'interest';
  }

  // Fees
  if (
    lowerDesc.includes('fee') ||
    lowerDesc.includes('ค่าธรรมเนียม') ||
    lowerDesc.includes('annual') ||
    lowerDesc.includes('late')
  ) {
    return 'fee';
  }

  // Adjustments
  if (
    lowerDesc.includes('adjustment') ||
    lowerDesc.includes('ปรับปรุง') ||
    lowerDesc.includes('reversal') ||
    lowerDesc.includes('correction')
  ) {
    return 'adjustment';
  }

  // Credits (refunds, returns)
  if (
    isCredit ||
    lowerDesc.includes('refund') ||
    lowerDesc.includes('คืนเงิน') ||
    lowerDesc.includes('return') ||
    lowerDesc.includes('credit')
  ) {
    return 'credit';
  }

  // Default to charge
  return 'charge';
}

/**
 * Detect category from merchant description (Thai context)
 */
function detectCategory(description: string): string | undefined {
  const lowerDesc = description.toLowerCase();

  // Travel
  if (
    lowerDesc.includes('airline') ||
    lowerDesc.includes('hotel') ||
    lowerDesc.includes('airbnb') ||
    lowerDesc.includes('booking.com') ||
    lowerDesc.includes('agoda') ||
    lowerDesc.includes('การบินไทย') ||
    lowerDesc.includes('thai airways') ||
    lowerDesc.includes('airasia') ||
    lowerDesc.includes('nok air')
  ) {
    return 'Travel';
  }

  // Dining
  if (
    lowerDesc.includes('restaurant') ||
    lowerDesc.includes('ร้านอาหาร') ||
    lowerDesc.includes('cafe') ||
    lowerDesc.includes('coffee') ||
    lowerDesc.includes('starbucks') ||
    lowerDesc.includes('amazon') ||
    lowerDesc.includes('mcdonald') ||
    lowerDesc.includes('kfc') ||
    lowerDesc.includes('grab food') ||
    lowerDesc.includes('foodpanda') ||
    lowerDesc.includes('lineman')
  ) {
    return 'Dining';
  }

  // Transportation
  if (
    lowerDesc.includes('grab') ||
    lowerDesc.includes('bolt') ||
    lowerDesc.includes('taxi') ||
    lowerDesc.includes('bts') ||
    lowerDesc.includes('mrt') ||
    lowerDesc.includes('รถไฟฟ้า') ||
    lowerDesc.includes('parking') ||
    lowerDesc.includes('gas') ||
    lowerDesc.includes('shell') ||
    lowerDesc.includes('ptt') ||
    lowerDesc.includes('caltex') ||
    lowerDesc.includes('esso')
  ) {
    return 'Transportation';
  }

  // Shopping
  if (
    lowerDesc.includes('lazada') ||
    lowerDesc.includes('shopee') ||
    lowerDesc.includes('central') ||
    lowerDesc.includes('robinson') ||
    lowerDesc.includes('the mall') ||
    lowerDesc.includes('emporium') ||
    lowerDesc.includes('paragon') ||
    lowerDesc.includes('power buy') ||
    lowerDesc.includes('homepro')
  ) {
    return 'Shopping';
  }

  // Groceries
  if (
    lowerDesc.includes('tesco') ||
    lowerDesc.includes('lotus') ||
    lowerDesc.includes('big c') ||
    lowerDesc.includes('makro') ||
    lowerDesc.includes('tops') ||
    lowerDesc.includes('villa market') ||
    lowerDesc.includes('gourmet') ||
    lowerDesc.includes('7-eleven') ||
    lowerDesc.includes('family mart') ||
    lowerDesc.includes('minimart')
  ) {
    return 'Groceries';
  }

  // Utilities (check before Entertainment to catch "TRUE INTERNET" correctly)
  if (
    lowerDesc.includes('electric') ||
    lowerDesc.includes('ไฟฟ้า') ||
    lowerDesc.includes('water') ||
    lowerDesc.includes('ประปา') ||
    lowerDesc.includes('internet') ||
    lowerDesc.includes('mobile') ||
    lowerDesc.includes('dtac') ||
    lowerDesc.includes('ais') ||
    lowerDesc.includes('true ') || // Note: space after to avoid matching random "true"
    lowerDesc.includes('true internet') ||
    lowerDesc.includes('truemove')
  ) {
    return 'Utilities';
  }

  // Entertainment
  if (
    lowerDesc.includes('netflix') ||
    lowerDesc.includes('spotify') ||
    lowerDesc.includes('youtube') ||
    lowerDesc.includes('cinema') ||
    lowerDesc.includes('major') ||
    lowerDesc.includes('sf cinema')
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
      // Handle different capture groups based on pattern
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (match[3] && match[4]) {
        // Pattern with day range and month: "1 - 31 ธ.ค. 2567"
        const month = THAI_MONTH_NAMES[match[3]];
        if (month !== undefined) {
          let year = parseInt(match[4], 10);
          if (year > 2400) year = year - 543; // Convert BE to CE

          startDate = new Date(year, month, parseInt(match[1], 10));
          endDate = new Date(year, month, parseInt(match[2], 10));
        }
      } else {
        // Pattern with full dates
        startDate = parseThaiDate(match[1]);
        endDate = parseThaiDate(match[2]);
      }

      if (startDate && endDate) {
        const period: StatementPeriod = { startDate, endDate };

        // Try to find due date
        for (const duePattern of DUE_DATE_PATTERNS) {
          const dueMatch = text.match(duePattern);
          if (dueMatch) {
            const dueDate = parseThaiDate(dueMatch[1]);
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
    // Clean up account number (remove spaces/dashes, keep last 4 if masked)
    let accountNum = accountMatch[1].replace(/[-\s]/g, '');
    if (accountNum.includes('x')) {
      accountNum = accountNum.replace(/x+/i, '****');
    }
    info.accountNumber = accountNum;
    hasData = true;
  }

  const nameMatch = text.match(ACCOUNT_PATTERNS.cardholderName);
  if (nameMatch) {
    info.cardholderName = nameMatch[1].trim();
    hasData = true;
  }

  // Detect card type
  const lowerText = text.toLowerCase();
  if (lowerText.includes('platinum') || lowerText.includes('แพลทินัม')) {
    info.cardType = 'Bangkok Bank Platinum';
    hasData = true;
  } else if (lowerText.includes('titanium') || lowerText.includes('ไทเทเนียม')) {
    info.cardType = 'Bangkok Bank Titanium';
    hasData = true;
  } else if (lowerText.includes('gold') || lowerText.includes('ทอง')) {
    info.cardType = 'Bangkok Bank Gold';
    hasData = true;
  } else if (lowerText.includes('visa')) {
    info.cardType = 'Bangkok Bank Visa';
    hasData = true;
  } else if (lowerText.includes('mastercard')) {
    info.cardType = 'Bangkok Bank Mastercard';
    hasData = true;
  } else if (lowerText.includes('bualuang') || lowerText.includes('บัวหลวง')) {
    info.cardType = 'Bualuang Credit Card';
    hasData = true;
  }

  return hasData ? info : undefined;
}

/**
 * Extract a valid amount from a string that may have a count prefix concatenated.
 * E.g., "3078,632.10" → 78632.10 (the "30" is the count, "78,632.10" is the amount)
 * Tries all valid split points and returns the one that parses as a valid comma-formatted amount.
 */
function extractTrailingAmount(str: string): number | null {
  // Try parsing from each position to find a valid amount (N,NNN.NN or NNN.NN)
  for (let i = 0; i < str.length; i++) {
    const candidate = str.slice(i);
    // Must start with a digit, have proper comma formatting, and end with .NN
    if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(candidate)) {
      return parseAmount(candidate);
    }
  }
  // Fallback: try parsing the whole string
  return parseAmount(str);
}

/**
 * Detect if text is a savings account statement
 */
function isSavingsAccount(text: string): boolean {
  const lowerText = text.toLowerCase();
  return SAVINGS_ACCOUNT_IDENTIFIERS.some((id) => lowerText.includes(id));
}

/**
 * Parse savings account period from text.
 * In pdf-parse output, "Statement Period" and dates may be on separate lines:
 *   รอบรายการบัญชี / Statement Period
 *   967-0-12337-2
 *   THB
 *   01/10/2025 - 31/10/2025
 */
function parseSavingsPeriod(text: string): StatementPeriod | undefined {
  // Look for standalone date range line: DD/MM/YYYY - DD/MM/YYYY
  const dateRangeMatch = text.match(
    /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/
  );
  if (dateRangeMatch) {
    const startDate = parseThaiDate(dateRangeMatch[1]);
    const endDate = parseThaiDate(dateRangeMatch[2]);
    if (startDate && endDate) {
      return { startDate, endDate };
    }
  }
  return undefined;
}

/**
 * Parse savings account summary from text.
 * The concatenated pdf-parse output for the summary section looks like:
 *   106จํานวนรายการถอน/Total No. of Debits
 *   จํานวนรายการฝาก/Total No. of Creditsจํานวนเงินฝาก/Total Credit Amount
 *   จํานวนเงินถอน/Total Debit Amount
 *   3078,632.10       ← "30" (credit count) + "78,632.10" (credit amount)
 *   92,149.01         ← total debit amount
 *
 * We extract the two totals from the lines after the summary labels.
 */
function parseSavingsSummary(text: string): StatementSummary | undefined {
  const summary: StatementSummary = {};
  let hasData = false;

  // Find the summary section: look for Total Debit Amount label, then extract amounts
  // The concatenated line "3078,632.10" = count "30" + amount "78,632.10"
  // We need to separate them: the amount always has format N,NNN.NN or NNN.NN
  const summaryMatch = text.match(
    /Total Debit Amount\s*\n(\d+(?:,\d{3})*\.\d{2})\s*\n(\d+(?:,\d{3})*\.\d{2})/i
  );
  if (summaryMatch) {
    // Due to concatenation, the first "amount" includes the credit count prefix.
    // E.g., "3078,632.10" - we need to find where the real amount starts.
    // The amount format uses commas for thousands, so look for the rightmost valid amount.
    const rawCredit = summaryMatch[1];
    const creditTotal = extractTrailingAmount(rawCredit);
    const debitTotal = parseAmount(summaryMatch[2]);
    if (creditTotal !== null) {
      summary.paymentsAndCredits = creditTotal;
      hasData = true;
    }
    if (debitTotal !== null) {
      summary.purchasesAndCharges = debitTotal;
      hasData = true;
    }
  }

  return hasData ? summary : undefined;
}

/**
 * Parse savings account transactions from concatenated pdf-parse output.
 * Uses running balance to determine if each transaction is a withdrawal or deposit.
 */
function parseSavingsTransactions(
  text: string,
): { transactions: ParsedStatementTransaction[]; warnings: string[] } {
  const transactions: ParsedStatementTransaction[] = [];
  const warnings: string[] = [];

  const lines = text.split('\n');
  let previousBalance: number | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for B/F (brought forward) line - sets opening balance
    const bfMatch = trimmed.match(SAVINGS_BF_PATTERN);
    if (bfMatch) {
      previousBalance = parseAmount(bfMatch[2]);
      continue;
    }

    // Try savings transaction pattern
    const match = trimmed.match(SAVINGS_TX_PATTERN);
    if (!match) continue;

    const dateStr = match[1];
    const description = match[2].trim();
    const firstAmount = parseAmount(match[3]);
    const secondAmount = match[4] ? parseAmount(match[4]) : null;

    // Skip header-like lines or summary lines
    if (!description || description.length < 2) continue;
    if (/^(TOTAL|SUMMARY)/i.test(description)) continue;

    // Parse date (DD/MM/YY with 2-digit year)
    const transactionDate = parseThaiDate(dateStr);
    if (!transactionDate) continue;

    // Determine amounts:
    // If two amounts: first is transaction amount, second is balance
    // If one amount and no previous balance: this might be a balance-only line
    let txAmount: number | null = null;
    let currentBalance: number | null = null;

    if (secondAmount !== null && firstAmount !== null) {
      txAmount = firstAmount;
      currentBalance = secondAmount;
    } else if (firstAmount !== null && previousBalance !== null) {
      // Only one amount - it's the balance, derive tx amount from balance change
      currentBalance = firstAmount;
      txAmount = Math.abs(currentBalance - previousBalance);
      // Round to 2 decimal places to avoid floating point issues
      txAmount = Math.round(txAmount * 100) / 100;
    } else {
      continue;
    }

    if (txAmount === null || txAmount === 0 || currentBalance === null) continue;

    // Determine direction from balance change
    let isWithdrawal: boolean;
    if (previousBalance !== null) {
      isWithdrawal = currentBalance < previousBalance;
    } else {
      // Fallback: infer from description
      isWithdrawal = !description.includes('FR OTH BK') && !description.includes('FOREIGN T/T');
    }

    previousBalance = currentBalance;

    // Determine transaction type
    const lowerDesc = description.toLowerCase();
    let type: ParsedStatementTransaction['type'] = isWithdrawal ? 'charge' : 'credit';
    if (lowerDesc.includes('fee') || lowerDesc.includes('ค่าธรรมเนียม') || lowerDesc.includes('com/annual')) {
      type = 'fee';
    } else if (lowerDesc.includes('interest') || lowerDesc.includes('ดอกเบี้ย')) {
      type = 'interest';
    }

    // Amount sign convention: positive = money out, negative = money in
    const signedAmount = isWithdrawal ? Math.abs(txAmount) : -Math.abs(txAmount);

    const transaction: ParsedStatementTransaction = {
      transactionDate,
      description,
      amount: signedAmount,
      currency: 'THB',
      type,
      rawLine: trimmed,
    };

    // Detect category
    transaction.category = detectCategory(description);

    transactions.push(transaction);
  }

  if (transactions.length === 0) {
    warnings.push('No savings account transactions extracted');
  }

  return { transactions, warnings };
}

/**
 * Parse transactions from credit card statement text
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

    // Skip totals sections
    if (currentSection === 'totals') continue;

    // Try each transaction pattern
    for (const pattern of TRANSACTION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const dateStr = match[1];
        const description = match[2]?.trim();
        const debitAmount = match[3] ? parseAmount(match[3]) : null;
        const creditAmount = match[4] ? parseAmount(match[4]) : null;

        // Skip if no description or too short (likely a header)
        if (!description || description.length < 3) continue;

        // Skip if looks like a header/summary line
        if (description.match(/^[\d$,.\s\-฿]+$/) || /^(total|รวม|summary)/i.test(description)) {
          continue;
        }

        const transactionDate = parseThaiDate(dateStr, referenceDate.getFullYear());
        if (!transactionDate) continue;

        // Determine if credit or debit
        const isCredit = creditAmount !== null && debitAmount === null;
        const amount = creditAmount ?? debitAmount;

        if (amount === null) continue;

        const type = determineTransactionType(description, isCredit);

        const transaction: ParsedStatementTransaction = {
          transactionDate,
          description,
          amount: isCredit || type === 'payment' || type === 'credit' ? -Math.abs(amount) : Math.abs(amount),
          currency: 'THB',
          type,
          rawLine: line,
        };

        // Detect category
        transaction.category = detectCategory(description);

        // Avoid duplicates
        const isDuplicate = transactions.some(
          (t) =>
            t.transactionDate.getTime() === transactionDate.getTime() &&
            Math.abs(t.amount) === Math.abs(amount) &&
            t.description === description
        );

        if (!isDuplicate) {
          transactions.push(transaction);
        }

        break;
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

  // Base confidence for identifying as Bangkok Bank
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
 * Bangkok Bank Statement Parser implementation
 */
export const bangkokBankParser: StatementParser = {
  key: 'bangkok-bank',
  name: 'Bangkok Bank Statement Parser',
  defaultCurrency: 'THB',

  /**
   * Check if this parser can handle the given statement text
   */
  canParse(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Check for Bangkok Bank identifiers
    return BANGKOK_BANK_IDENTIFIERS.some((id) => lowerText.includes(id));
  },

  /**
   * Parse Bangkok Bank statement text and extract transactions
   */
  parse(text: string, options?: ParseOptions): StatementParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify this is a Bangkok Bank statement
    if (!this.canParse(text)) {
      return {
        success: false,
        parserKey: this.key,
        transactions: [],
        errors: ['Text does not appear to be a Bangkok Bank statement'],
        warnings: [],
        confidence: 0,
      };
    }

    const savingsMode = isSavingsAccount(text);

    // Extract statement period
    const period = savingsMode ? parseSavingsPeriod(text) : parseStatementPeriod(text);
    if (!period) {
      warnings.push('Could not extract statement period');
    }

    // Extract summary
    const summary = savingsMode ? parseSavingsSummary(text) : parseSummary(text);

    // Extract account info
    const accountInfo = parseAccountInfo(text);

    // Parse transactions
    const { transactions, warnings: txWarnings } = savingsMode
      ? parseSavingsTransactions(text)
      : parseTransactions(text, period);
    warnings.push(...txWarnings);

    if (transactions.length === 0) {
      warnings.push('No transactions extracted from statement');
    }

    // Estimate page count from text length
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
  parseThaiDate,
  parseShortDate,
  parseAmount,
  parseStatementPeriod,
  parseSummary,
  parseAccountInfo,
  parseTransactions,
  parseSavingsTransactions,
  parseSavingsPeriod,
  parseSavingsSummary,
  isSavingsAccount,
  determineTransactionType,
  detectCategory,
  calculateConfidence,
  BANGKOK_BANK_IDENTIFIERS,
  SAVINGS_ACCOUNT_IDENTIFIERS,
  THAI_MONTH_NAMES,
  DATE_PATTERN_NUMERIC,
  DATE_PATTERN_THAI_ABBREV,
  PERIOD_PATTERNS,
  TRANSACTION_PATTERNS,
  SAVINGS_TX_PATTERN,
  SAVINGS_BF_PATTERN,
};
