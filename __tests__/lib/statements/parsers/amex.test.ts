/**
 * Tests for American Express Statement Parser
 */

import {
  amexParser,
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
  AMEX_IDENTIFIERS,
  MONTH_NAMES,
} from '@/lib/statements/parsers/amex';

// Sample Amex statement text for testing
const SAMPLE_AMEX_STATEMENT = `
AMERICAN EXPRESS
Platinum Card

Account ending in: 12345
Member Since: 2018
Payment Due Date: Jan 15, 2025

Statement Period: Dec 1, 2024 - Dec 31, 2024

Previous Balance                     $2,500.00
Payments and Credits                 -$1,000.00
New Charges                          +$847.52
Fees                                    $0.00
Interest                                $0.00
New Balance                          $2,347.52

Minimum Payment Due                    $35.00

PAYMENTS AND OTHER CREDITS

12/05  ONLINE PAYMENT - THANK YOU               $1,000.00 CR

NEW CHARGES

12/01  STARBUCKS NEW YORK NY                       $5.75
12/03  AMAZON.COM AMZN.COM/BILL WA                $45.99
12/05  GRAB* BANGKOK TH                           $10.00
12/07  DELTA AIRLINES ATLANTA GA                 $450.00
12/10  MARRIOTT INTL NEW YORK NY                 $225.00
12/12  WHOLE FOODS MARKET NEW YORK               $78.25
12/15  UBER TRIP HELP.UBER.COM                    $18.50
12/18  NETFLIX.COM LOS GATOS CA                   $15.99

FEES CHARGED

None this period

INTEREST CHARGED

None this period

MEMBERSHIP REWARDS SUMMARY

Points Earned This Period: 2,847
Total Points Available: 125,000
`;

const SAMPLE_AMEX_GOLD_STATEMENT = `
AMERICAN EXPRESS
Gold Card

Account ending in: 54321
Statement Period: Nov 1, 2024 - Nov 30, 2024

NEW CHARGES

Nov 3  RESTAURANT DEPOT NY                       $125.50
Nov 8  TRADER JOES NEW YORK                       $89.00
Nov 15  GRUBHUB ORDER                              $35.75
Nov 22  SEAMLESS ORDER                             $42.00
`;

const FOREIGN_TRANSACTION_TEXT = `
12/05  GRAB* BANGKOK TH                           $10.00
       Foreign currency: 340.00 THB = 10.00 USD at 0.02941
`;

const MULTI_PAGE_STATEMENT = `
AMERICAN EXPRESS
Platinum Card

Account ending in: 67890
Statement Period: Oct 1, 2024 - Oct 31, 2024

NEW CHARGES

10/01  TRANSACTION ONE                            $25.00
10/05  TRANSACTION TWO                            $30.00

--- PAGE BREAK ---

Page 2 of 3

10/10  TRANSACTION THREE                          $45.00
10/15  TRANSACTION FOUR                           $50.00
10/20  TRANSACTION FIVE                           $55.00

--- PAGE BREAK ---

Page 3 of 3

10/25  TRANSACTION SIX                            $60.00
10/30  TRANSACTION SEVEN                          $75.00
`;

const CLOSING_DATE_STATEMENT = `
AMERICAN EXPRESS
Platinum Card

Closing Date 12/31/24
Payment Due Date: 01/25/25

New Balance                          $500.00

NEW CHARGES

12/15  MERCHANT ONE                               $250.00
12/20  MERCHANT TWO                               $250.00
`;

describe('American Express Statement Parser', () => {
  describe('canParse', () => {
    it('should recognize American Express statements', () => {
      expect(amexParser.canParse('American Express Statement')).toBe(true);
    });

    it('should recognize AMEX statements', () => {
      expect(amexParser.canParse('Your AMEX card statement')).toBe(true);
    });

    it('should recognize Platinum Card statements', () => {
      expect(amexParser.canParse('Platinum Card Statement')).toBe(true);
    });

    it('should recognize Gold Card statements', () => {
      expect(amexParser.canParse('Gold Card Statement')).toBe(true);
    });

    it('should recognize statements with americanexpress.com', () => {
      expect(amexParser.canParse('Visit americanexpress.com for more info')).toBe(true);
    });

    it('should recognize Membership Rewards statements', () => {
      expect(amexParser.canParse('Membership Rewards Points Summary')).toBe(true);
    });

    it('should recognize co-branded cards', () => {
      expect(amexParser.canParse('Delta SkyMiles Credit Card')).toBe(true);
      expect(amexParser.canParse('Hilton Honors Card')).toBe(true);
      expect(amexParser.canParse('Marriott Bonvoy Card')).toBe(true);
    });

    it('should not match non-Amex statements', () => {
      expect(amexParser.canParse('Chase Sapphire Reserve Statement')).toBe(false);
      expect(amexParser.canParse('Bank of America Statement')).toBe(false);
      expect(amexParser.canParse('Random document text')).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      expect(amexParser.canParse('AMERICAN EXPRESS')).toBe(true);
      expect(amexParser.canParse('american express')).toBe(true);
      expect(amexParser.canParse('AmErIcAn ExPrEsS')).toBe(true);
    });
  });

  describe('parseDate', () => {
    it('should parse MM/DD/YY format', () => {
      const date = parseDate('12/15/24');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(11); // December
      expect(date!.getDate()).toBe(15);
    });

    it('should parse MM/DD/YYYY format', () => {
      const date = parseDate('01/01/2025');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(0); // January
      expect(date!.getDate()).toBe(1);
    });

    it('should parse named month format (Dec 15, 2024)', () => {
      const date = parseDate('Dec 15, 2024');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(11);
      expect(date!.getDate()).toBe(15);
    });

    it('should parse named month format without comma', () => {
      const date = parseDate('Jan 1 2025');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(0);
    });

    it('should handle single digit month/day', () => {
      const date = parseDate('1/5/24');
      expect(date).not.toBeNull();
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(5);
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('13/45/24')).toBeNull();
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate('Xyz 15, 2024')).toBeNull(); // Invalid month name
    });

    it('should handle 2-digit years correctly', () => {
      const date2024 = parseDate('12/15/24');
      expect(date2024!.getFullYear()).toBe(2024);

      const date1999 = parseDate('12/15/99');
      expect(date1999!.getFullYear()).toBe(1999);
    });
  });

  describe('parseShortDate', () => {
    it('should parse MM/DD with reference date', () => {
      const refDate = new Date(2024, 11, 31); // Dec 31, 2024
      const date = parseShortDate('12/15', refDate);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(11);
      expect(date!.getDate()).toBe(15);
    });

    it('should parse named month short date (Dec 5)', () => {
      const refDate = new Date(2024, 11, 31);
      const date = parseShortDate('Dec 5', refDate);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(11);
      expect(date!.getDate()).toBe(5);
    });

    it('should handle year boundary for previous months', () => {
      const refDate = new Date(2025, 0, 15); // Jan 15, 2025
      const date = parseShortDate('11/25', refDate);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024); // Should be previous year
    });

    it('should return null for invalid short dates', () => {
      const refDate = new Date(2024, 11, 31);
      expect(parseShortDate('invalid', refDate)).toBeNull();
      expect(parseShortDate('', refDate)).toBeNull();
    });
  });

  describe('parseAmount', () => {
    it('should parse simple amounts', () => {
      expect(parseAmount('$25.00')).toBe(25.0);
      expect(parseAmount('125.99')).toBe(125.99);
    });

    it('should parse amounts with commas', () => {
      expect(parseAmount('$1,234.56')).toBe(1234.56);
      expect(parseAmount('12,345,678.90')).toBe(12345678.9);
    });

    it('should handle CR suffix for credits', () => {
      expect(parseAmount('$500.00', true)).toBe(-500.0);
      expect(parseAmount('125.99', true)).toBe(-125.99);
    });

    it('should return null for invalid amounts', () => {
      expect(parseAmount('invalid')).toBeNull();
      expect(parseAmount('')).toBeNull();
    });
  });

  describe('parseStatementPeriod', () => {
    it('should extract period from named month format', () => {
      const text = 'Statement Period: Dec 1, 2024 - Dec 31, 2024';
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.startDate.getMonth()).toBe(11); // December
      expect(period!.startDate.getDate()).toBe(1);
      expect(period!.endDate.getMonth()).toBe(11);
      expect(period!.endDate.getDate()).toBe(31);
    });

    it('should extract period from numeric format', () => {
      const text = 'Statement Period: 12/01/24 - 12/31/24';
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.startDate.getMonth()).toBe(11);
      expect(period!.endDate.getMonth()).toBe(11);
    });

    it('should extract period from closing date only', () => {
      const text = 'Closing Date 12/31/24';
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.endDate.getMonth()).toBe(11);
      expect(period!.endDate.getDate()).toBe(31);
      expect(period!.closingDate).toBeDefined();
    });

    it('should extract due date if present', () => {
      const text = `
        Statement Period: Dec 1, 2024 - Dec 31, 2024
        Payment Due Date: Jan 25, 2025
      `;
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.dueDate).not.toBeUndefined();
      expect(period!.dueDate!.getMonth()).toBe(0); // January
    });

    it('should return undefined if no period found', () => {
      const period = parseStatementPeriod('No period information here');
      expect(period).toBeUndefined();
    });
  });

  describe('parseSummary', () => {
    it('should extract summary totals', () => {
      const text = `
        Previous Balance                     $2,500.00
        New Balance                          $2,347.52
        Minimum Payment Due                    $35.00
      `;
      const summary = parseSummary(text);

      expect(summary).not.toBeUndefined();
      expect(summary!.previousBalance).toBe(2500.0);
      expect(summary!.newBalance).toBe(2347.52);
      expect(summary!.minimumPayment).toBe(35.0);
    });

    it('should return undefined if no summary found', () => {
      const summary = parseSummary('No summary information');
      expect(summary).toBeUndefined();
    });
  });

  describe('parseAccountInfo', () => {
    it('should extract account number', () => {
      const info = parseAccountInfo('Account ending in: 12345');
      expect(info).not.toBeUndefined();
      expect(info!.accountNumber).toBe('12345');
    });

    it('should detect Platinum card type', () => {
      const info = parseAccountInfo('Platinum Card Member');
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('American Express Platinum');
    });

    it('should detect Gold card type', () => {
      const info = parseAccountInfo('Gold Card Statement');
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('American Express Gold');
    });

    it('should detect Green card type', () => {
      const info = parseAccountInfo('Green Card Statement');
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('American Express Green');
    });

    it('should detect Blue Cash card type', () => {
      const info = parseAccountInfo('Blue Cash Preferred');
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('American Express Blue Cash');
    });

    it('should detect co-branded card types', () => {
      expect(parseAccountInfo('Delta SkyMiles Card')!.cardType).toBe('American Express Delta SkyMiles');
      expect(parseAccountInfo('Hilton Honors Card')!.cardType).toBe('American Express Hilton Honors');
      expect(parseAccountInfo('Marriott Bonvoy Card')!.cardType).toBe('American Express Marriott Bonvoy');
    });
  });

  describe('determineTransactionType', () => {
    it('should identify payments', () => {
      expect(determineTransactionType('ONLINE PAYMENT', 1000, 'payments', true)).toBe('payment');
      expect(determineTransactionType('Thank you for your payment', 100, 'purchases', false)).toBe('payment');
      expect(determineTransactionType('AUTOPAY', 500, 'payments', true)).toBe('payment');
    });

    it('should identify fees', () => {
      expect(determineTransactionType('Annual Membership Fee', 695, 'fees', false)).toBe('fee');
      expect(determineTransactionType('Card Member Fee', 250, 'purchases', false)).toBe('fee');
    });

    it('should identify interest', () => {
      expect(determineTransactionType('Interest Charge', 25, 'interest', false)).toBe('interest');
      expect(determineTransactionType('Finance Charge', 30, 'purchases', false)).toBe('interest');
    });

    it('should identify credits with CR suffix', () => {
      expect(determineTransactionType('Amazon Refund', 25, 'purchases', true)).toBe('credit');
    });

    it('should identify credits from description', () => {
      expect(determineTransactionType('Return to Merchant', 50, 'purchases', false)).toBe('credit');
      expect(determineTransactionType('Refund from Store', 30, 'purchases', false)).toBe('credit');
    });

    it('should identify charges', () => {
      expect(determineTransactionType('STARBUCKS', 5.75, 'purchases', false)).toBe('charge');
    });
  });

  describe('detectCategory', () => {
    it('should detect Travel category', () => {
      expect(detectCategory('DELTA AIRLINES ATLANTA')).toBe('Travel');
      expect(detectCategory('MARRIOTT HOTEL NYC')).toBe('Travel');
      expect(detectCategory('AIRBNB PAYMENT')).toBe('Travel');
      expect(detectCategory('HILTON GARDEN INN')).toBe('Travel');
      expect(detectCategory('HYATT REGENCY')).toBe('Travel');
    });

    it('should detect Dining category', () => {
      expect(detectCategory('STARBUCKS NYC')).toBe('Dining');
      expect(detectCategory('GRAB* BANGKOK')).toBe('Dining');
      expect(detectCategory('GRUBHUB ORDER')).toBe('Dining');
      expect(detectCategory('SEAMLESS DELIVERY')).toBe('Dining');
    });

    it('should detect Transportation category', () => {
      expect(detectCategory('UBER TRIP')).toBe('Transportation');
      expect(detectCategory('LYFT RIDE')).toBe('Transportation');
      expect(detectCategory('PARKING GARAGE')).toBe('Transportation');
    });

    it('should detect Shopping category', () => {
      expect(detectCategory('AMAZON.COM')).toBe('Shopping');
      expect(detectCategory('BEST BUY')).toBe('Shopping');
      expect(detectCategory('APPLE.COM/BILL')).toBe('Shopping');
    });

    it('should detect Groceries category', () => {
      expect(detectCategory('WHOLE FOODS MARKET')).toBe('Groceries');
      expect(detectCategory('TRADER JOES')).toBe('Groceries');
      expect(detectCategory('KROGER STORE')).toBe('Groceries');
    });

    it('should detect Entertainment category', () => {
      expect(detectCategory('NETFLIX.COM')).toBe('Entertainment');
      expect(detectCategory('SPOTIFY USA')).toBe('Entertainment');
      expect(detectCategory('HULU SUBSCRIPTION')).toBe('Entertainment');
    });

    it('should return undefined for unknown categories', () => {
      expect(detectCategory('RANDOM MERCHANT')).toBeUndefined();
    });
  });

  describe('extractForeignDetails', () => {
    it('should extract foreign currency details', () => {
      const lines = [
        '12/05  GRAB* BANGKOK TH                           $10.00',
        '       Foreign currency: 340.00 THB = 10.00 USD at 0.02941',
      ];
      const details = extractForeignDetails(lines, 0);

      expect(details).not.toBeUndefined();
      expect(details!.originalAmount).toBe(340.0);
      expect(details!.originalCurrency).toBe('THB');
      expect(details!.exchangeRate).toBe(0.02941);
    });

    it('should return undefined if no foreign details', () => {
      const lines = ['12/05  STARBUCKS NYC                              $5.75'];
      const details = extractForeignDetails(lines, 0);
      expect(details).toBeUndefined();
    });
  });

  describe('parseTransactions', () => {
    it('should extract transactions from statement text', () => {
      const period = {
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2024, 11, 31),
      };
      const { transactions } = parseTransactions(SAMPLE_AMEX_STATEMENT, period);

      expect(transactions.length).toBeGreaterThan(0);
    });

    it('should correctly parse transaction dates', () => {
      const period = {
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2024, 11, 31),
      };
      const { transactions } = parseTransactions(SAMPLE_AMEX_STATEMENT, period);

      // Find the Starbucks transaction
      const starbucks = transactions.find((t) => t.description.includes('STARBUCKS'));
      expect(starbucks).toBeDefined();
      expect(starbucks!.transactionDate.getDate()).toBe(1);
    });

    it('should correctly parse amounts', () => {
      const period = {
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2024, 11, 31),
      };
      const { transactions } = parseTransactions(SAMPLE_AMEX_STATEMENT, period);

      const starbucks = transactions.find((t) => t.description.includes('STARBUCKS'));
      expect(starbucks!.amount).toBe(5.75);

      const amazon = transactions.find((t) => t.description.includes('AMAZON'));
      expect(amazon!.amount).toBe(45.99);
    });

    it('should identify credits/payments with negative amounts', () => {
      const period = {
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2024, 11, 31),
      };
      const { transactions } = parseTransactions(SAMPLE_AMEX_STATEMENT, period);

      const payment = transactions.find((t) => t.description.includes('ONLINE PAYMENT'));
      expect(payment).toBeDefined();
      expect(payment!.amount).toBeLessThan(0);
      expect(payment!.type).toBe('payment');
    });

    it('should parse named month date format', () => {
      const period = {
        startDate: new Date(2024, 10, 1),
        endDate: new Date(2024, 10, 30),
      };
      const { transactions } = parseTransactions(SAMPLE_AMEX_GOLD_STATEMENT, period);

      expect(transactions.length).toBeGreaterThan(0);
      // Verify first transaction date
      const firstTx = transactions.find((t) => t.description.includes('RESTAURANT DEPOT'));
      expect(firstTx).toBeDefined();
      expect(firstTx!.transactionDate.getMonth()).toBe(10); // November
    });

    it('should sort transactions by date', () => {
      const period = {
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2024, 11, 31),
      };
      const { transactions } = parseTransactions(SAMPLE_AMEX_STATEMENT, period);

      for (let i = 1; i < transactions.length; i++) {
        expect(transactions[i].transactionDate.getTime()).toBeGreaterThanOrEqual(
          transactions[i - 1].transactionDate.getTime()
        );
      }
    });
  });

  describe('parse (full integration)', () => {
    it('should successfully parse a complete Amex statement', () => {
      const result = amexParser.parse(SAMPLE_AMEX_STATEMENT);

      expect(result.success).toBe(true);
      expect(result.parserKey).toBe('amex');
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should extract statement period', () => {
      const result = amexParser.parse(SAMPLE_AMEX_STATEMENT);

      expect(result.period).not.toBeUndefined();
      expect(result.period!.startDate).toBeInstanceOf(Date);
      expect(result.period!.endDate).toBeInstanceOf(Date);
    });

    it('should extract summary', () => {
      const result = amexParser.parse(SAMPLE_AMEX_STATEMENT);

      expect(result.summary).not.toBeUndefined();
      expect(result.summary!.previousBalance).toBe(2500.0);
      expect(result.summary!.newBalance).toBe(2347.52);
    });

    it('should extract account info', () => {
      const result = amexParser.parse(SAMPLE_AMEX_STATEMENT);

      expect(result.accountInfo).not.toBeUndefined();
      expect(result.accountInfo!.accountNumber).toBe('12345');
      expect(result.accountInfo!.cardType).toBe('American Express Platinum');
    });

    it('should include raw text when requested', () => {
      const result = amexParser.parse(SAMPLE_AMEX_STATEMENT, { includeRawText: true });

      expect(result.rawText).toBeDefined();
      expect(result.rawText).toContain('AMERICAN EXPRESS');
    });

    it('should fail gracefully for non-Amex statements', () => {
      const result = amexParser.parse('Chase Sapphire Reserve Statement');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.transactions.length).toBe(0);
    });

    it('should parse statement with closing date only', () => {
      const result = amexParser.parse(CLOSING_DATE_STATEMENT);

      expect(result.success).toBe(true);
      expect(result.period).toBeDefined();
      expect(result.period!.closingDate).toBeDefined();
      expect(result.transactions.length).toBe(2);
    });
  });

  describe('multi-page statement handling', () => {
    it('should parse transactions across multiple pages', () => {
      const result = amexParser.parse(MULTI_PAGE_STATEMENT);

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(7); // 7 transactions across 3 pages
    });

    it('should estimate page count', () => {
      const result = amexParser.parse(MULTI_PAGE_STATEMENT);

      expect(result.pageCount).toBeDefined();
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateConfidence', () => {
    it('should give high confidence for complete statements', () => {
      const result = amexParser.parse(SAMPLE_AMEX_STATEMENT);
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('should give lower confidence for minimal statements', () => {
      const minimalStatement = 'AMERICAN EXPRESS\n12/01 MERCHANT $25.00';
      const result = amexParser.parse(minimalStatement);

      expect(result.confidence).toBeLessThan(70);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const result = amexParser.parse('');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle text with only whitespace', () => {
      const result = amexParser.parse('   \n\t\n   ');

      expect(result.success).toBe(false);
    });

    it('should handle malformed transaction lines gracefully', () => {
      const malformedStatement = `
        AMERICAN EXPRESS
        12/01 MERCHANT WITHOUT AMOUNT
        INVALID LINE FORMAT
        12/05 VALID MERCHANT $25.00
      `;
      const result = amexParser.parse(malformedStatement);

      // Should still extract what it can
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle statements with zero transactions', () => {
      const noTransactions = `
        AMERICAN EXPRESS
        Statement Period: Dec 1, 2024 - Dec 31, 2024

        NEW CHARGES
        None this period
      `;
      const result = amexParser.parse(noTransactions);

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about no transactions
    });

    it('should skip membership rewards section', () => {
      const result = amexParser.parse(SAMPLE_AMEX_STATEMENT);

      // Should not extract points info as transactions
      const pointsTx = result.transactions.find((t) =>
        t.description.toLowerCase().includes('points')
      );
      expect(pointsTx).toBeUndefined();
    });
  });

  describe('foreign transactions', () => {
    it('should detect foreign transaction details', () => {
      const foreignStatement = `
        AMERICAN EXPRESS
        Statement Period: Dec 1, 2024 - Dec 31, 2024

        NEW CHARGES

        12/05  GRAB* BANGKOK TH                           $10.00
        Foreign currency: 340.00 THB = 10.00 USD at 0.02941
      `;
      const result = amexParser.parse(foreignStatement);

      const grabTx = result.transactions.find((t) => t.description.includes('GRAB'));
      expect(grabTx).toBeDefined();
      expect(grabTx!.foreignTransaction).toBeDefined();
      expect(grabTx!.foreignTransaction!.originalCurrency).toBe('THB');
    });
  });

  describe('Amex identifiers', () => {
    it('should have comprehensive identifier list', () => {
      expect(AMEX_IDENTIFIERS).toContain('american express');
      expect(AMEX_IDENTIFIERS).toContain('amex');
      expect(AMEX_IDENTIFIERS).toContain('platinum card');
      expect(AMEX_IDENTIFIERS).toContain('gold card');
      expect(AMEX_IDENTIFIERS).toContain('membership rewards');
    });
  });

  describe('month name mapping', () => {
    it('should have all months mapped', () => {
      expect(MONTH_NAMES['jan']).toBe(0);
      expect(MONTH_NAMES['february']).toBe(1);
      expect(MONTH_NAMES['mar']).toBe(2);
      expect(MONTH_NAMES['dec']).toBe(11);
      expect(MONTH_NAMES['december']).toBe(11);
    });

    it('should handle september variations', () => {
      expect(MONTH_NAMES['sep']).toBe(8);
      expect(MONTH_NAMES['sept']).toBe(8);
      expect(MONTH_NAMES['september']).toBe(8);
    });
  });
});
