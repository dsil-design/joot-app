/**
 * Tests for Bangkok Bank Statement Parser
 */

import {
  bangkokBankParser,
  parseThaiDate,
  parseShortDate,
  parseAmount,
  parseStatementPeriod,
  parseSummary,
  parseAccountInfo,
  parseTransactions,
  determineTransactionType,
  detectCategory,
  calculateConfidence,
  BANGKOK_BANK_IDENTIFIERS,
  THAI_MONTH_NAMES,
} from '@/lib/statements/parsers/bangkok-bank';

// Sample Bangkok Bank statement text for testing
const SAMPLE_BBL_STATEMENT = `
ธนาคารกรุงเทพ
Bangkok Bank
บัตรเครดิต บัวหลวง Platinum

เลขที่บัญชี: 4532-1234-5678-9012
ชื่อผู้ถือบัตร: SOMCHAI JAIDEE

งวดบัญชี: 01/12/2024 - 31/12/2024
วันครบกำหนดชำระ: 15/01/2025

ยอดยกมา                           5,000.00
รวมใช้จ่าย                         3,450.50
รวมชำระ                          -2,000.00
ยอดที่ต้องชำระ                     6,450.50
ยอดชำระขั้นต่ำ                       645.05

รายการใช้จ่าย

01/12/24  STARBUCKS SIAM PARAGON            150.00      -
05/12/24  GRAB TAXI                          85.50      -
10/12/24  LAZADA MARKETPLACE              1,200.00      -
15/12/24  7-ELEVEN SUKHUMVIT                 45.00      -
20/12/24  CENTRAL DEPARTMENT               750.00      -
25/12/24  TOPS SUPERMARKET                  320.00      -
28/12/24  FOODPANDA ORDER                   180.00      -
30/12/24  BTS RABBIT CARD                   200.00      -
31/12/24  TRUE INTERNET                     520.00      -

รายการชำระ

15/12/24  ONLINE PAYMENT                       -     2,000.00
`;

const SAMPLE_BBL_THAI_DATES = `
Bangkok Bank
บัตรเครดิต

รอบบัญชี 1 - 31 ธ.ค. 2567

รายการใช้จ่าย

15 ธ.ค. 67  ร้านกาแฟ สตาร์บัคส์             150.00      -
20 ธ.ค. 67  แกร็บ แท็กซี่                     85.50      -
`;

const SAMPLE_BBL_ENGLISH = `
BANGKOK BANK PUBLIC COMPANY LIMITED
Credit Card Statement

Account Number: 4532-1234-5678-9012
Statement Period: 01/11/2024 - 30/11/2024

TRANSACTION DETAILS

01/11/24  AMAZON PRIME                      299.00      -
05/11/24  NETFLIX SUBSCRIPTION              289.00      -
10/11/24  SHOPEE PURCHASE                   450.00      -
`;

const SAMPLE_BBL_CREDITS = `
Bangkok Bank
Bualuang Card

Statement Period: 01/10/2024 - 31/10/2024

Transactions

01/10/24  PURCHASE AT CENTRAL              500.00      -
05/10/24  REFUND FROM CENTRAL                  -     500.00
10/10/24  PAYMENT - THANK YOU                  -   1,000.00
`;

describe('Bangkok Bank Statement Parser', () => {
  describe('canParse', () => {
    it('should recognize Bangkok Bank statements (English)', () => {
      expect(bangkokBankParser.canParse('Bangkok Bank Statement')).toBe(true);
    });

    it('should recognize Bangkok Bank statements (Thai)', () => {
      expect(bangkokBankParser.canParse('ธนาคารกรุงเทพ')).toBe(true);
    });

    it('should recognize Bualuang statements', () => {
      expect(bangkokBankParser.canParse('Bualuang Credit Card')).toBe(true);
      expect(bangkokBankParser.canParse('บัวหลวง')).toBe(true);
    });

    it('should recognize BBL statements', () => {
      expect(bangkokBankParser.canParse('BBL Credit Card Statement')).toBe(true);
    });

    it('should recognize bangkokbank.com references', () => {
      expect(bangkokBankParser.canParse('Visit bangkokbank.com')).toBe(true);
    });

    it('should recognize บัตรเครดิต', () => {
      expect(bangkokBankParser.canParse('บัตรเครดิต ธนาคาร')).toBe(true);
    });

    it('should not match non-Bangkok Bank statements', () => {
      expect(bangkokBankParser.canParse('Kasikorn Bank Statement')).toBe(false);
      expect(bangkokBankParser.canParse('Chase Sapphire Reserve Statement')).toBe(false);
      expect(bangkokBankParser.canParse('Random document text')).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      expect(bangkokBankParser.canParse('BANGKOK BANK')).toBe(true);
      expect(bangkokBankParser.canParse('bangkok bank')).toBe(true);
      expect(bangkokBankParser.canParse('BaNgKoK bAnK')).toBe(true);
    });
  });

  describe('parseThaiDate', () => {
    it('should parse DD/MM/YY format', () => {
      const date = parseThaiDate('15/12/24');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(11); // December (0-indexed)
      expect(date!.getDate()).toBe(15);
    });

    it('should parse DD/MM/YYYY format', () => {
      const date = parseThaiDate('01/01/2025');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(0); // January
      expect(date!.getDate()).toBe(1);
    });

    it('should handle Buddhist Era year (2-digit)', () => {
      // 67 BE = 2024 CE (67 + 2500 - 543 = 2024)
      const date = parseThaiDate('15/12/67');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should handle Buddhist Era year (4-digit)', () => {
      // 2567 BE = 2024 CE
      const date = parseThaiDate('15/12/2567');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should handle single-digit day and month', () => {
      const date = parseThaiDate('1/1/24');
      expect(date).not.toBeNull();
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(1);
    });

    it('should return null for invalid dates', () => {
      expect(parseThaiDate('invalid')).toBeNull();
      expect(parseThaiDate('32/13/24')).toBeNull();
    });
  });

  describe('parseShortDate', () => {
    it('should parse DD/MM format with reference date', () => {
      const refDate = new Date(2024, 11, 31); // Dec 31, 2024
      const date = parseShortDate('15/12', refDate);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(11);
      expect(date!.getDate()).toBe(15);
    });

    it('should handle year boundary correctly', () => {
      const refDate = new Date(2024, 0, 15); // Jan 15, 2024
      const date = parseShortDate('15/12', refDate);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2023); // Should be previous year
    });
  });

  describe('parseAmount', () => {
    it('should parse amounts with comma separators', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56);
    });

    it('should parse amounts without separators', () => {
      expect(parseAmount('123.45')).toBe(123.45);
    });

    it('should parse large amounts', () => {
      expect(parseAmount('1,234,567.89')).toBe(1234567.89);
    });

    it('should return null for invalid amounts', () => {
      expect(parseAmount('invalid')).toBeNull();
      expect(parseAmount('')).toBeNull();
    });
  });

  describe('determineTransactionType', () => {
    it('should identify payments', () => {
      expect(determineTransactionType('ONLINE PAYMENT', true)).toBe('payment');
      expect(determineTransactionType('ชำระเงิน', true)).toBe('payment');
    });

    it('should identify interest charges', () => {
      expect(determineTransactionType('INTEREST CHARGE', false)).toBe('interest');
      expect(determineTransactionType('ดอกเบี้ย', false)).toBe('interest');
    });

    it('should identify fees', () => {
      expect(determineTransactionType('ANNUAL FEE', false)).toBe('fee');
      expect(determineTransactionType('ค่าธรรมเนียม', false)).toBe('fee');
    });

    it('should identify credits/refunds', () => {
      expect(determineTransactionType('REFUND FROM STORE', true)).toBe('credit');
      expect(determineTransactionType('คืนเงิน', true)).toBe('credit');
    });

    it('should default to charge for regular purchases', () => {
      expect(determineTransactionType('STARBUCKS PURCHASE', false)).toBe('charge');
    });
  });

  describe('detectCategory', () => {
    it('should detect Travel category', () => {
      expect(detectCategory('THAI AIRWAYS BOOKING')).toBe('Travel');
      expect(detectCategory('AIRASIA TICKET')).toBe('Travel');
      expect(detectCategory('AGODA HOTEL BOOKING')).toBe('Travel');
    });

    it('should detect Dining category', () => {
      expect(detectCategory('STARBUCKS COFFEE')).toBe('Dining');
      expect(detectCategory('GRAB FOOD ORDER')).toBe('Dining');
      expect(detectCategory('ร้านอาหาร')).toBe('Dining');
    });

    it('should detect Transportation category', () => {
      expect(detectCategory('GRAB TAXI')).toBe('Transportation');
      expect(detectCategory('BTS RABBIT CARD')).toBe('Transportation');
      expect(detectCategory('SHELL GAS STATION')).toBe('Transportation');
    });

    it('should detect Shopping category', () => {
      expect(detectCategory('LAZADA MARKETPLACE')).toBe('Shopping');
      expect(detectCategory('SHOPEE PURCHASE')).toBe('Shopping');
      expect(detectCategory('CENTRAL DEPARTMENT')).toBe('Shopping');
    });

    it('should detect Groceries category', () => {
      expect(detectCategory('TOPS SUPERMARKET')).toBe('Groceries');
      expect(detectCategory('TESCO LOTUS')).toBe('Groceries');
      expect(detectCategory('7-ELEVEN STORE')).toBe('Groceries');
    });

    it('should detect Entertainment category', () => {
      expect(detectCategory('NETFLIX SUBSCRIPTION')).toBe('Entertainment');
      expect(detectCategory('SPOTIFY PREMIUM')).toBe('Entertainment');
      expect(detectCategory('MAJOR CINEPLEX')).toBe('Entertainment');
    });

    it('should detect Utilities category', () => {
      expect(detectCategory('TRUE INTERNET')).toBe('Utilities');
      expect(detectCategory('ไฟฟ้า กรุงเทพ')).toBe('Utilities');
      expect(detectCategory('AIS MOBILE')).toBe('Utilities');
    });

    it('should return undefined for unknown categories', () => {
      expect(detectCategory('RANDOM MERCHANT')).toBeUndefined();
    });
  });

  describe('parseStatementPeriod', () => {
    it('should parse DD/MM/YYYY - DD/MM/YYYY format', () => {
      const text = 'งวดบัญชี: 01/12/2024 - 31/12/2024';
      const period = parseStatementPeriod(text);
      expect(period).not.toBeUndefined();
      expect(period!.startDate.getDate()).toBe(1);
      expect(period!.startDate.getMonth()).toBe(11);
      expect(period!.endDate.getDate()).toBe(31);
      expect(period!.endDate.getMonth()).toBe(11);
    });

    it('should parse statement period with due date', () => {
      const text = `
        Statement Period: 01/11/2024 - 30/11/2024
        Due Date: 15/12/2024
      `;
      const period = parseStatementPeriod(text);
      expect(period).not.toBeUndefined();
      expect(period!.dueDate).not.toBeUndefined();
      expect(period!.dueDate!.getDate()).toBe(15);
      expect(period!.dueDate!.getMonth()).toBe(11);
    });

    it('should parse From/To format', () => {
      const text = 'From 01/10/2024 To 31/10/2024';
      const period = parseStatementPeriod(text);
      expect(period).not.toBeUndefined();
      expect(period!.startDate.getMonth()).toBe(9);
      expect(period!.endDate.getMonth()).toBe(9);
    });
  });

  describe('parseSummary', () => {
    it('should parse previous balance', () => {
      const text = 'ยอดยกมา 5,000.00';
      const summary = parseSummary(text);
      expect(summary).not.toBeUndefined();
      expect(summary!.previousBalance).toBe(5000);
    });

    it('should parse new balance', () => {
      const text = 'ยอดที่ต้องชำระ 6,450.50';
      const summary = parseSummary(text);
      expect(summary).not.toBeUndefined();
      expect(summary!.newBalance).toBe(6450.5);
    });

    it('should parse minimum payment', () => {
      const text = 'ยอดชำระขั้นต่ำ 645.05';
      const summary = parseSummary(text);
      expect(summary).not.toBeUndefined();
      expect(summary!.minimumPayment).toBe(645.05);
    });

    it('should parse multiple summary fields', () => {
      const text = `
        Previous Balance: 5,000.00
        Total Charges: 3,450.50
        Total Credits: 2,000.00
        New Balance: 6,450.50
        Minimum Payment: 645.05
      `;
      const summary = parseSummary(text);
      expect(summary).not.toBeUndefined();
      expect(summary!.previousBalance).toBe(5000);
      expect(summary!.newBalance).toBe(6450.5);
      expect(summary!.minimumPayment).toBe(645.05);
    });
  });

  describe('parseAccountInfo', () => {
    it('should parse account number', () => {
      const text = 'เลขที่บัญชี: 4532-1234-5678-9012';
      const info = parseAccountInfo(text);
      expect(info).not.toBeUndefined();
      expect(info!.accountNumber).toBe('4532123456789012');
    });

    it('should parse masked account number', () => {
      const text = 'Account ending: xxxx-xxxx-xxxx-9012';
      const info = parseAccountInfo(text);
      expect(info).not.toBeUndefined();
      expect(info!.accountNumber).toContain('9012');
    });

    it('should detect card type - Platinum', () => {
      const text = 'Bangkok Bank Platinum Card';
      const info = parseAccountInfo(text);
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Bangkok Bank Platinum');
    });

    it('should detect card type - Titanium', () => {
      const text = 'Bangkok Bank Titanium Card';
      const info = parseAccountInfo(text);
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Bangkok Bank Titanium');
    });

    it('should detect Bualuang card', () => {
      const text = 'บัตรบัวหลวง';
      const info = parseAccountInfo(text);
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Bualuang Credit Card');
    });
  });

  describe('parseTransactions', () => {
    it('should parse transactions from statement', () => {
      const period = {
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2024, 11, 31),
      };
      const { transactions } = parseTransactions(SAMPLE_BBL_STATEMENT, period);
      expect(transactions.length).toBeGreaterThan(0);
    });

    it('should correctly identify debit transactions', () => {
      const text = `
        Bangkok Bank
        01/12/24  STARBUCKS PURCHASE            150.00      -
      `;
      const { transactions } = parseTransactions(text, undefined);
      const debit = transactions.find((t) => t.description.includes('STARBUCKS'));
      expect(debit).not.toBeUndefined();
      expect(debit!.amount).toBeGreaterThan(0);
      expect(debit!.type).toBe('charge');
    });

    it('should correctly identify credit transactions', () => {
      const text = `
        Bangkok Bank
        01/12/24  REFUND FROM STORE                -     500.00
      `;
      const { transactions } = parseTransactions(text, undefined);
      const credit = transactions.find((t) => t.description.includes('REFUND'));
      expect(credit).not.toBeUndefined();
      expect(credit!.amount).toBeLessThan(0);
      expect(credit!.type).toBe('credit');
    });

    it('should set currency to THB', () => {
      const { transactions } = parseTransactions(SAMPLE_BBL_STATEMENT, undefined);
      transactions.forEach((t) => {
        expect(t.currency).toBe('THB');
      });
    });

    it('should sort transactions by date', () => {
      const { transactions } = parseTransactions(SAMPLE_BBL_STATEMENT, undefined);
      for (let i = 1; i < transactions.length; i++) {
        expect(transactions[i].transactionDate.getTime()).toBeGreaterThanOrEqual(
          transactions[i - 1].transactionDate.getTime()
        );
      }
    });

    it('should detect categories for transactions', () => {
      const text = `
        Bangkok Bank
        01/12/24  STARBUCKS SIAM                150.00      -
        02/12/24  GRAB TAXI                      85.00      -
        03/12/24  LAZADA MARKETPLACE            500.00      -
      `;
      const { transactions } = parseTransactions(text, undefined);
      const starbucks = transactions.find((t) => t.description.includes('STARBUCKS'));
      const grab = transactions.find((t) => t.description.includes('GRAB'));
      const lazada = transactions.find((t) => t.description.includes('LAZADA'));

      expect(starbucks?.category).toBe('Dining');
      expect(grab?.category).toBe('Transportation');
      expect(lazada?.category).toBe('Shopping');
    });

    it('should include raw line for debugging', () => {
      const { transactions } = parseTransactions(SAMPLE_BBL_STATEMENT, undefined);
      transactions.forEach((t) => {
        expect(t.rawLine).not.toBeUndefined();
      });
    });
  });

  describe('calculateConfidence', () => {
    it('should return base confidence for Bangkok Bank identifier', () => {
      const result = {
        success: true,
        parserKey: 'bangkok-bank',
        transactions: [],
        errors: [],
        warnings: [],
        confidence: 0,
      };
      expect(calculateConfidence(result)).toBe(20);
    });

    it('should increase confidence with period', () => {
      const result = {
        success: true,
        parserKey: 'bangkok-bank',
        period: {
          startDate: new Date(),
          endDate: new Date(),
        },
        transactions: [],
        errors: [],
        warnings: [],
        confidence: 0,
      };
      expect(calculateConfidence(result)).toBe(35); // 20 + 15
    });

    it('should increase confidence with transactions', () => {
      const result = {
        success: true,
        parserKey: 'bangkok-bank',
        transactions: [
          {
            transactionDate: new Date(),
            description: 'Test',
            amount: 100,
            currency: 'THB',
            type: 'charge' as const,
          },
        ],
        errors: [],
        warnings: [],
        confidence: 0,
      };
      expect(calculateConfidence(result)).toBeGreaterThan(50);
    });

    it('should cap confidence at 100', () => {
      const result = {
        success: true,
        parserKey: 'bangkok-bank',
        period: { startDate: new Date(), endDate: new Date() },
        summary: { previousBalance: 1000, newBalance: 2000 },
        accountInfo: { accountNumber: '1234' },
        transactions: Array(20).fill({
          transactionDate: new Date(),
          description: 'Test Transaction',
          amount: 100,
          currency: 'THB',
          type: 'charge' as const,
        }),
        errors: [],
        warnings: [],
        confidence: 0,
      };
      expect(calculateConfidence(result)).toBe(100);
    });
  });

  describe('parse (full parser)', () => {
    it('should successfully parse a Bangkok Bank statement', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_STATEMENT);
      expect(result.success).toBe(true);
      expect(result.parserKey).toBe('bangkok-bank');
      expect(result.transactions.length).toBeGreaterThan(0);
    });

    it('should extract statement period', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_STATEMENT);
      expect(result.period).not.toBeUndefined();
      expect(result.period!.startDate).toBeInstanceOf(Date);
      expect(result.period!.endDate).toBeInstanceOf(Date);
    });

    it('should extract summary', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_STATEMENT);
      expect(result.summary).not.toBeUndefined();
    });

    it('should extract account info', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_STATEMENT);
      expect(result.accountInfo).not.toBeUndefined();
      expect(result.accountInfo!.accountNumber).toBeDefined();
    });

    it('should have high confidence for complete statement', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_STATEMENT);
      expect(result.confidence).toBeGreaterThan(60);
    });

    it('should fail for non-Bangkok Bank statements', () => {
      const result = bangkokBankParser.parse('Some random text');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include raw text when option is set', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_STATEMENT, { includeRawText: true });
      expect(result.rawText).toBeDefined();
      expect(result.rawText).toBe(SAMPLE_BBL_STATEMENT);
    });

    it('should handle English format statement', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_ENGLISH);
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBeGreaterThan(0);
    });

    it('should handle credit transactions correctly', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_CREDITS);
      expect(result.success).toBe(true);

      const refund = result.transactions.find((t) => t.description.includes('REFUND'));
      expect(refund).not.toBeUndefined();
      expect(refund!.amount).toBeLessThan(0);
      expect(refund!.type).toBe('credit');

      const payment = result.transactions.find((t) => t.description.includes('PAYMENT'));
      expect(payment).not.toBeUndefined();
      expect(payment!.amount).toBeLessThan(0);
      expect(payment!.type).toBe('payment');
    });

    it('should estimate page count from text length', () => {
      const result = bangkokBankParser.parse(SAMPLE_BBL_STATEMENT);
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parser properties', () => {
    it('should have correct key', () => {
      expect(bangkokBankParser.key).toBe('bangkok-bank');
    });

    it('should have correct name', () => {
      expect(bangkokBankParser.name).toBe('Bangkok Bank Statement Parser');
    });

    it('should have THB as default currency', () => {
      expect(bangkokBankParser.defaultCurrency).toBe('THB');
    });
  });

  describe('constants', () => {
    it('should have all Thai month names defined', () => {
      expect(Object.keys(THAI_MONTH_NAMES).length).toBeGreaterThan(20);
      expect(THAI_MONTH_NAMES['ม.ค.']).toBe(0);
      expect(THAI_MONTH_NAMES['ธ.ค.']).toBe(11);
    });

    it('should have Bangkok Bank identifiers', () => {
      expect(BANGKOK_BANK_IDENTIFIERS.length).toBeGreaterThan(5);
      expect(BANGKOK_BANK_IDENTIFIERS).toContain('bangkok bank');
      expect(BANGKOK_BANK_IDENTIFIERS).toContain('ธนาคารกรุงเทพ');
    });
  });
});
