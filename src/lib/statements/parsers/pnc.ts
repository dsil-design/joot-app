/**
 * PNC Bank Statement Parser
 *
 * Parses PNC Bank checking/savings account statements.
 * Handles "Performance Select" and other PNC account types.
 *
 * Statement format characteristics:
 * - Header: "Performance Select Statement" or similar
 * - Period: "For the period MM/DD/YYYY to MM/DD/YYYY"
 * - Transactions grouped by category (Deposits, Withdrawals, Deductions)
 * - Format: Date Amount Description (date first, then amount, then description)
 */

import type { StatementParser, StatementParseResult, ParsedStatementTransaction } from './types';

/**
 * Detection patterns for PNC statements
 */
const PNC_IDENTIFIERS = [
  /PNC Bank/i,
  /Performance Select/i,
  /pnc\.com/i,
  /PNC Bank Online Banking/i,
  /Pittsburgh, PA 15230/i,
];

/**
 * Check if text is from a PNC statement
 */
export function isPNCStatement(text: string): boolean {
  let matches = 0;
  for (const pattern of PNC_IDENTIFIERS) {
    if (pattern.test(text)) {
      matches++;
      if (matches >= 2) return true;
    }
  }
  return false;
}

/**
 * Extract statement period from PNC statement
 */
function extractPeriod(text: string): { startDate: Date; endDate: Date } | undefined {
  // Pattern: "For the period MM/DD/YYYY to MM/DD/YYYY"
  const periodPattern = /For the period\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*to\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
  const match = text.match(periodPattern);

  if (match) {
    const startDate = parseDate(match[1]);
    const endDate = parseDate(match[2]);
    if (startDate && endDate) {
      return { startDate, endDate };
    }
  }

  return undefined;
}

/**
 * Parse date from MM/DD/YYYY or MM/DD format
 */
function parseDate(dateStr: string, year?: number): Date | null {
  // Full date: MM/DD/YYYY
  const fullMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fullMatch) {
    const month = parseInt(fullMatch[1], 10) - 1;
    const day = parseInt(fullMatch[2], 10);
    const yr = parseInt(fullMatch[3], 10);
    return new Date(yr, month, day);
  }

  // Short date: MM/DD (need year context)
  const shortMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (shortMatch && year) {
    const month = parseInt(shortMatch[1], 10) - 1;
    const day = parseInt(shortMatch[2], 10);
    return new Date(year, month, day);
  }

  return null;
}

/**
 * Parse amount from string (handles commas and decimals)
 */
function parseAmount(amountStr: string): number {
  // Remove commas and parse
  const cleaned = amountStr.replace(/,/g, '').replace(/\$/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Extract account number
 */
function extractAccountNumber(text: string): string | undefined {
  // Pattern: "Account number: XX-XXXX-5668" or "Primary account number: XX-XXXX-5668"
  const pattern = /(?:Primary )?account number:\s*([X\d-]+)/i;
  const match = text.match(pattern);
  return match ? match[1] : undefined;
}

/**
 * Determine transaction category based on description
 */
function categorizeTransaction(description: string): string | undefined {
  const lower = description.toLowerCase();

  if (/t-mobile|verizon|at&t|phone|mobile/i.test(lower)) return 'Utilities';
  if (/electric|gas|water|utility/i.test(lower)) return 'Utilities';
  if (/chase credit|amex|visa|mastercard|credit crd/i.test(lower)) return 'Credit Card Payment';
  if (/transfer|xfer/i.test(lower)) return 'Transfer';
  if (/vanguard|fidelity|schwab|investment|buy/i.test(lower)) return 'Investment';
  if (/interest payment/i.test(lower)) return 'Interest';
  if (/service charge|fee|monthly.*charge/i.test(lower)) return 'Fees';
  if (/moonpay|coinbase|crypto|uniswap/i.test(lower)) return 'Crypto';
  if (/payroll|salary|direct deposit/i.test(lower)) return 'Income';
  if (/atm|withdrawal|cash/i.test(lower)) return 'ATM';

  return undefined;
}

/**
 * Parse transactions from the Activity Detail section
 */
function parseTransactions(text: string, period?: { startDate: Date; endDate: Date }): ParsedStatementTransaction[] {
  const transactions: ParsedStatementTransaction[] = [];
  const year = period?.endDate.getFullYear() || new Date().getFullYear();

  // Split into lines and process
  const lines = text.split('\n');

  let currentSection: 'deposits' | 'withdrawals' | 'deductions' | 'other' | null = null;
  let inActivityDetail = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Only start parsing transactions after "Activity Detail" section
    // This avoids picking up summary tables that appear before the actual transactions
    if (/^Activity Detail$/i.test(line)) {
      inActivityDetail = true;
      currentSection = null; // Reset section, wait for next section header
      continue;
    }

    // Skip everything before Activity Detail
    if (!inActivityDetail) continue;

    // Stop at Daily Balance Detail or end of transactions
    if (/Daily Balance Detail/i.test(line)) break;
    if (/Daily Balance$/i.test(line)) break; // Some formats use just "Daily Balance"

    // Detect section headers (only after Activity Detail)
    if (/Deposits and Other Additions/i.test(line)) {
      currentSection = 'deposits';
      continue;
    }
    if (/Banking.*Debit Card Withdrawals/i.test(line)) {
      currentSection = 'withdrawals';
      continue;
    }
    if (/Online and Electronic Banking Deductions/i.test(line)) {
      currentSection = 'deductions';
      continue;
    }
    if (/(?:Other Deductions|Checks and Other Deductions)/i.test(line)) {
      currentSection = 'other';
      continue;
    }

    // Skip non-transaction lines
    if (!currentSection) continue;
    if (/^Page \d/i.test(line)) continue;
    if (/^There (?:was|were)/i.test(line)) continue;

    // Transaction pattern: Date Amount Description
    // Examples:
    // "12/04 .01 Interest Payment" - amount can start with decimal
    // "11/28 134.29 5090 Debit Card Purchase Moonpay*Uniswap"
    // "11/10 391.42 Web Pmt Recur- ACH Pmt Amex Epayment"
    // "12/0425.00 MonthlyService Charge" - no space in "Other Deductions" section
    // "12/011,000.00Online Transfer From XXXXX5668" - Spend accounts have no spaces at all

    // Standard pattern with spaces
    let txPattern = /^(\d{1,2}\/\d{1,2})\s+([\d,]*\.?\d+)\s+(.+)$/;
    let match = line.match(txPattern);

    // Try alternate pattern without spaces (used by Spend accounts and Other Deductions)
    if (!match) {
      txPattern = /^(\d{1,2}\/\d{1,2})([\d,]+\.\d{2})(.+)$/;
      match = line.match(txPattern);
    }

    if (match) {
      const dateStr = match[1];
      const amount = parseAmount(match[2]);
      let description = match[3].trim();

      // Sometimes description continues on next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        // If next line doesn't start with a date and isn't a section header
        if (!/^\d{1,2}\/\d{1,2}/.test(nextLine) &&
            !/Deposits|Withdrawals|Deductions|Daily Balance/i.test(nextLine) &&
            !/^There (?:was|were)/i.test(nextLine) &&
            !/^Page \d/i.test(nextLine) &&
            nextLine.length > 0 &&
            nextLine.length < 50) {
          description += ' ' + nextLine;
          i++; // Skip the continuation line
        }
      }

      const transactionDate = parseDate(dateStr, year);
      if (!transactionDate) continue;

      // Handle year boundary (if statement spans Dec/Jan)
      if (period && transactionDate > period.endDate) {
        transactionDate.setFullYear(transactionDate.getFullYear() - 1);
      }

      // Determine if it's a credit or debit
      const isCredit = currentSection === 'deposits';

      transactions.push({
        transactionDate,
        postingDate: transactionDate,
        description: cleanDescription(description),
        amount: isCredit ? amount : -amount,
        currency: 'USD',
        type: isCredit ? 'credit' : 'charge',
        category: categorizeTransaction(description),
      });
    }
  }

  return transactions;
}

/**
 * Clean up transaction description
 */
function cleanDescription(description: string): string {
  return description
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    // Remove common noise
    .replace(/\s*-\s*$/, '')
    .replace(/^[\d]+\s+/, '') // Remove leading numbers like "5090"
    .replace(/XXXXXXXXXXX\d+/g, 'XXXX') // Shorten masked account numbers
    .replace(/X{4,}/g, 'XXXX')
    .trim();
}

/**
 * Extract account summary
 */
function extractSummary(text: string): {
  beginningBalance?: number;
  endingBalance?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
} {
  const summary: {
    beginningBalance?: number;
    endingBalance?: number;
    totalDeposits?: number;
    totalWithdrawals?: number;
  } = {};

  // Beginning balance
  const beginMatch = text.match(/Beginning\s*balance\s*[\n\r]*([\d,]+\.\d{2})/i);
  if (beginMatch) {
    summary.beginningBalance = parseAmount(beginMatch[1]);
  }

  // Ending balance
  const endMatch = text.match(/Ending\s*balance\s*[\n\r]*([\d,]+\.\d{2})/i);
  if (endMatch) {
    summary.endingBalance = parseAmount(endMatch[1]);
  }

  // Deposits and other additions
  const depositMatch = text.match(/Deposits and\s*other additions\s*[\n\r]*([\d,]+\.\d{2})/i);
  if (depositMatch) {
    summary.totalDeposits = parseAmount(depositMatch[1]);
  }

  // Checks and other deductions
  const deductMatch = text.match(/Checks and other\s*deductions\s*[\n\r]*([\d,]+\.\d{2})/i);
  if (deductMatch) {
    summary.totalWithdrawals = parseAmount(deductMatch[1]);
  }

  return summary;
}

/**
 * PNC Statement Parser implementation
 */
export const pncParser: StatementParser = {
  name: 'PNC Bank',
  key: 'pnc',
  defaultCurrency: 'USD',

  canParse(text: string): boolean {
    return isPNCStatement(text);
  },

  parse(text: string): StatementParseResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Extract period
    const period = extractPeriod(text);
    if (!period) {
      warnings.push('Could not extract statement period');
    }

    // Extract account number
    const accountNumber = extractAccountNumber(text);

    // Parse transactions
    const transactions = parseTransactions(text, period);

    // Extract summary
    const summary = extractSummary(text);

    // Estimate page count
    const pageMatches = text.match(/Page \d+ of (\d+)/gi);
    const pageCount = pageMatches ? Math.max(...pageMatches.map(m => {
      const num = m.match(/of (\d+)/i);
      return num ? parseInt(num[1], 10) : 1;
    })) : 1;

    // Calculate confidence
    let confidence = 50;
    if (period) confidence += 20;
    if (transactions.length > 0) confidence += 20;
    if (summary.beginningBalance !== undefined) confidence += 10;

    return {
      success: true,
      parserKey: 'pnc',
      pageCount,
      confidence,
      period,
      transactions,
      summary: {
        previousBalance: summary.beginningBalance,
        newBalance: summary.endingBalance,
      },
      accountInfo: {
        accountNumber,
      },
      warnings,
      errors,
    };
  },
};

export default pncParser;
