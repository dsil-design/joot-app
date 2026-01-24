/**
 * Kasikorn Bank (K Bank / K PLUS) Statement Parser
 *
 * Parses Kasikorn Bank PDF statements for credit card and savings accounts.
 * Handles Thai language content and THB currency.
 *
 * Kasikorn Bank statement format characteristics:
 * - Statement header with "KASIKORNBANK" or "ธนาคารกสิกรไทย" (Thai name)
 * - Green branding color associated with K Bank
 * - K PLUS app exports in specific formats
 * - Account info shown at top (account number, name)
 * - Transactions listed with date, description, debit/credit columns
 * - Statement period typically shown as date range
 * - Amounts in Thai Baht (THB) format: 1,234.56 or 1234.56
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

// Kasikorn Bank identifier patterns (English and Thai)
// Note: These must be specific enough to not match other banks
// e.g. 'k bank' without space before could match 'bangkok bank'
const KASIKORN_IDENTIFIERS = [
  'kasikornbank',
  'kasikorn bank',
  'kasikorn',
  'kbank',
  'k-bank',
  'k plus',
  'kplus',
  'k+',
  'ธนาคารกสิกรไทย',
  'กสิกรไทย',
  'กสิกร',
  'เคแบงก์',
  'เค พลัส',
  'บัตรเครดิตกสิกร', // Kasikorn credit card
  'k-credit card',
  'k credit card',
  'the wisdom',
  'มาสเตอร์การ์ดไทเทเนียม', // Mastercard Titanium
  'แพลทินัมกสิกร', // Kasikorn Platinum
];

// Date patterns in Kasikorn statements
// DD/MM/YYYY or DD/MM/YY (Thai format - day first)
const DATE_PATTERN_NUMERIC = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
// DD-MM-YYYY format
const DATE_PATTERN_DASH = /(\d{1,2})-(\d{1,2})-(\d{2,4})/;
// DD MMM YYYY or DD MMM YY format (e.g., "15 ธ.ค. 67" or "15 Dec 24")
// Thai month abbrevs like ธ.ค. have dots embedded, so match Thai chars with optional dots
const DATE_PATTERN_THAI_ABBREV = /(\d{1,2})\s+([ก-๙][ก-๙.]*|[A-Za-z]{3,})\.?\s+(\d{2,4})/;

// Thai month abbreviations to number mapping
const THAI_MONTH_NAMES: Record<string, number> = {
  // Thai abbreviations (with and without dots)
  'ม.ค.': 0, 'ม.ค': 0, 'มค': 0, 'มกราคม': 0,
  'ก.พ.': 1, 'ก.พ': 1, 'กพ': 1, 'กุมภาพันธ์': 1,
  'มี.ค.': 2, 'มี.ค': 2, 'มีค': 2, 'มีนาคม': 2,
  'เม.ย.': 3, 'เม.ย': 3, 'เมย': 3, 'เมษายน': 3,
  'พ.ค.': 4, 'พ.ค': 4, 'พค': 4, 'พฤษภาคม': 4,
  'มิ.ย.': 5, 'มิ.ย': 5, 'มิย': 5, 'มิถุนายน': 5,
  'ก.ค.': 6, 'ก.ค': 6, 'กค': 6, 'กรกฎาคม': 6,
  'ส.ค.': 7, 'ส.ค': 7, 'สค': 7, 'สิงหาคม': 7,
  'ก.ย.': 8, 'ก.ย': 8, 'กย': 8, 'กันยายน': 8,
  'ต.ค.': 9, 'ต.ค': 9, 'ตค': 9, 'ตุลาคม': 9,
  'พ.ย.': 10, 'พ.ย': 10, 'พย': 10, 'พฤศจิกายน': 10,
  'ธ.ค.': 11, 'ธ.ค': 11, 'ธค': 11, 'ธันวาคม': 11,
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
  // "Statement Date: 31/12/2024"
  /(?:statement\s+date|วันที่\s*(?:ใบแจ้ง|รอบบิล))[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  // "รอบบัญชี 1 - 31 ธ.ค. 2567"
  /(?:รอบ\s*(?:บัญชี|บิล)|cycle)[:\s]*(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([ก-๙]+\.?)\s+(\d{2,4})/i,
  // "From 01/12/2024 To 31/12/2024"
  /(?:from|จาก)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:to|ถึง)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  // "Period: 01 Dec 2024 - 31 Dec 2024"
  /(?:period|รอบ)[:\s]*(\d{1,2}\s+[A-Za-zก-๙]+\.?\s+\d{2,4})\s*[-–ถึง]\s*(\d{1,2}\s+[A-Za-zก-๙]+\.?\s+\d{2,4})/i,
];

// Payment due date patterns
const DUE_DATE_PATTERNS = [
  /(?:due\s+date|วันครบกำหนด(?:ชำระ)?|กำหนดชำระ)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /(?:please\s+pay\s+by|ชำระภายใน|ชำระก่อน)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /(?:payment\s+due|ครบกำหนด)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
];

// Transaction line patterns for Kasikorn statements
// Format 1: "15/12/24  MERCHANT NAME                 1,234.56      -"
// Format 2: "15/12/24  MERCHANT NAME                     -     1,234.56"
// Format 3: "15/12/24 | Description | 1,234.56" (K PLUS export)
// Format 4: Date | Time | Description | Debit | Credit | Balance
const TRANSACTION_PATTERNS = [
  // DD/MM/YY with debit amount and optional balance
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(?:[-–]|$)/,
  // DD/MM/YY with credit amount
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+[-–]\s+([\d,]+\.\d{2})$/,
  // DD/MM/YY with time and debit/credit columns
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(?:\d{2}:\d{2}(?::\d{2})?\s+)?(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?$/,
  // DD-MM-YYYY format
  /^(\d{1,2}-\d{1,2}-\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})/,
  // K PLUS format with channel/reference
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s+(?:K\s*PLUS|KPLUS|K-PLUS|ATM|MOBILE)/i,
];

// Amount pattern
const AMOUNT_PATTERN = /([\d,]+\.\d{2})/;

// Section headers in Kasikorn statements (Thai and English)
const SECTION_HEADERS = {
  payments: /(?:payment|ชำระเงิน|รายการชำระ|ยอดชำระ)/i,
  purchases: /(?:purchases?|transactions?|รายการซื้อ|รายการใช้จ่าย|ยอดใช้จ่าย|รายการเดินบัญชี)/i,
  fees: /(?:fees?|charges?|ค่าธรรมเนียม)/i,
  interest: /(?:interest|ดอกเบี้ย)/i,
  totals: /(?:total|summary|รวม|ยอดรวม|สรุป)/i,
  rewards: /(?:rewards?|points?|คะแนน|สะสม)/i,
};

// Summary line patterns
const SUMMARY_PATTERNS = {
  previousBalance: /(?:previous\s*balance|opening\s*balance|ยอดยกมา|ยอดคงเหลือยกมา|ยอดก่อนหน้า)[:\s]*([\d,]+\.\d{2})/i,
  newBalance: /(?:new\s*balance|closing\s*balance|total\s*(?:balance|amount)?|ยอดรวม|ยอดที่ต้องชำระ|ยอดคงเหลือ|ยอดใหม่)[:\s]*([\d,]+\.\d{2})/i,
  minimumPayment: /(?:minimum\s*(?:payment|due)?|ขั้นต่ำ|ยอดชำระขั้นต่ำ)[:\s]*([\d,]+\.\d{2})/i,
  totalCredits: /(?:total\s+(?:credits?|payments?)|รวมชำระ|ยอดเครดิต)[:\s]*([\d,]+\.\d{2})/i,
  totalCharges: /(?:total\s+(?:charges?|purchases?|debits?)|รวมใช้จ่าย|ยอดเดบิต)[:\s]*([\d,]+\.\d{2})/i,
  creditLimit: /(?:credit\s+limit|วงเงิน(?:สินเชื่อ)?)[:\s]*([\d,]+\.\d{2})/i,
  availableCredit: /(?:available\s+credit|วงเงินคงเหลือ|วงเงินที่ใช้ได้)[:\s]*([\d,]+\.\d{2})/i,
};

// Account info patterns
const ACCOUNT_PATTERNS = {
  accountNumber: /(?:account|บัญชี|เลขที่บัญชี|card|บัตร)[:\s#]*(?:no\.?|number|หมายเลข|ending(?:\s+in)?)?[:\s]*([x\d*]{4}[-\s]?[x\d*]{4}[-\s]?[x\d*]{4}[-\s]?[x\d*]{4}|\d{10,16}|[x*]+[-]?[x*]+[-]?[x*]+[-]?\d{4})/i,
  cardholderName: /(?:name|ชื่อ|ผู้ถือบัตร|เรียน)[:\s]*([A-Za-zก-๙\s]+?)(?:\s+(?:เลขที่|account|card)|$)/i,
};

/**
 * Parse a date string in Thai DD/MM/YYYY format
 */
function parseThaiDate(dateStr: string, referenceYear?: number): Date | null {
  // Try numeric format first: DD/MM/YY or DD/MM/YYYY
  let match = dateStr.match(DATE_PATTERN_NUMERIC);
  if (!match) {
    // Try dash format: DD-MM-YY or DD-MM-YYYY
    match = dateStr.match(DATE_PATTERN_DASH);
  }

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    let year = parseInt(match[3], 10);

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

  // Interest (check early as it's specific)
  if (
    lowerDesc.includes('interest') ||
    lowerDesc.includes('ดอกเบี้ย') ||
    lowerDesc.includes('finance charge')
  ) {
    return 'interest';
  }

  // Fees (check before payments since "Late Payment Fee" contains "payment")
  if (
    lowerDesc.includes('fee') ||
    lowerDesc.includes('ค่าธรรมเนียม') ||
    lowerDesc.includes('annual') ||
    lowerDesc.includes('ค่าปรับ') ||
    lowerDesc.includes('sms') ||
    lowerDesc.includes('service charge')
  ) {
    return 'fee';
  }

  // Payments (check after fees)
  if (
    lowerDesc.includes('payment') ||
    lowerDesc.includes('ชำระ') ||
    lowerDesc.includes('thank you') ||
    lowerDesc.includes('received') ||
    lowerDesc.includes('รับชำระ')
  ) {
    return 'payment';
  }

  // Adjustments
  if (
    lowerDesc.includes('adjustment') ||
    lowerDesc.includes('ปรับปรุง') ||
    lowerDesc.includes('reversal') ||
    lowerDesc.includes('correction') ||
    lowerDesc.includes('ยกเลิก')
  ) {
    return 'adjustment';
  }

  // Credits (refunds, returns)
  if (
    isCredit ||
    lowerDesc.includes('refund') ||
    lowerDesc.includes('คืนเงิน') ||
    lowerDesc.includes('return') ||
    lowerDesc.includes('credit') ||
    lowerDesc.includes('cashback')
  ) {
    return 'credit';
  }

  // Default to charge
  return 'charge';
}

/**
 * Detect category from merchant description (Thai context with Kasikorn-specific patterns)
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
    lowerDesc.includes('nok air') ||
    lowerDesc.includes('vietjet') ||
    lowerDesc.includes('airport')
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
    lowerDesc.includes('grabfood') ||
    lowerDesc.includes('foodpanda') ||
    lowerDesc.includes('lineman') ||
    lowerDesc.includes('pizza') ||
    lowerDesc.includes('burger') ||
    lowerDesc.includes('suki') ||
    lowerDesc.includes('ส้มตำ')
  ) {
    return 'Dining';
  }

  // Transportation
  if (
    lowerDesc.includes('grab') && !lowerDesc.includes('food') ||
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
    lowerDesc.includes('esso') ||
    lowerDesc.includes('bangchak') ||
    lowerDesc.includes('บางจาก') ||
    lowerDesc.includes('toll') ||
    lowerDesc.includes('expressway')
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
    lowerDesc.includes('homepro') ||
    lowerDesc.includes('ikea') ||
    lowerDesc.includes('uniqlo') ||
    lowerDesc.includes('h&m') ||
    lowerDesc.includes('zara')
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
    lowerDesc.includes('711') ||
    lowerDesc.includes('family mart') ||
    lowerDesc.includes('minimart') ||
    lowerDesc.includes('maxvalu') ||
    lowerDesc.includes('foodland')
  ) {
    return 'Groceries';
  }

  // Healthcare
  if (
    lowerDesc.includes('hospital') ||
    lowerDesc.includes('โรงพยาบาล') ||
    lowerDesc.includes('clinic') ||
    lowerDesc.includes('คลินิก') ||
    lowerDesc.includes('pharmacy') ||
    lowerDesc.includes('ร้านยา') ||
    lowerDesc.includes('boots') ||
    lowerDesc.includes('watsons')
  ) {
    return 'Healthcare';
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
    lowerDesc.includes('true ') ||
    lowerDesc.includes('true internet') ||
    lowerDesc.includes('truemove') ||
    lowerDesc.includes('3bb') ||
    lowerDesc.includes('tot')
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
    lowerDesc.includes('sf cinema') ||
    lowerDesc.includes('game') ||
    lowerDesc.includes('steam') ||
    lowerDesc.includes('playstation') ||
    lowerDesc.includes('nintendo')
  ) {
    return 'Entertainment';
  }

  // Education
  if (
    lowerDesc.includes('school') ||
    lowerDesc.includes('university') ||
    lowerDesc.includes('มหาวิทยาลัย') ||
    lowerDesc.includes('โรงเรียน') ||
    lowerDesc.includes('course') ||
    lowerDesc.includes('training') ||
    lowerDesc.includes('udemy') ||
    lowerDesc.includes('coursera')
  ) {
    return 'Education';
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
      } else if (match[2]) {
        // Pattern with full dates
        startDate = parseThaiDate(match[1]);
        endDate = parseThaiDate(match[2]);
      } else if (match[1]) {
        // Single statement date - assume month-long period
        const stmtDate = parseThaiDate(match[1]);
        if (stmtDate) {
          endDate = stmtDate;
          // Start date is typically 1 month before
          startDate = new Date(stmtDate);
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setDate(startDate.getDate() + 1);
        }
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
    if (accountNum.includes('x') || accountNum.includes('*')) {
      accountNum = accountNum.replace(/[x*]+/gi, '****');
    }
    info.accountNumber = accountNum;
    hasData = true;
  }

  const nameMatch = text.match(ACCOUNT_PATTERNS.cardholderName);
  if (nameMatch) {
    info.cardholderName = nameMatch[1].trim();
    hasData = true;
  }

  // Detect card type (Kasikorn-specific card types)
  const lowerText = text.toLowerCase();
  if (lowerText.includes('the wisdom') || lowerText.includes('เดอะ วิสดอม')) {
    info.cardType = 'Kasikorn THE WISDOM';
    hasData = true;
  } else if (lowerText.includes('platinum') || lowerText.includes('แพลทินัม')) {
    info.cardType = 'Kasikorn Platinum';
    hasData = true;
  } else if (lowerText.includes('titanium') || lowerText.includes('ไทเทเนียม')) {
    info.cardType = 'Kasikorn Titanium';
    hasData = true;
  } else if (lowerText.includes('gold') || lowerText.includes('ทอง')) {
    info.cardType = 'Kasikorn Gold';
    hasData = true;
  } else if (lowerText.includes('beyond') || lowerText.includes('บียอนด์')) {
    info.cardType = 'Kasikorn Beyond';
    hasData = true;
  } else if (lowerText.includes('signature') || lowerText.includes('ซิกเนเจอร์')) {
    info.cardType = 'Kasikorn Signature';
    hasData = true;
  } else if (lowerText.includes('visa')) {
    info.cardType = 'Kasikorn Visa';
    hasData = true;
  } else if (lowerText.includes('mastercard') || lowerText.includes('มาสเตอร์การ์ด')) {
    info.cardType = 'Kasikorn Mastercard';
    hasData = true;
  } else if (lowerText.includes('jcb')) {
    info.cardType = 'Kasikorn JCB';
    hasData = true;
  } else if (lowerText.includes('k credit') || lowerText.includes('k-credit')) {
    info.cardType = 'Kasikorn Credit Card';
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

    // Skip totals and rewards sections
    if (currentSection === 'totals' || currentSection === 'rewards') continue;

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
        if (description.match(/^[\d$,.\s\-฿]+$/) || /^(total|รวม|summary|ยอด)/i.test(description)) {
          continue;
        }

        // Skip page headers/footers
        if (/^page|หน้า|^\d+\s*\/\s*\d+$/i.test(description)) {
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

  // Base confidence for identifying as Kasikorn Bank
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
 * Kasikorn Bank Statement Parser implementation
 */
export const kasikornParser: StatementParser = {
  key: 'kasikorn',
  name: 'Kasikorn Bank Statement Parser',
  defaultCurrency: 'THB',

  /**
   * Check if this parser can handle the given statement text
   */
  canParse(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Check for Kasikorn Bank identifiers
    return KASIKORN_IDENTIFIERS.some((id) => lowerText.includes(id));
  },

  /**
   * Parse Kasikorn Bank statement text and extract transactions
   */
  parse(text: string, options?: ParseOptions): StatementParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify this is a Kasikorn Bank statement
    if (!this.canParse(text)) {
      return {
        success: false,
        parserKey: this.key,
        transactions: [],
        errors: ['Text does not appear to be a Kasikorn Bank statement'],
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
  parseAmount,
  parseStatementPeriod,
  parseSummary,
  parseAccountInfo,
  parseTransactions,
  determineTransactionType,
  detectCategory,
  calculateConfidence,
  KASIKORN_IDENTIFIERS,
  THAI_MONTH_NAMES,
  DATE_PATTERN_NUMERIC,
  DATE_PATTERN_DASH,
  DATE_PATTERN_THAI_ABBREV,
  PERIOD_PATTERNS,
  TRANSACTION_PATTERNS,
};
