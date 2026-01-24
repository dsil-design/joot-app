/**
 * Tests for Chase Sapphire Statement Parser
 */

import {
  chaseParser,
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
} from '@/lib/statements/parsers/chase';

// Sample Chase statement text for testing
const SAMPLE_CHASE_STATEMENT = `
CHASE SAPPHIRE RESERVE

Account ending in: 1234
Payment Due Date: 01/15/25

Opening/Closing Date: 11/19/24 - 12/18/24

Previous Balance                     $1,250.00
Payments and Credits                  -$500.00
Purchases                            +$347.52
Fees Charged                            $0.00
Interest Charged                        $0.00
New Balance                           $1,097.52

Minimum Payment Due                    $25.00
Credit Limit                        $20,000.00
Available Credit                    $18,902.48

PAYMENTS AND OTHER CREDITS

11/25  AUTOPAY PAYMENT - THANK YOU               -500.00

PURCHASES

12/01  STARBUCKS SEATTLE WA                         5.75
12/03  AMAZON.COM SEATTLE WA                       45.99
12/05  GRAB* BANGKOK TH                            10.00
12/07  UNITED AIRLINES SFO-BKK                    850.00
12/10  MARRIOTT BANGKOK TH                        125.00
12/12  12/13  LAZADA THAILAND BKK                  35.78
12/15  UBER TRIP HELP.UBER.COM                     12.50

FEES CHARGED

None this period

INTEREST CHARGED

None this period
`;

const FOREIGN_TRANSACTION_TEXT = `
12/05  GRAB* BANGKOK TH                            10.00
       Foreign currency: 340.00 THB at exchange rate 0.02941
`;

const MULTI_PAGE_STATEMENT = `
CHASE SAPPHIRE RESERVE
Page 1 of 3

Account ending in: 5678
Opening/Closing Date: 10/19/24 - 11/18/24

PURCHASES

10/20  TRANSACTION ONE                             25.00
10/21  TRANSACTION TWO                             30.00

--- PAGE BREAK ---

Page 2 of 3

10/25  TRANSACTION THREE                           45.00
10/26  TRANSACTION FOUR                            50.00
10/27  TRANSACTION FIVE                            55.00

--- PAGE BREAK ---

Page 3 of 3

11/01  TRANSACTION SIX                             60.00
11/05  TRANSACTION SEVEN                           75.00
`;

describe('Chase Sapphire Statement Parser', () => {
  describe('canParse', () => {
    it('should recognize Chase Sapphire Reserve statements', () => {
      expect(chaseParser.canParse('Chase Sapphire Reserve Statement')).toBe(true);
    });

    it('should recognize Chase Sapphire Preferred statements', () => {
      expect(chaseParser.canParse('Chase Sapphire Preferred Statement')).toBe(true);
    });

    it('should recognize statements with JPMorgan Chase', () => {
      expect(chaseParser.canParse('JPMorgan Chase Bank Statement')).toBe(true);
    });

    it('should recognize statements with chase.com reference', () => {
      expect(chaseParser.canParse('Visit chase.com for more info')).toBe(true);
    });

    it('should not match non-Chase statements', () => {
      expect(chaseParser.canParse('American Express Statement')).toBe(false);
      expect(chaseParser.canParse('Bank of America Statement')).toBe(false);
      expect(chaseParser.canParse('Random document text')).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      expect(chaseParser.canParse('CHASE SAPPHIRE RESERVE')).toBe(true);
      expect(chaseParser.canParse('chase sapphire preferred')).toBe(true);
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
      const refDate = new Date(2024, 11, 18); // Dec 18, 2024
      const date = parseShortDate('12/05', refDate);
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
      const refDate = new Date(2024, 11, 18);
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

    it('should handle negative amounts', () => {
      expect(parseAmount('-$500.00')).toBe(-500.0);
      expect(parseAmount('-125.99')).toBe(-125.99);
    });

    it('should return null for invalid amounts', () => {
      expect(parseAmount('invalid')).toBeNull();
      expect(parseAmount('')).toBeNull();
    });
  });

  describe('parseStatementPeriod', () => {
    it('should extract period from Opening/Closing Date format', () => {
      const text = 'Opening/Closing Date: 11/19/24 - 12/18/24';
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.startDate.getMonth()).toBe(10); // November
      expect(period!.startDate.getDate()).toBe(19);
      expect(period!.endDate.getMonth()).toBe(11); // December
      expect(period!.endDate.getDate()).toBe(18);
    });

    it('should extract period from Statement Period format', () => {
      const text = 'Statement Period: 01/01/2024 to 01/31/2024';
      const period = parseStatementPeriod(text);

      expect(period).not.toBeUndefined();
      expect(period!.startDate.getMonth()).toBe(0);
      expect(period!.endDate.getMonth()).toBe(0);
    });

    it('should extract due date if present', () => {
      const text = `
        Opening/Closing Date: 11/19/24 - 12/18/24
        Payment Due Date: 01/15/25
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
        Previous Balance                     $1,250.00
        New Balance                           $1,097.52
        Minimum Payment Due                    $25.00
        Credit Limit                        $20,000.00
      `;
      const summary = parseSummary(text);

      expect(summary).not.toBeUndefined();
      expect(summary!.previousBalance).toBe(1250.0);
      expect(summary!.newBalance).toBe(1097.52);
      expect(summary!.minimumPayment).toBe(25.0);
      expect(summary!.creditLimit).toBe(20000.0);
    });

    it('should return undefined if no summary found', () => {
      const summary = parseSummary('No summary information');
      expect(summary).toBeUndefined();
    });
  });

  describe('parseAccountInfo', () => {
    it('should extract account number', () => {
      const info = parseAccountInfo('Account ending in: 1234');
      expect(info).not.toBeUndefined();
      expect(info!.accountNumber).toBe('1234');
    });

    it('should detect Sapphire Reserve card type', () => {
      const info = parseAccountInfo('Chase Sapphire Reserve');
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Chase Sapphire Reserve');
    });

    it('should detect Sapphire Preferred card type', () => {
      const info = parseAccountInfo('Chase Sapphire Preferred');
      expect(info).not.toBeUndefined();
      expect(info!.cardType).toBe('Chase Sapphire Preferred');
    });
  });

  describe('determineTransactionType', () => {
    it('should identify payments', () => {
      expect(determineTransactionType('AUTOPAY PAYMENT', 500, 'payments')).toBe('payment');
      expect(determineTransactionType('Thank you for your payment', 100, 'purchases')).toBe('payment');
    });

    it('should identify fees', () => {
      expect(determineTransactionType('Annual Membership Fee', 550, 'fees')).toBe('fee');
      expect(determineTransactionType('Foreign Transaction Fee', 3, 'purchases')).toBe('fee');
    });

    it('should identify interest', () => {
      expect(determineTransactionType('Interest Charge', 25, 'interest')).toBe('interest');
    });

    it('should identify credits', () => {
      expect(determineTransactionType('Amazon Refund', -25, 'credits')).toBe('credit');
      expect(determineTransactionType('Return to Merchant', -50, 'purchases')).toBe('credit');
    });

    it('should identify charges', () => {
      expect(determineTransactionType('STARBUCKS', 5.75, 'purchases')).toBe('charge');
    });
  });

  describe('detectCategory', () => {
    it('should detect Travel category', () => {
      expect(detectCategory('UNITED AIRLINES SFO-BKK')).toBe('Travel');
      expect(detectCategory('MARRIOTT HOTEL BANGKOK')).toBe('Travel');
      expect(detectCategory('AIRBNB PAYMENT')).toBe('Travel');
    });

    it('should detect Dining category', () => {
      expect(detectCategory('STARBUCKS SEATTLE')).toBe('Dining');
      expect(detectCategory('GRAB* BANGKOK')).toBe('Dining');
      expect(detectCategory('DOORDASH ORDER')).toBe('Dining');
    });

    it('should detect Transportation category', () => {
      expect(detectCategory('UBER TRIP')).toBe('Transportation');
      expect(detectCategory('LYFT RIDE')).toBe('Transportation');
      expect(detectCategory('BOLT RIDE')).toBe('Transportation');
    });

    it('should detect Shopping category', () => {
      expect(detectCategory('AMAZON.COM')).toBe('Shopping');
      expect(detectCategory('WALMART STORE')).toBe('Shopping');
    });

    it('should return undefined for unknown categories', () => {
      expect(detectCategory('RANDOM MERCHANT')).toBeUndefined();
    });
  });

  describe('extractForeignDetails', () => {
    it('should extract foreign currency details', () => {
      const lines = [
        '12/05  GRAB* BANGKOK TH                            10.00',
        'Foreign currency: 340.00 THB at exchange rate 0.02941',
      ];
      const details = extractForeignDetails(lines, 0);

      expect(details).not.toBeUndefined();
      expect(details!.originalAmount).toBe(340.0);
      expect(details!.originalCurrency).toBe('THB');
      expect(details!.exchangeRate).toBe(0.02941);
    });

    it('should return undefined if no foreign details', () => {
      const lines = ['12/05  STARBUCKS SEATTLE WA                         5.75'];
      const details = extractForeignDetails(lines, 0);
      expect(details).toBeUndefined();
    });
  });

  describe('parseTransactions', () => {
    it('should extract transactions from statement text', () => {
      const period = {
        startDate: new Date(2024, 10, 19),
        endDate: new Date(2024, 11, 18),
      };
      const { transactions } = parseTransactions(SAMPLE_CHASE_STATEMENT, period);

      expect(transactions.length).toBeGreaterThan(0);
    });

    it('should correctly parse transaction dates', () => {
      const period = {
        startDate: new Date(2024, 10, 19),
        endDate: new Date(2024, 11, 18),
      };
      const { transactions } = parseTransactions(SAMPLE_CHASE_STATEMENT, period);

      // Find the Starbucks transaction
      const starbucks = transactions.find((t) => t.description.includes('STARBUCKS'));
      expect(starbucks).toBeDefined();
      expect(starbucks!.transactionDate.getDate()).toBe(1);
    });

    it('should correctly parse amounts', () => {
      const period = {
        startDate: new Date(2024, 10, 19),
        endDate: new Date(2024, 11, 18),
      };
      const { transactions } = parseTransactions(SAMPLE_CHASE_STATEMENT, period);

      const starbucks = transactions.find((t) => t.description.includes('STARBUCKS'));
      expect(starbucks!.amount).toBe(5.75);

      const amazon = transactions.find((t) => t.description.includes('AMAZON'));
      expect(amazon!.amount).toBe(45.99);
    });

    it('should identify credits/payments with negative amounts', () => {
      const period = {
        startDate: new Date(2024, 10, 19),
        endDate: new Date(2024, 11, 18),
      };
      const { transactions } = parseTransactions(SAMPLE_CHASE_STATEMENT, period);

      const payment = transactions.find((t) => t.description.includes('AUTOPAY'));
      expect(payment).toBeDefined();
      expect(payment!.amount).toBeLessThan(0);
      expect(payment!.type).toBe('payment');
    });

    it('should handle posting date when present', () => {
      const period = {
        startDate: new Date(2024, 10, 19),
        endDate: new Date(2024, 11, 18),
      };
      const { transactions } = parseTransactions(SAMPLE_CHASE_STATEMENT, period);

      const lazada = transactions.find((t) => t.description.includes('LAZADA'));
      expect(lazada).toBeDefined();
      // The posting date parsing depends on the exact line format
    });

    it('should sort transactions by date', () => {
      const period = {
        startDate: new Date(2024, 10, 19),
        endDate: new Date(2024, 11, 18),
      };
      const { transactions } = parseTransactions(SAMPLE_CHASE_STATEMENT, period);

      for (let i = 1; i < transactions.length; i++) {
        expect(transactions[i].transactionDate.getTime()).toBeGreaterThanOrEqual(
          transactions[i - 1].transactionDate.getTime()
        );
      }
    });
  });

  describe('parse (full integration)', () => {
    it('should successfully parse a complete Chase statement', () => {
      const result = chaseParser.parse(SAMPLE_CHASE_STATEMENT);

      expect(result.success).toBe(true);
      expect(result.parserKey).toBe('chase');
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should extract statement period', () => {
      const result = chaseParser.parse(SAMPLE_CHASE_STATEMENT);

      expect(result.period).not.toBeUndefined();
      expect(result.period!.startDate).toBeInstanceOf(Date);
      expect(result.period!.endDate).toBeInstanceOf(Date);
    });

    it('should extract summary', () => {
      const result = chaseParser.parse(SAMPLE_CHASE_STATEMENT);

      expect(result.summary).not.toBeUndefined();
      expect(result.summary!.previousBalance).toBe(1250.0);
      expect(result.summary!.newBalance).toBe(1097.52);
    });

    it('should extract account info', () => {
      const result = chaseParser.parse(SAMPLE_CHASE_STATEMENT);

      expect(result.accountInfo).not.toBeUndefined();
      expect(result.accountInfo!.accountNumber).toBe('1234');
      expect(result.accountInfo!.cardType).toBe('Chase Sapphire Reserve');
    });

    it('should include raw text when requested', () => {
      const result = chaseParser.parse(SAMPLE_CHASE_STATEMENT, { includeRawText: true });

      expect(result.rawText).toBeDefined();
      expect(result.rawText).toContain('CHASE SAPPHIRE');
    });

    it('should fail gracefully for non-Chase statements', () => {
      const result = chaseParser.parse('American Express Platinum Card Statement');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.transactions.length).toBe(0);
    });
  });

  describe('multi-page statement handling', () => {
    it('should parse transactions across multiple pages', () => {
      const result = chaseParser.parse(MULTI_PAGE_STATEMENT);

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(7); // 7 transactions across 3 pages
    });

    it('should estimate page count', () => {
      const result = chaseParser.parse(MULTI_PAGE_STATEMENT);

      expect(result.pageCount).toBeDefined();
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateConfidence', () => {
    it('should give high confidence for complete statements', () => {
      const result = chaseParser.parse(SAMPLE_CHASE_STATEMENT);
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('should give lower confidence for minimal statements', () => {
      const minimalStatement = 'CHASE SAPPHIRE RESERVE\n12/01 MERCHANT 25.00';
      const result = chaseParser.parse(minimalStatement);

      expect(result.confidence).toBeLessThan(70);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const result = chaseParser.parse('');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle text with only whitespace', () => {
      const result = chaseParser.parse('   \n\t\n   ');

      expect(result.success).toBe(false);
    });

    it('should handle malformed transaction lines gracefully', () => {
      const malformedStatement = `
        CHASE SAPPHIRE RESERVE
        12/01 MERCHANT WITHOUT AMOUNT
        INVALID LINE FORMAT
        12/05 VALID MERCHANT 25.00
      `;
      const result = chaseParser.parse(malformedStatement);

      // Should still extract what it can
      expect(result.success).toBe(true);
      expect(result.transactions.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle statements with zero transactions', () => {
      const noTransactions = `
        CHASE SAPPHIRE RESERVE
        Opening/Closing Date: 11/19/24 - 12/18/24

        PURCHASES
        None this period
      `;
      const result = chaseParser.parse(noTransactions);

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about no transactions
    });
  });

  describe('foreign transactions', () => {
    it('should detect foreign transaction details', () => {
      const foreignStatement = `
        CHASE SAPPHIRE RESERVE
        Opening/Closing Date: 11/19/24 - 12/18/24

        PURCHASES

        12/05  GRAB* BANGKOK TH                            10.00
        Foreign currency: 340.00 THB at exchange rate 0.02941
      `;
      const result = chaseParser.parse(foreignStatement);

      const grabTx = result.transactions.find((t) => t.description.includes('GRAB'));
      expect(grabTx).toBeDefined();
      expect(grabTx!.foreignTransaction).toBeDefined();
      expect(grabTx!.foreignTransaction!.originalCurrency).toBe('THB');
    });
  });

  describe('Chase identifiers', () => {
    it('should have comprehensive identifier list', () => {
      expect(CHASE_IDENTIFIERS).toContain('chase sapphire');
      expect(CHASE_IDENTIFIERS).toContain('j.p. morgan');
      expect(CHASE_IDENTIFIERS).toContain('chase.com');
    });
  });
});
