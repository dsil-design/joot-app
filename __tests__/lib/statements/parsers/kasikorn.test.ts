/**
 * Kasikorn Bank Statement Parser Tests
 */

import {
  kasikornParser,
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
} from '@/lib/statements/parsers/kasikorn';
import type { StatementParseResult } from '@/lib/statements/parsers/types';

describe('Kasikorn Bank Statement Parser', () => {
  describe('canParse', () => {
    it('should detect Kasikorn Bank statements by English name', () => {
      expect(kasikornParser.canParse('KASIKORNBANK Statement')).toBe(true);
      expect(kasikornParser.canParse('Kasikorn Bank Public Company Limited')).toBe(true);
    });

    it('should detect Kasikorn Bank statements by Thai name', () => {
      expect(kasikornParser.canParse('ธนาคารกสิกรไทย')).toBe(true);
      expect(kasikornParser.canParse('บัตรเครดิตกสิกร')).toBe(true);
      expect(kasikornParser.canParse('เคแบงก์')).toBe(true);
    });

    it('should detect K Bank and K PLUS references', () => {
      expect(kasikornParser.canParse('KBank Statement')).toBe(true);
      expect(kasikornParser.canParse('K PLUS Transaction History')).toBe(true);
      expect(kasikornParser.canParse('K+ Mobile Banking')).toBe(true);
      expect(kasikornParser.canParse('K-Bank Credit Card')).toBe(true);
    });

    it('should detect THE WISDOM card', () => {
      expect(kasikornParser.canParse('THE WISDOM Credit Card Statement')).toBe(true);
    });

    it('should not detect non-Kasikorn statements', () => {
      expect(kasikornParser.canParse('Bangkok Bank Statement')).toBe(false);
      expect(kasikornParser.canParse('Chase Sapphire Statement')).toBe(false);
      expect(kasikornParser.canParse('Random text without bank info')).toBe(false);
    });
  });

  describe('parseThaiDate', () => {
    it('should parse DD/MM/YYYY format', () => {
      const date = parseThaiDate('15/12/2024');
      expect(date).not.toBeNull();
      expect(date!.getDate()).toBe(15);
      expect(date!.getMonth()).toBe(11); // December = 11
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should parse DD/MM/YY format (recent year)', () => {
      const date = parseThaiDate('15/12/24');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should parse DD-MM-YYYY format', () => {
      const date = parseThaiDate('15-12-2024');
      expect(date).not.toBeNull();
      expect(date!.getDate()).toBe(15);
      expect(date!.getMonth()).toBe(11);
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should handle Buddhist Era 2-digit years', () => {
      // 67 in BE = 2024 CE (2567 - 543 = 2024)
      const date = parseThaiDate('15/12/67');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should handle full Buddhist Era years', () => {
      const date = parseThaiDate('15/12/2567');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should parse Thai abbreviated month format', () => {
      const date = parseThaiDate('15 ธ.ค. 67');
      expect(date).not.toBeNull();
      expect(date!.getDate()).toBe(15);
      expect(date!.getMonth()).toBe(11); // December
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should return null for invalid dates', () => {
      expect(parseThaiDate('invalid')).toBeNull();
      expect(parseThaiDate('32/13/2024')).toBeNull();
    });
  });

  describe('parseAmount', () => {
    it('should parse standard amount format', () => {
      expect(parseAmount('1234.56')).toBe(1234.56);
    });

    it('should parse amount with commas', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56);
      expect(parseAmount('12,345,678.90')).toBe(12345678.90);
    });

    it('should handle amounts in text context', () => {
      expect(parseAmount('Total: 1,234.56 THB')).toBe(1234.56);
    });

    it('should return null for invalid amounts', () => {
      expect(parseAmount('not a number')).toBeNull();
      expect(parseAmount('')).toBeNull();
    });
  });

  describe('determineTransactionType', () => {
    it('should detect payment transactions', () => {
      expect(determineTransactionType('Payment Thank You', false)).toBe('payment');
      expect(determineTransactionType('ชำระเงิน', false)).toBe('payment');
      expect(determineTransactionType('Payment Received', false)).toBe('payment');
    });

    it('should detect interest charges', () => {
      expect(determineTransactionType('Interest Charge', false)).toBe('interest');
      expect(determineTransactionType('ดอกเบี้ย', false)).toBe('interest');
      expect(determineTransactionType('Finance Charge', false)).toBe('interest');
    });

    it('should detect fees', () => {
      expect(determineTransactionType('Annual Fee', false)).toBe('fee');
      expect(determineTransactionType('ค่าธรรมเนียม', false)).toBe('fee');
      expect(determineTransactionType('Late Payment Fee', false)).toBe('fee');
      expect(determineTransactionType('SMS Alert Fee', false)).toBe('fee');
    });

    it('should detect adjustments', () => {
      expect(determineTransactionType('Adjustment', false)).toBe('adjustment');
      expect(determineTransactionType('ปรับปรุงยอด', false)).toBe('adjustment');
      expect(determineTransactionType('Transaction Reversal', false)).toBe('adjustment');
      expect(determineTransactionType('ยกเลิกรายการ', false)).toBe('adjustment');
    });

    it('should detect credits', () => {
      expect(determineTransactionType('Refund', false)).toBe('credit');
      expect(determineTransactionType('คืนเงิน', false)).toBe('credit');
      expect(determineTransactionType('Cashback Reward', false)).toBe('credit');
      expect(determineTransactionType('Some merchant', true)).toBe('credit');
    });

    it('should default to charge for regular transactions', () => {
      expect(determineTransactionType('STARBUCKS BANGKOK', false)).toBe('charge');
      expect(determineTransactionType('GRAB* BANGKOK TH', false)).toBe('charge');
    });
  });

  describe('detectCategory', () => {
    it('should detect Travel category', () => {
      expect(detectCategory('THAI AIRWAYS')).toBe('Travel');
      expect(detectCategory('AIRASIA BKK')).toBe('Travel');
      expect(detectCategory('AGODA HOTEL')).toBe('Travel');
      expect(detectCategory('การบินไทย')).toBe('Travel');
    });

    it('should detect Dining category', () => {
      expect(detectCategory('STARBUCKS COFFEE')).toBe('Dining');
      expect(detectCategory('KFC BANGKOK')).toBe('Dining');
      expect(detectCategory('GRABFOOD')).toBe('Dining');
      expect(detectCategory('ร้านอาหาร')).toBe('Dining');
    });

    it('should detect Transportation category', () => {
      expect(detectCategory('GRAB RIDE')).toBe('Transportation');
      expect(detectCategory('BOLT BANGKOK')).toBe('Transportation');
      expect(detectCategory('PTT GAS STATION')).toBe('Transportation');
      expect(detectCategory('BTS SKYTRAIN')).toBe('Transportation');
    });

    it('should detect Shopping category', () => {
      expect(detectCategory('LAZADA')).toBe('Shopping');
      expect(detectCategory('SHOPEE')).toBe('Shopping');
      expect(detectCategory('CENTRAL WORLD')).toBe('Shopping');
      expect(detectCategory('UNIQLO')).toBe('Shopping');
    });

    it('should detect Groceries category', () => {
      expect(detectCategory('BIG C SUPERCENTER')).toBe('Groceries');
      expect(detectCategory('TESCO LOTUS')).toBe('Groceries');
      expect(detectCategory('7-ELEVEN')).toBe('Groceries');
      expect(detectCategory('MAKRO')).toBe('Groceries');
    });

    it('should detect Healthcare category', () => {
      expect(detectCategory('BUMRUNGRAD HOSPITAL')).toBe('Healthcare');
      expect(detectCategory('โรงพยาบาล')).toBe('Healthcare');
      expect(detectCategory('BOOTS PHARMACY')).toBe('Healthcare');
      expect(detectCategory('WATSONS')).toBe('Healthcare');
    });

    it('should detect Utilities category', () => {
      expect(detectCategory('TRUE INTERNET')).toBe('Utilities');
      expect(detectCategory('AIS MOBILE')).toBe('Utilities');
      expect(detectCategory('ไฟฟ้า')).toBe('Utilities');
      expect(detectCategory('3BB FIBER')).toBe('Utilities');
    });

    it('should detect Entertainment category', () => {
      expect(detectCategory('NETFLIX')).toBe('Entertainment');
      expect(detectCategory('SPOTIFY')).toBe('Entertainment');
      expect(detectCategory('MAJOR CINEPLEX')).toBe('Entertainment');
      expect(detectCategory('STEAM GAMES')).toBe('Entertainment');
    });

    it('should detect Education category', () => {
      expect(detectCategory('UDEMY')).toBe('Education');
      expect(detectCategory('มหาวิทยาลัย')).toBe('Education');
      expect(detectCategory('INTERNATIONAL SCHOOL')).toBe('Education');
    });

    it('should return undefined for unknown categories', () => {
      expect(detectCategory('RANDOM MERCHANT')).toBeUndefined();
    });
  });

  describe('parseStatementPeriod', () => {
    it('should parse standard date range format', () => {
      const text = 'Statement Period: 01/12/2024 - 31/12/2024';
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.startDate.getDate()).toBe(1);
      expect(period!.startDate.getMonth()).toBe(11);
      expect(period!.endDate.getDate()).toBe(31);
    });

    it('should parse Thai period format', () => {
      const text = 'งวดบัญชี: 01/12/2567 - 31/12/2567';
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.startDate.getFullYear()).toBe(2024);
    });

    it('should parse From/To format', () => {
      const text = 'From 01/11/2024 To 30/11/2024';
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.startDate.getMonth()).toBe(10); // November
      expect(period!.endDate.getMonth()).toBe(10);
    });

    it('should extract due date when available', () => {
      const text = `
        Statement Period: 01/12/2024 - 31/12/2024
        Due Date: 15/01/2025
      `;
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.dueDate).not.toBeUndefined();
      expect(period!.dueDate!.getDate()).toBe(15);
      expect(period!.dueDate!.getMonth()).toBe(0); // January
    });

    it('should return undefined when period not found', () => {
      expect(parseStatementPeriod('No period here')).toBeUndefined();
    });
  });

  describe('parseSummary', () => {
    it('should extract previous balance', () => {
      const text = 'Previous Balance: 5,000.00';
      const summary = parseSummary(text);

      expect(summary).not.toBeUndefined();
      expect(summary!.previousBalance).toBe(5000);
    });

    it('should extract new balance', () => {
      const text = 'New Balance: 7,500.50';
      const summary = parseSummary(text);

      expect(summary).not.toBeUndefined();
      expect(summary!.newBalance).toBe(7500.50);
    });

    it('should extract minimum payment', () => {
      const text = 'Minimum Payment: 500.00';
      const summary = parseSummary(text);

      expect(summary).not.toBeUndefined();
      expect(summary!.minimumPayment).toBe(500);
    });

    it('should extract credit limit', () => {
      const text = 'Credit Limit: 100,000.00';
      const summary = parseSummary(text);

      expect(summary).not.toBeUndefined();
      expect(summary!.creditLimit).toBe(100000);
    });

    it('should extract Thai-labeled values', () => {
      const text = 'ยอดรวม: 15,000.00 ยอดชำระขั้นต่ำ: 1,500.00';
      const summary = parseSummary(text);

      expect(summary).not.toBeUndefined();
      expect(summary!.newBalance).toBe(15000);
      expect(summary!.minimumPayment).toBe(1500);
    });

    it('should return undefined when no summary found', () => {
      expect(parseSummary('No summary here')).toBeUndefined();
    });
  });

  describe('parseAccountInfo', () => {
    it('should extract masked account number', () => {
      const text = 'Card: xxxx-xxxx-xxxx-1234';
      const info = parseAccountInfo(text);

      expect(info).not.toBeUndefined();
      expect(info!.accountNumber).toContain('1234');
    });

    it('should extract account number with asterisks', () => {
      const text = 'Card Number: ****-****-****-5678';
      const info = parseAccountInfo(text);

      expect(info).not.toBeUndefined();
      expect(info!.accountNumber).toContain('5678');
    });

    it('should detect THE WISDOM card type', () => {
      const text = 'THE WISDOM Infinite Card';
      const info = parseAccountInfo(text);

      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Kasikorn THE WISDOM');
    });

    it('should detect Platinum card type', () => {
      const text = 'Kasikorn Platinum Card Statement';
      const info = parseAccountInfo(text);

      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Kasikorn Platinum');
    });

    it('should detect Titanium card type', () => {
      const text = 'มาสเตอร์การ์ดไทเทเนียม';
      const info = parseAccountInfo(text);

      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Kasikorn Titanium');
    });

    it('should detect Beyond card type', () => {
      const text = 'K Bank Beyond Card';
      const info = parseAccountInfo(text);

      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Kasikorn Beyond');
    });

    it('should detect Signature card type', () => {
      const text = 'Kasikorn Signature Credit Card';
      const info = parseAccountInfo(text);

      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Kasikorn Signature');
    });
  });

  describe('parseTransactions', () => {
    it('should parse transactions with standard format', () => {
      const text = `
        15/12/2024  STARBUCKS CENTRAL WORLD          250.00  -
        16/12/2024  GRAB CAR BANGKOK                 150.00  -
      `;
      const { transactions } = parseTransactions(text, undefined);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].description).toBe('STARBUCKS CENTRAL WORLD');
      expect(transactions[0].amount).toBe(250);
      expect(transactions[0].currency).toBe('THB');
    });

    it('should parse credit transactions', () => {
      const text = `
        15/12/2024  Payment Thank You                -  5,000.00
      `;
      const { transactions } = parseTransactions(text, undefined);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('payment');
      expect(transactions[0].amount).toBe(-5000);
    });

    it('should detect categories in transactions', () => {
      const text = `
        15/12/2024  BIG C SUPERCENTER               1,500.00  -
        16/12/2024  NETFLIX SUBSCRIPTION              399.00  -
      `;
      const { transactions } = parseTransactions(text, undefined);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].category).toBe('Groceries');
      expect(transactions[1].category).toBe('Entertainment');
    });

    it('should skip summary lines', () => {
      const text = `
        15/12/2024  MERCHANT NAME                    500.00  -
        Total                                      500.00
        รวมยอด                                     500.00
      `;
      const { transactions } = parseTransactions(text, undefined);

      expect(transactions).toHaveLength(1);
    });

    it('should avoid duplicate transactions', () => {
      const text = `
        15/12/2024  SAME MERCHANT                    500.00  -
        15/12/2024  SAME MERCHANT                    500.00  -
      `;
      const { transactions } = parseTransactions(text, undefined);

      expect(transactions).toHaveLength(1);
    });

    it('should sort transactions by date', () => {
      const text = `
        20/12/2024  SECOND MERCHANT                  200.00  -
        15/12/2024  FIRST MERCHANT                   100.00  -
      `;
      const { transactions } = parseTransactions(text, undefined);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].description).toBe('FIRST MERCHANT');
      expect(transactions[1].description).toBe('SECOND MERCHANT');
    });
  });

  describe('calculateConfidence', () => {
    it('should give base confidence for identified statement', () => {
      const result: StatementParseResult = {
        success: true,
        parserKey: 'kasikorn',
        transactions: [],
        errors: [],
        warnings: [],
        confidence: 0,
      };

      expect(calculateConfidence(result)).toBe(20);
    });

    it('should increase confidence with period', () => {
      const result: StatementParseResult = {
        success: true,
        parserKey: 'kasikorn',
        transactions: [],
        errors: [],
        warnings: [],
        confidence: 0,
        period: {
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-31'),
        },
      };

      expect(calculateConfidence(result)).toBe(35); // 20 base + 15 period
    });

    it('should increase confidence with transactions', () => {
      const result: StatementParseResult = {
        success: true,
        parserKey: 'kasikorn',
        transactions: [
          {
            transactionDate: new Date('2024-12-15'),
            description: 'TEST',
            amount: 100,
            currency: 'THB',
            type: 'charge',
          },
        ],
        errors: [],
        warnings: [],
        confidence: 0,
      };

      expect(calculateConfidence(result)).toBeGreaterThan(50);
    });

    it('should give higher confidence for many transactions', () => {
      const transactions = Array.from({ length: 15 }, (_, i) => ({
        transactionDate: new Date('2024-12-15'),
        description: `TEST ${i}`,
        amount: 100,
        currency: 'THB',
        type: 'charge' as const,
      }));

      const result: StatementParseResult = {
        success: true,
        parserKey: 'kasikorn',
        transactions,
        errors: [],
        warnings: [],
        confidence: 0,
      };

      expect(calculateConfidence(result)).toBeGreaterThanOrEqual(70);
    });

    it('should cap confidence at 100', () => {
      const transactions = Array.from({ length: 20 }, (_, i) => ({
        transactionDate: new Date('2024-12-15'),
        description: `TEST ${i}`,
        amount: 100,
        currency: 'THB',
        type: 'charge' as const,
      }));

      const result: StatementParseResult = {
        success: true,
        parserKey: 'kasikorn',
        transactions,
        errors: [],
        warnings: [],
        confidence: 0,
        period: {
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-31'),
        },
        summary: { newBalance: 5000 },
        accountInfo: { cardType: 'Kasikorn Platinum' },
      };

      expect(calculateConfidence(result)).toBeLessThanOrEqual(100);
    });
  });

  describe('full parse', () => {
    it('should parse a complete statement', () => {
      const statementText = `
        KASIKORNBANK PUBLIC COMPANY LIMITED
        ธนาคารกสิกรไทย

        Card: xxxx-xxxx-xxxx-1234
        Kasikorn Platinum Credit Card

        Statement Period: 01/12/2024 - 31/12/2024
        Due Date: 15/01/2025

        Previous Balance: 10,000.00
        New Balance: 15,500.00
        Minimum Payment: 1,550.00
        Credit Limit: 100,000.00

        Transactions:

        05/12/2024  STARBUCKS CENTRAL WORLD          250.00  -
        10/12/2024  GRAB CAR SUKHUMVIT               180.00  -
        15/12/2024  BIG C RAMA 4                   2,500.00  -
        20/12/2024  NETFLIX SUBSCRIPTION             399.00  -
        25/12/2024  Payment Thank You                  -   5,000.00

        Total Charges: 3,329.00
        Total Credits: 5,000.00
      `;

      const result = kasikornParser.parse(statementText);

      expect(result.success).toBe(true);
      expect(result.parserKey).toBe('kasikorn');
      expect(result.confidence).toBeGreaterThan(60);

      // Period
      expect(result.period).not.toBeUndefined();
      expect(result.period!.startDate.getDate()).toBe(1);
      expect(result.period!.endDate.getDate()).toBe(31);
      expect(result.period!.dueDate).not.toBeUndefined();

      // Summary
      expect(result.summary).not.toBeUndefined();
      expect(result.summary!.previousBalance).toBe(10000);
      expect(result.summary!.newBalance).toBe(15500);
      expect(result.summary!.minimumPayment).toBe(1550);
      expect(result.summary!.creditLimit).toBe(100000);

      // Account info
      expect(result.accountInfo).not.toBeUndefined();
      expect(result.accountInfo!.cardType).toBe('Kasikorn Platinum');

      // Transactions
      expect(result.transactions.length).toBeGreaterThan(0);

      const starbucks = result.transactions.find(t => t.description.includes('STARBUCKS'));
      expect(starbucks).not.toBeUndefined();
      expect(starbucks!.amount).toBe(250);
      expect(starbucks!.category).toBe('Dining');

      const payment = result.transactions.find(t => t.type === 'payment');
      expect(payment).not.toBeUndefined();
      expect(payment!.amount).toBe(-5000);
    });

    it('should handle statements without period gracefully', () => {
      const statementText = `
        KASIKORNBANK
        05/12/2024  MERCHANT ONE          100.00  -
        10/12/2024  MERCHANT TWO          200.00  -
      `;

      const result = kasikornParser.parse(statementText);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Could not extract statement period');
      expect(result.transactions.length).toBe(2);
    });

    it('should return error for non-Kasikorn statements', () => {
      const result = kasikornParser.parse('Chase Sapphire Reserve Statement');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Text does not appear to be a Kasikorn Bank statement');
      expect(result.confidence).toBe(0);
    });

    it('should include raw text when requested', () => {
      const statementText = 'KASIKORNBANK Statement';
      const result = kasikornParser.parse(statementText, { includeRawText: true });

      expect(result.rawText).toBe(statementText);
    });

    it('should handle K PLUS transaction format', () => {
      const statementText = `
        K PLUS Transaction History
        ธนาคารกสิกรไทย

        Statement Period: 01/12/2024 - 31/12/2024

        05/12/2024  TRANSFER TO SAVINGS            1,000.00  K PLUS
        10/12/2024  BILL PAYMENT TRUE INTERNET       599.00  K PLUS
      `;

      const result = kasikornParser.parse(statementText);

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty statement', () => {
      const result = kasikornParser.parse('KASIKORNBANK');

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(0);
      expect(result.warnings).toContain('No transactions extracted from statement');
    });

    it('should handle statement with only fees', () => {
      const statementText = `
        KASIKORNBANK
        Statement Period: 01/12/2024 - 31/12/2024
        05/12/2024  Annual Fee                      500.00  -
        10/12/2024  SMS Alert Fee                    50.00  -
      `;

      const result = kasikornParser.parse(statementText);

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(2);
      expect(result.transactions.every(t => t.type === 'fee')).toBe(true);
    });

    it('should handle mixed Thai and English content', () => {
      const statementText = `
        ธนาคารกสิกรไทย KASIKORNBANK
        งวดบัญชี: 01/12/2567 - 31/12/2567

        05/12/2024  ร้านอาหาร BANGKOK              500.00  -
        10/12/2024  STARBUCKS สยาม                 250.00  -
      `;

      const result = kasikornParser.parse(statementText);

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(2);
    });

    it('should handle large amounts correctly', () => {
      const statementText = `
        KASIKORNBANK
        05/12/2024  BIG PURCHASE                123,456.78  -
      `;

      const result = kasikornParser.parse(statementText);

      expect(result.success).toBe(true);
      expect(result.transactions[0].amount).toBe(123456.78);
    });
  });
});

describe('KASIKORN_IDENTIFIERS', () => {
  it('should include all key identifiers', () => {
    expect(KASIKORN_IDENTIFIERS).toContain('kasikornbank');
    expect(KASIKORN_IDENTIFIERS).toContain('kbank');
    expect(KASIKORN_IDENTIFIERS).toContain('k plus');
    expect(KASIKORN_IDENTIFIERS).toContain('ธนาคารกสิกรไทย');
    expect(KASIKORN_IDENTIFIERS).toContain('the wisdom');
  });
});
