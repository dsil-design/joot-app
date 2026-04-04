/**
 * Kasikorn Bank (K Bank / K PLUS) Statement Parser
 *
 * Parses Kasikorn Bank PDF statements for savings/checking accounts.
 * Handles the K PLUS app export format where pdf-parse concatenates
 * table columns without delimiters.
 *
 * Real extracted line format (no spaces between columns):
 *   DD-MM-YYHH:MM<Channel><Balance><Description><TypeKeyword><Amount>
 *
 * Example:
 *   02-12-2510:23K PLUS241,943.10Paid for Ref XF001 บริษัท เอส จี จี 2023 จํากัดPayment270.00
 *
 * Multi-line descriptions are joined before parsing.
 */

import type {
  StatementParser,
  StatementParseResult,
  ParsedStatementTransaction,
  StatementPeriod,
  StatementSummary,
  ParseOptions,
} from './types';

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Simple substring identifiers — matched via `text.includes(id)` */
const KASIKORN_SIMPLE_IDENTIFIERS = [
  'kasikornbank',
  'kasikorn bank',
  'kasikorn',
  'kbank',
  'k-bank',
  'kplus',
  'kbpdf',
  'k-contact center',
  'ธนาคารกสิกรไทย',
  'กสิกรไทย',
  'กสิกร',
  'เคแบงก์',
  'เค พลัส',
  'บัตรเครดิตกสิกร',
  'k-credit card',
  'มาสเตอร์การ์ดไทเทเนียม',
  'แพลทินัมกสิกร',
];

/**
 * Word-boundary identifiers — too generic for substring matching.
 * Uses \b to avoid false positives like "bank credit cards" → "k credit card".
 */
const KASIKORN_REGEX_IDENTIFIERS = [
  /\bk credit card\b/i,
  /\bk plus\b/i,
  /\bk\+/i, // "K+" at start of word
  /\bk biz\b/i,
  /\bthe wisdom\b/i,
];

// ---------------------------------------------------------------------------
// K PLUS statement type keywords (appear at end of line before amount)
// Order matters: longer/more-specific patterns first to avoid partial matches
// ---------------------------------------------------------------------------

const TYPE_KEYWORDS = [
  'QR Transfer Deposit',
  'Transfer Withdrawal',
  'Transfer Deposit',
  'Cash Withdrawal',
  'Interest Deposit',
  'Withholding Tax Payable',
  'Payment',
] as const;

type KBankTypeKeyword = (typeof TYPE_KEYWORDS)[number];

// Regex to match type keyword + amount at end of a line
const TYPE_AMOUNT_PATTERN = new RegExp(
  `(${TYPE_KEYWORDS.join('|')})(\\d[\\d,]*\\.\\d{2})\\s*$`
);

// ---------------------------------------------------------------------------
// Lines to skip (page headers, footers, column labels, standalone numbers)
// ---------------------------------------------------------------------------

const SKIP_LINE_PATTERNS = [
  /^Ref\. No\./,
  /^Account/,
  /^\d+\/\d+\(\d+\)/, // page fraction like "1/4(0663)"
  /^\d{3}-\d-\d+-\d/, // account number like 221-1-47202-5
  /^\d{15,}/, // long reference codes
  /^\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}/, // period dates
  /^(Account Number|Owner Branch|Reference Code|Period)$/i,
  /^(Total (Withdrawal|Deposit)|Ending Balance)/i,
  /^PAGE\/OF/i,
  /^Date$/,
  /^Time\//,
  /^Eff\.Date/,
  /^Withdrawal/,
  /^(Channel|Descriptions?)$/i,
  /^Outstanding Balance/i,
  /^\(THB\)$/,
  /^Details$/,
  /^KBPDF/,
  /^Issued by/,
  /^For more information/,
  /^[\d,]+\.\d{2}$/, // standalone numbers (summary values)
  /^\d+ Moo \d+/, // address lines
  /^MR\.|^MS\.|^MRS\./, // name lines in header
  /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+Branch$/, // branch name in page header (e.g. "Central Chiangmai Branch")
  /^Branch$/, // standalone "Branch" continuation from page header
];

// Date at start of transaction line
const DATE_START = /^(\d{2}-\d{2}-\d{2})/;

// ---------------------------------------------------------------------------
// Date & amount parsing
// ---------------------------------------------------------------------------

/**
 * Parse a date string in DD-MM-YY or DD/MM/YYYY format
 */
function parseThaiDate(dateStr: string): Date | null {
  // DD-MM-YY or DD-MM-YYYY
  let match = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (!match) {
    // DD/MM/YY or DD/MM/YYYY
    match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  }
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  let year = parseInt(match[3], 10);

  if (year < 100) {
    // 2-digit year: if > 43 assume Buddhist Era, otherwise CE
    if (year > 43) {
      year = year + 2500 - 543;
    } else {
      year = 2000 + year;
    }
  } else if (year > 2400) {
    // Full Buddhist Era (e.g. 2567 → 2024)
    year = year - 543;
  }

  const date = new Date(year, month, day);
  if (isNaN(date.getTime()) || date.getMonth() !== month) return null;
  return date;
}

/**
 * Parse an amount string like "1,234.56" or "270.00"
 */
function parseAmount(amountStr: string): number | null {
  const match = amountStr.match(/([\d,]+\.\d{2})/);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(value) ? null : value;
}

// ---------------------------------------------------------------------------
// Header parsing
// ---------------------------------------------------------------------------

/**
 * Extract statement period from text
 */
function parseStatementPeriod(text: string): StatementPeriod | undefined {
  // K PLUS format: "01/12/2025 - 31/12/2025" as a standalone line
  const match = text.match(
    /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/
  );
  if (!match) return undefined;

  const startDate = parseThaiDate(match[1]);
  const endDate = parseThaiDate(match[2]);
  if (!startDate || !endDate) return undefined;

  return { startDate, endDate };
}

/**
 * Extract summary totals from text
 */
function parseSummary(text: string): StatementSummary | undefined {
  const summary: StatementSummary = {};
  let hasData = false;

  // Beginning balance from first "Beginning Balance" line
  const beginMatch = text.match(
    /\d{2}-\d{2}-\d{2}([\d,]+\.\d{2})Beginning Balance/
  );
  if (beginMatch) {
    summary.previousBalance = parseAmount(beginMatch[1]) ?? undefined;
    if (summary.previousBalance !== undefined) hasData = true;
  }

  // Ending balance: number on the line after "Ending Balance"
  const endMatch = text.match(/Ending Balance\s*\n?\s*([\d,]+\.\d{2})/);
  if (endMatch) {
    summary.newBalance = parseAmount(endMatch[1]) ?? undefined;
    if (summary.newBalance !== undefined) hasData = true;
  }

  // Total withdrawal: number on line before "Total Withdrawal"
  const withdrawMatch = text.match(
    /([\d,]+\.\d{2})\s*\n[^\n]*Total Withdrawal\s+(\d+)\s+Items/
  );
  if (withdrawMatch) {
    summary.purchasesAndCharges = parseAmount(withdrawMatch[1]) ?? undefined;
    if (summary.purchasesAndCharges !== undefined) hasData = true;
  }

  // Total deposit: number on line before "Total Deposit"
  const depositMatch = text.match(
    /([\d,]+\.\d{2})\s*\n[^\n]*Total Deposit\s+(\d+)\s+Items/
  );
  if (depositMatch) {
    summary.paymentsAndCredits = parseAmount(depositMatch[1]) ?? undefined;
    if (summary.paymentsAndCredits !== undefined) hasData = true;
  }

  return hasData ? summary : undefined;
}

/**
 * Extract account information from text
 */
function parseAccountInfo(
  text: string
): StatementParseResult['accountInfo'] | undefined {
  const info: NonNullable<StatementParseResult['accountInfo']> = {};
  let hasData = false;

  // Account number: "221-1-47202-5" format
  const acctMatch = text.match(/(\d{3}-\d-\d{5}-\d)/);
  if (acctMatch) {
    info.accountNumber = acctMatch[1];
    hasData = true;
  }

  // Account holder name from "AccountMR. DENNIS RODGER SILLER" or similar
  const nameMatch = text.match(
    /Account\s*(MR\.|MS\.|MRS\.)\s*([A-Z][A-Z\s]+)/
  );
  if (nameMatch) {
    info.cardholderName = (nameMatch[1] + ' ' + nameMatch[2]).trim();
    hasData = true;
  }

  // Card/account type detection
  const lowerText = text.toLowerCase();
  if (lowerText.includes('the wisdom')) {
    info.cardType = 'Kasikorn THE WISDOM';
    hasData = true;
  } else if (lowerText.includes('k biz')) {
    info.cardType = 'Kasikorn K BIZ';
    hasData = true;
  } else if (lowerText.includes('k plus') || lowerText.includes('kplus')) {
    info.cardType = 'Kasikorn K PLUS';
    hasData = true;
  }

  return hasData ? info : undefined;
}

// ---------------------------------------------------------------------------
// Transaction parsing
// ---------------------------------------------------------------------------

/**
 * Map K Bank type keyword to ParsedStatementTransaction type and sign
 */
function mapTransactionType(keyword: KBankTypeKeyword): {
  type: ParsedStatementTransaction['type'];
  isWithdrawal: boolean;
} {
  switch (keyword) {
    case 'Payment':
    case 'Transfer Withdrawal':
    case 'Cash Withdrawal':
      return { type: 'charge', isWithdrawal: true };
    case 'Transfer Deposit':
    case 'QR Transfer Deposit':
      return { type: 'credit', isWithdrawal: false };
    case 'Interest Deposit':
      return { type: 'interest', isWithdrawal: false };
    case 'Withholding Tax Payable':
      return { type: 'fee', isWithdrawal: true };
  }
}

/**
 * Clean up a K PLUS transaction description
 */
function cleanDescription(raw: string, typeKeyword: string): string {
  let desc = raw.trim();

  // Remove "(A/C Name: ...)" suffix
  desc = desc.replace(/\s*\(A\/C Name:.*?\)\s*/g, '').trim();
  // Remove trailing "(A/C" from incomplete wraps
  desc = desc.replace(/\s*\(A\/C\s*$/, '').trim();

  // Clean "Paid for Ref XXXXX " prefix → keep merchant name after it
  const paidMatch = desc.match(/^Paid for Ref \S+\s+(.+)/);
  if (paidMatch) {
    desc = paidMatch[1].trim();
  }

  // Clean "Ref Code XXXXX" for ATM/auto transfers
  const refMatch = desc.match(/^Ref Code \S+\s*(.*)/);
  if (refMatch) {
    desc = refMatch[1]?.trim() || 'Ref Code';
  }

  // Clean transfer descriptions: "From/To [account] NAME++"
  const transferMatch = desc.match(
    /^(?:From|To)\s+(?:PromptPay\s+)?\S+\s+(.+?)(?:\+\+)?$/
  );
  if (transferMatch) {
    const name = transferMatch[1].replace(/\+\+$/, '').trim();
    const direction =
      typeKeyword === 'Transfer Deposit' ||
      typeKeyword === 'QR Transfer Deposit'
        ? 'From'
        : 'To';
    desc = `${direction}: ${name}`;
  }

  // Remove trailing "++"
  desc = desc.replace(/\+\+$/, '').trim();

  return desc;
}

/**
 * Detect spending category from description
 */
function detectCategory(description: string): string | undefined {
  const lower = description.toLowerCase();

  if (
    lower.includes('airline') ||
    lower.includes('hotel') ||
    lower.includes('airbnb') ||
    lower.includes('booking.com') ||
    lower.includes('agoda') ||
    lower.includes('การบินไทย') ||
    lower.includes('thai airways') ||
    lower.includes('airasia') ||
    lower.includes('airport')
  ) {
    return 'Travel';
  }

  if (
    lower.includes('restaurant') ||
    lower.includes('ร้านอาหาร') ||
    lower.includes('cafe') ||
    lower.includes('coffee') ||
    lower.includes('starbucks') ||
    lower.includes('mcdonald') ||
    lower.includes('kfc') ||
    lower.includes('grabfood') ||
    lower.includes('foodpanda') ||
    lower.includes('lineman') ||
    lower.includes('pizza') ||
    lower.includes('burger') ||
    lower.includes('suki') ||
    lower.includes('ส้มตำ') ||
    lower.includes('เรสโตรองต์') ||
    lower.includes('เรสโตรองท์') ||
    lower.includes('ชาบู') ||
    lower.includes('ก๋วยเตี๋ยว') ||
    lower.includes('hotpot')
  ) {
    return 'Dining';
  }

  if (
    (lower.includes('grab') && !lower.includes('food')) ||
    lower.includes('bolt') ||
    lower.includes('taxi') ||
    lower.includes('bts') ||
    lower.includes('mrt') ||
    lower.includes('รถไฟฟ้า') ||
    lower.includes('parking') ||
    lower.includes('gas') ||
    lower.includes('shell') ||
    lower.includes('ptt') ||
    lower.includes('bangchak') ||
    lower.includes('บางจาก') ||
    lower.includes('esso') ||
    lower.includes('caltex') ||
    lower.includes('toll') ||
    lower.includes('ล้างรถ')
  ) {
    return 'Transportation';
  }

  if (
    lower.includes('lazada') ||
    lower.includes('shopee') ||
    lower.includes('central') ||
    lower.includes('robinson') ||
    lower.includes('the mall') ||
    lower.includes('emporium') ||
    lower.includes('paragon') ||
    lower.includes('power buy') ||
    lower.includes('homepro') ||
    lower.includes('ikea') ||
    lower.includes('uniqlo') ||
    lower.includes('h&m') ||
    lower.includes('zara')
  ) {
    return 'Shopping';
  }

  if (
    lower.includes('tesco') ||
    lower.includes('lotus') ||
    lower.includes('big c') ||
    lower.includes('makro') ||
    lower.includes('tops') ||
    lower.includes('villa market') ||
    lower.includes('gourmet') ||
    lower.includes('7-eleven') ||
    lower.includes('711') ||
    lower.includes('family mart') ||
    lower.includes('maxvalu') ||
    lower.includes('foodland')
  ) {
    return 'Groceries';
  }

  if (
    lower.includes('hospital') ||
    lower.includes('โรงพยาบาล') ||
    lower.includes('clinic') ||
    lower.includes('คลินิก') ||
    lower.includes('pharmacy') ||
    lower.includes('ร้านยา') ||
    lower.includes('boots') ||
    lower.includes('watsons')
  ) {
    return 'Healthcare';
  }

  if (
    lower.includes('electric') ||
    lower.includes('ไฟฟ้า') ||
    lower.includes('pea') ||
    lower.includes('water') ||
    lower.includes('ประปา') ||
    lower.includes('pwa') ||
    lower.includes('internet') ||
    lower.includes('mobile') ||
    lower.includes('dtac') ||
    lower.includes('ais') ||
    lower.includes('true ') ||
    lower.includes('truemove') ||
    lower.includes('3bb') ||
    lower.includes('tot')
  ) {
    return 'Utilities';
  }

  if (
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('youtube') ||
    lower.includes('cinema') ||
    lower.includes('major') ||
    lower.includes('sf cinema') ||
    lower.includes('game') ||
    lower.includes('steam') ||
    lower.includes('pickleball') ||
    lower.includes('sportsman') ||
    lower.includes('yoga') ||
    lower.includes('โยคะ') ||
    lower.includes('fitness') ||
    lower.includes('virgin active')
  ) {
    return 'Entertainment';
  }

  if (
    lower.includes('school') ||
    lower.includes('university') ||
    lower.includes('มหาวิทยาลัย') ||
    lower.includes('โรงเรียน') ||
    lower.includes('course') ||
    lower.includes('udemy') ||
    lower.includes('coursera')
  ) {
    return 'Education';
  }

  return undefined;
}

/**
 * Parse all transactions from statement text
 */
function parseTransactions(
  text: string,
  _period: StatementPeriod | undefined
): { transactions: ParsedStatementTransaction[]; warnings: string[] } {
  const transactions: ParsedStatementTransaction[] = [];
  const warnings: string[] = [];
  const lines = text.split('\n');

  // ── Pass 1: Join multi-line transaction blocks ──────────────────────
  // A transaction starts with DD-MM-YY. Continuation lines (that aren't
  // page headers/footers) are appended with a space.

  const blocks: string[] = [];
  let currentBlock = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip known header / footer / label lines
    if (SKIP_LINE_PATTERNS.some((p) => p.test(line))) continue;

    if (DATE_START.test(line)) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = line;
    } else if (currentBlock) {
      // Continuation of previous transaction
      currentBlock += ' ' + line;
    }
    // Lines before any transaction block are ignored
  }
  if (currentBlock) blocks.push(currentBlock);

  // ── Pass 2: Parse each transaction block ────────────────────────────

  for (const block of blocks) {
    // Skip "Beginning Balance" lines
    if (/Beginning Balance/i.test(block)) continue;

    // Extract date (required)
    const dateMatch = block.match(/^(\d{2}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const transactionDate = parseThaiDate(dateMatch[1]);
    if (!transactionDate) continue;

    // After date, try to extract time
    let rest = block.slice(8); // after DD-MM-YY
    const timeMatch = rest.match(/^(\d{2}:\d{2})/);
    if (timeMatch) {
      rest = rest.slice(5); // after HH:MM
    }

    // Channel = non-digit characters before the first decimal number (balance)
    const channelBalanceMatch = rest.match(/^([^\d]+)([\d,]+\.\d{2})(.*)/s);
    if (!channelBalanceMatch) continue;

    const channel = channelBalanceMatch[1].trim();
    // channelBalanceMatch[2] is the running balance — we don't need it
    const afterBalance = channelBalanceMatch[3];

    // Find type keyword + amount at end of the block
    const typeAmountMatch = afterBalance.match(TYPE_AMOUNT_PATTERN);
    if (!typeAmountMatch) {
      warnings.push(
        `Could not extract type/amount: ${block.slice(0, 100)}`
      );
      continue;
    }

    const typeKeyword = typeAmountMatch[1] as KBankTypeKeyword;
    const amountStr = typeAmountMatch[2];
    const amount = parseAmount(amountStr);
    if (amount === null) continue;

    // Description = everything between balance and type keyword
    const typeStart = afterBalance.lastIndexOf(typeKeyword);
    const rawDescription = afterBalance.slice(0, typeStart);

    const { type, isWithdrawal } = mapTransactionType(typeKeyword);
    const description = cleanDescription(rawDescription, typeKeyword);
    const referenceMatch = rawDescription.match(/Ref (\S+)/);

    const transaction: ParsedStatementTransaction = {
      transactionDate,
      description: description || channel,
      amount: isWithdrawal ? Math.abs(amount) : -Math.abs(amount),
      currency: 'THB',
      type,
      category: detectCategory(rawDescription + ' ' + description),
      rawLine: block,
    };

    if (referenceMatch) {
      transaction.referenceNumber = referenceMatch[1];
    }

    transactions.push(transaction);
  }

  // Sort by date, then by position in statement (preserve original order for same date)
  transactions.sort(
    (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime()
  );

  return { transactions, warnings };
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

function calculateConfidence(result: StatementParseResult): number {
  let confidence = 0;

  // Base: identified as Kasikorn
  confidence += 20;

  if (result.period) confidence += 15;
  if (result.summary) confidence += 10;
  if (result.accountInfo) confidence += 5;

  if (result.transactions.length > 0) {
    confidence += 30;
    if (result.transactions.length >= 10) confidence += 10;

    const complete = result.transactions.filter(
      (t) => t.transactionDate && t.description && t.amount !== undefined
    );
    if (complete.length === result.transactions.length) confidence += 10;
  }

  return Math.min(confidence, 100);
}

// ---------------------------------------------------------------------------
// Parser export
// ---------------------------------------------------------------------------

export const kasikornParser: StatementParser = {
  key: 'kasikorn',
  name: 'Kasikorn Bank Statement Parser',
  defaultCurrency: 'THB',

  canParse(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      KASIKORN_SIMPLE_IDENTIFIERS.some((id) => lower.includes(id)) ||
      KASIKORN_REGEX_IDENTIFIERS.some((re) => re.test(text))
    );
  },

  parse(text: string, options?: ParseOptions): StatementParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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

    const period = parseStatementPeriod(text);
    if (!period) warnings.push('Could not extract statement period');

    const summary = parseSummary(text);
    const accountInfo = parseAccountInfo(text);

    const { transactions, warnings: txWarnings } = parseTransactions(
      text,
      period
    );
    warnings.push(...txWarnings);

    if (transactions.length === 0) {
      warnings.push('No transactions extracted from statement');
    }

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

    if (options?.includeRawText) result.rawText = text;
    result.confidence = calculateConfidence(result);

    return result;
  },
};

// Export helpers for testing
export {
  parseThaiDate,
  parseAmount,
  parseStatementPeriod,
  parseSummary,
  parseAccountInfo,
  parseTransactions,
  mapTransactionType,
  cleanDescription,
  detectCategory,
  calculateConfidence,
  KASIKORN_SIMPLE_IDENTIFIERS,
  KASIKORN_REGEX_IDENTIFIERS,
  TYPE_KEYWORDS,
  TYPE_AMOUNT_PATTERN,
};
