/**
 * Kasikorn Bank Statement Parser Tests
 *
 * Tests against the real K PLUS savings account statement format where
 * pdf-parse concatenates table columns without delimiters:
 *   DD-MM-YYHH:MM<Channel><Balance><Description><TypeKeyword><Amount>
 */

import {
  kasikornParser,
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
  KASIKORN_IDENTIFIERS,
  TYPE_KEYWORDS,
} from '@/lib/statements/parsers/kasikorn';
import type { StatementParseResult } from '@/lib/statements/parsers/types';

// ---------------------------------------------------------------------------
// Sample text blocks that match real K PLUS PDF extraction
// ---------------------------------------------------------------------------

const SAMPLE_HEADER = `
Ref. No. DD.048 : N26031512269679408078I/2569
AccountMR. DENNIS RODGER SILLER
345 Moo 3 San Sai Noi, San Sai, Chiang Mai 50210
1/4(0663)
Central Chiangmai Branch
221-1-47202-5
26031512269679408078
01/12/2025 - 31/12/2025
Account Number
Owner Branch
Reference Code
Period
271,111.99
385,907.43
Total Withdrawal 100 Items
Total Deposit 33 Items
Ending Balance
459,706.32
PAGE/OF 1/4
Date
Time/
Eff.Date
Withdrawal / DepositChannelDescriptions
Outstanding Balance
(THB)
Details
`;

const SAMPLE_TRANSACTIONS = `
KBPDF (FM702-CA_SA-V.1) (03-25)
Issued by K PLUS
01-12-25197,313.10Beginning Balance
01-12-2513:42Internet/Mobile BBL242,313.10From BBL X3372 DENNIS RODGER SILL++Transfer Deposit45,000.00
02-12-2508:40EDC/K SHOP/MYQR242,213.10Paid for Ref X5001 VIRGIN
ACTIVE-C.FESTIVAL (A/C Name: VIRGIN
Payment100.00
02-12-2510:23K PLUS241,943.10Paid for Ref XF001 บริษัท เอส จี จี 2023 จํากัดPayment270.00
02-12-2513:21K PLUS242,275.60From X5794 MS. SUPAPORN KIDK++Transfer Deposit332.50
02-12-2515:07EDC/K SHOP/MYQR242,185.60Paid for Ref X5448 ณ วะณะ (A/C Name: NA
VANA CO.,LTD.)
Payment90.00
02-12-2517:02K PLUS241,485.60Paid for Ref X0720 Kunchai cha yenPayment700.00
02-12-2520:14K PLUS241,385.60To X8750 MR. THONGSUK LUNGK++Transfer Withdrawal100.00
07-12-2500:50ATM237,398.60Ref Code ATM48014Cash Withdrawal1,000.00
19-12-2523:59Automatic Transfer23,039.68Ref Code PCB09400Interest Deposit22.57
19-12-2523:59Automatic Transfer23,036.29Ref Code PCB09400Withholding Tax Payable3.39
29-12-2515:11K BIZ393,420.79From X2705 DIGICO CO.,LT++Transfer Deposit387,585.00
`;

const FULL_SAMPLE = SAMPLE_HEADER + SAMPLE_TRANSACTIONS;

// ---------------------------------------------------------------------------
// canParse
// ---------------------------------------------------------------------------

describe('Kasikorn Bank Statement Parser', () => {
  describe('canParse', () => {
    it('should detect by English identifiers', () => {
      expect(kasikornParser.canParse('KASIKORNBANK Statement')).toBe(true);
      expect(kasikornParser.canParse('Kasikorn Bank Public Company')).toBe(true);
      expect(kasikornParser.canParse('KBank Statement')).toBe(true);
      expect(kasikornParser.canParse('KBPDF (FM702-CA_SA-V.1)')).toBe(true);
    });

    it('should detect by K PLUS / K BIZ references', () => {
      expect(kasikornParser.canParse('K PLUS Transaction History')).toBe(true);
      expect(kasikornParser.canParse('Issued by K PLUS')).toBe(true);
      expect(kasikornParser.canParse('K BIZ transfer')).toBe(true);
    });

    it('should detect by Thai identifiers', () => {
      expect(kasikornParser.canParse('ธนาคารกสิกรไทย')).toBe(true);
      expect(kasikornParser.canParse('บัตรเครดิตกสิกร')).toBe(true);
      expect(kasikornParser.canParse('เคแบงก์')).toBe(true);
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

  // ---------------------------------------------------------------------------
  // parseThaiDate
  // ---------------------------------------------------------------------------

  describe('parseThaiDate', () => {
    it('should parse DD-MM-YY format (K PLUS statement format)', () => {
      const date = parseThaiDate('01-12-25');
      expect(date).not.toBeNull();
      expect(date!.getDate()).toBe(1);
      expect(date!.getMonth()).toBe(11); // December
      expect(date!.getFullYear()).toBe(2025);
    });

    it('should parse DD/MM/YYYY format', () => {
      const date = parseThaiDate('01/12/2025');
      expect(date).not.toBeNull();
      expect(date!.getDate()).toBe(1);
      expect(date!.getMonth()).toBe(11);
      expect(date!.getFullYear()).toBe(2025);
    });

    it('should handle Buddhist Era 2-digit years (>43)', () => {
      const date = parseThaiDate('15-12-67');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024); // BE 67 → CE 2024
    });

    it('should handle full Buddhist Era years', () => {
      const date = parseThaiDate('15/12/2567');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
    });

    it('should return null for invalid dates', () => {
      expect(parseThaiDate('invalid')).toBeNull();
      expect(parseThaiDate('32/13/2024')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // parseAmount
  // ---------------------------------------------------------------------------

  describe('parseAmount', () => {
    it('should parse standard amounts', () => {
      expect(parseAmount('1234.56')).toBe(1234.56);
    });

    it('should parse amounts with commas', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56);
      expect(parseAmount('12,345,678.90')).toBe(12345678.90);
    });

    it('should parse amounts in text context', () => {
      expect(parseAmount('Total: 1,234.56 THB')).toBe(1234.56);
    });

    it('should return null for invalid amounts', () => {
      expect(parseAmount('not a number')).toBeNull();
      expect(parseAmount('')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // mapTransactionType
  // ---------------------------------------------------------------------------

  describe('mapTransactionType', () => {
    it('should map Payment to charge (withdrawal)', () => {
      const result = mapTransactionType('Payment');
      expect(result.type).toBe('charge');
      expect(result.isWithdrawal).toBe(true);
    });

    it('should map Transfer Withdrawal to charge', () => {
      const result = mapTransactionType('Transfer Withdrawal');
      expect(result.type).toBe('charge');
      expect(result.isWithdrawal).toBe(true);
    });

    it('should map Cash Withdrawal to charge', () => {
      const result = mapTransactionType('Cash Withdrawal');
      expect(result.type).toBe('charge');
      expect(result.isWithdrawal).toBe(true);
    });

    it('should map Transfer Deposit to credit', () => {
      const result = mapTransactionType('Transfer Deposit');
      expect(result.type).toBe('credit');
      expect(result.isWithdrawal).toBe(false);
    });

    it('should map QR Transfer Deposit to credit', () => {
      const result = mapTransactionType('QR Transfer Deposit');
      expect(result.type).toBe('credit');
      expect(result.isWithdrawal).toBe(false);
    });

    it('should map Interest Deposit to interest', () => {
      const result = mapTransactionType('Interest Deposit');
      expect(result.type).toBe('interest');
      expect(result.isWithdrawal).toBe(false);
    });

    it('should map Withholding Tax Payable to fee', () => {
      const result = mapTransactionType('Withholding Tax Payable');
      expect(result.type).toBe('fee');
      expect(result.isWithdrawal).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // cleanDescription
  // ---------------------------------------------------------------------------

  describe('cleanDescription', () => {
    it('should remove "Paid for Ref" prefix', () => {
      expect(cleanDescription('Paid for Ref X5001 VIRGIN ACTIVE', 'Payment')).toBe('VIRGIN ACTIVE');
    });

    it('should remove "(A/C Name: ...)" suffix', () => {
      expect(
        cleanDescription('Paid for Ref X5001 SKUGGA (A/C Name: SKUGGA CO.,LTD.)', 'Payment')
      ).toBe('SKUGGA');
    });

    it('should clean transfer descriptions with direction', () => {
      expect(
        cleanDescription('From X5794 MS. SUPAPORN KIDK++', 'Transfer Deposit')
      ).toBe('From: MS. SUPAPORN KIDK');
    });

    it('should clean PromptPay transfer descriptions', () => {
      expect(
        cleanDescription('To PromptPay X9836 CHAYAPHORN ++', 'Transfer Withdrawal')
      ).toBe('To: CHAYAPHORN');
    });

    it('should clean Ref Code descriptions', () => {
      expect(cleanDescription('Ref Code ATM48014', 'Cash Withdrawal')).toBe('Ref Code');
    });
  });

  // ---------------------------------------------------------------------------
  // detectCategory
  // ---------------------------------------------------------------------------

  describe('detectCategory', () => {
    it('should detect Dining', () => {
      expect(detectCategory('ชาบูกุ ฮอทพอท เรสโตรองท์')).toBe('Dining');
      expect(detectCategory('เอ็มเค เรสโตรองต์ กรุ๊ป')).toBe('Dining');
      expect(detectCategory('ก๋วยเตี๋ยวเรือพระนคร')).toBe('Dining');
    });

    it('should detect Entertainment', () => {
      expect(detectCategory('VIRGIN ACTIVE')).toBe('Entertainment');
      expect(detectCategory('ALL TIME PICKLEBALL')).toBe('Entertainment');
      expect(detectCategory('บจก โยคะวันโอวัน')).toBe('Entertainment');
    });

    it('should detect Utilities', () => {
      expect(detectCategory('PEA')).toBe('Utilities');
      expect(detectCategory('PWA-PROVINCIAL WATERWORKS')).toBe('Utilities');
    });

    it('should detect Transportation', () => {
      expect(detectCategory('BANGCHAK-S G G 2023')).toBe('Transportation');
      expect(detectCategory('ล้างรถด่วน 79 บาท')).toBe('Transportation');
    });

    it('should return undefined for unknown categories', () => {
      expect(detectCategory('RANDOM MERCHANT')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // parseStatementPeriod
  // ---------------------------------------------------------------------------

  describe('parseStatementPeriod', () => {
    it('should parse K PLUS period format', () => {
      const period = parseStatementPeriod('01/12/2025 - 31/12/2025');
      expect(period).not.toBeUndefined();
      expect(period!.startDate.getDate()).toBe(1);
      expect(period!.startDate.getMonth()).toBe(11);
      expect(period!.endDate.getDate()).toBe(31);
    });

    it('should parse from full header text', () => {
      const period = parseStatementPeriod(SAMPLE_HEADER);
      expect(period).not.toBeUndefined();
      expect(period!.startDate.getFullYear()).toBe(2025);
    });

    it('should return undefined when no period found', () => {
      expect(parseStatementPeriod('No period here')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // parseSummary
  // ---------------------------------------------------------------------------

  describe('parseSummary', () => {
    it('should extract ending balance', () => {
      const summary = parseSummary(FULL_SAMPLE);
      expect(summary).not.toBeUndefined();
      expect(summary!.newBalance).toBe(459706.32);
    });

    it('should extract beginning balance', () => {
      const summary = parseSummary(FULL_SAMPLE);
      expect(summary!.previousBalance).toBe(197313.10);
    });

    it('should return undefined when no summary found', () => {
      expect(parseSummary('No summary here')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // parseAccountInfo
  // ---------------------------------------------------------------------------

  describe('parseAccountInfo', () => {
    it('should extract account number', () => {
      const info = parseAccountInfo(SAMPLE_HEADER);
      expect(info).not.toBeUndefined();
      expect(info!.accountNumber).toBe('221-1-47202-5');
    });

    it('should extract account holder name', () => {
      const info = parseAccountInfo(SAMPLE_HEADER);
      expect(info!.cardholderName).toBe('MR. DENNIS RODGER SILLER');
    });

    it('should detect K BIZ account type', () => {
      const info = parseAccountInfo(SAMPLE_HEADER + '\nK BIZ');
      expect(info!.cardType).toBe('Kasikorn K BIZ');
    });

    it('should detect K PLUS account type', () => {
      const info = parseAccountInfo('Issued by K PLUS');
      expect(info!.cardType).toBe('Kasikorn K PLUS');
    });
  });

  // ---------------------------------------------------------------------------
  // parseTransactions
  // ---------------------------------------------------------------------------

  describe('parseTransactions', () => {
    it('should parse K PLUS payment transactions', () => {
      const text = `
Issued by K PLUS
01-12-25197,313.10Beginning Balance
02-12-2510:23K PLUS241,943.10Paid for Ref XF001 บริษัท เอส จี จี 2023 จํากัดPayment270.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(270);
      expect(transactions[0].type).toBe('charge');
      expect(transactions[0].currency).toBe('THB');
      expect(transactions[0].description).toBe('บริษัท เอส จี จี 2023 จํากัด');
      expect(transactions[0].transactionTime).toBe('10:23');
    });

    it('should parse transfer deposits (negative amounts)', () => {
      const text = `
Issued by K PLUS
01-12-2513:42Internet/Mobile BBL242,313.10From BBL X3372 DENNIS RODGER SILL++Transfer Deposit45,000.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(-45000);
      expect(transactions[0].type).toBe('credit');
      expect(transactions[0].transactionTime).toBe('13:42');
    });

    it('should parse transfer withdrawals (positive amounts)', () => {
      const text = `
Issued by K PLUS
02-12-2520:14K PLUS241,385.60To X8750 MR. THONGSUK LUNGK++Transfer Withdrawal100.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(100);
      expect(transactions[0].type).toBe('charge');
      expect(transactions[0].transactionTime).toBe('20:14');
    });

    it('should parse ATM cash withdrawals', () => {
      const text = `
Issued by K PLUS
07-12-2500:50ATM237,398.60Ref Code ATM48014Cash Withdrawal1,000.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(1000);
      expect(transactions[0].type).toBe('charge');
    });

    it('should parse interest deposits', () => {
      const text = `
Issued by K PLUS
19-12-2523:59Automatic Transfer23,039.68Ref Code PCB09400Interest Deposit22.57
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(-22.57);
      expect(transactions[0].type).toBe('interest');
    });

    it('should parse withholding tax', () => {
      const text = `
Issued by K PLUS
19-12-2523:59Automatic Transfer23,036.29Ref Code PCB09400Withholding Tax Payable3.39
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(3.39);
      expect(transactions[0].type).toBe('fee');
    });

    it('should parse QR transfer deposits', () => {
      const text = `
Issued by K PLUS
08-12-2520:18EDC/K SHOP/MYQR233,762.85Ref Code KPP34629QR Transfer Deposit9,760.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(-9760);
      expect(transactions[0].type).toBe('credit');
    });

    it('should parse K BIZ deposits', () => {
      const text = `
Issued by K PLUS
29-12-2515:11K BIZ393,420.79From X2705 DIGICO CO.,LT++Transfer Deposit387,585.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(-387585);
      expect(transactions[0].type).toBe('credit');
    });

    it('should handle multi-line descriptions', () => {
      const text = `
Issued by K PLUS
02-12-2508:40EDC/K SHOP/MYQR242,213.10Paid for Ref X5001 VIRGIN
ACTIVE-C.FESTIVAL (A/C Name: VIRGIN
Payment100.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(100);
      expect(transactions[0].description).toContain('VIRGIN');
    });

    it('should skip Beginning Balance lines', () => {
      const text = `
Issued by K PLUS
01-12-25197,313.10Beginning Balance
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(0);
    });

    it('should skip page headers and footers', () => {
      const { transactions } = parseTransactions(SAMPLE_HEADER, undefined);
      expect(transactions).toHaveLength(0);
    });

    it('should sort transactions by date', () => {
      const text = `
Issued by K PLUS
05-12-2510:00K PLUS100.00DescriptionPayment50.00
02-12-2510:00K PLUS100.00DescriptionPayment30.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(2);
      expect(transactions[0].transactionDate.getDate()).toBe(2);
      expect(transactions[1].transactionDate.getDate()).toBe(5);
    });

    it('should parse large amounts correctly', () => {
      const text = `
Issued by K PLUS
10-12-2513:07K PLUS82,283.35SomePayment160,000.00
`;
      const { transactions } = parseTransactions(text, undefined);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(160000);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateConfidence
  // ---------------------------------------------------------------------------

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

    it('should increase confidence with period and summary', () => {
      const result: StatementParseResult = {
        success: true,
        parserKey: 'kasikorn',
        transactions: [],
        errors: [],
        warnings: [],
        confidence: 0,
        period: {
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-31'),
        },
        summary: { newBalance: 5000 },
      };
      expect(calculateConfidence(result)).toBe(45); // 20 + 15 + 10
    });

    it('should cap at 100', () => {
      const transactions = Array.from({ length: 20 }, (_, i) => ({
        transactionDate: new Date('2025-12-15'),
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
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-31'),
        },
        summary: { newBalance: 5000 },
        accountInfo: { cardType: 'Kasikorn K PLUS' },
      };
      expect(calculateConfidence(result)).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Full parse
  // ---------------------------------------------------------------------------

  describe('full parse', () => {
    it('should parse a complete K PLUS statement', () => {
      const result = kasikornParser.parse(FULL_SAMPLE);

      expect(result.success).toBe(true);
      expect(result.parserKey).toBe('kasikorn');
      expect(result.confidence).toBeGreaterThan(60);

      // Period
      expect(result.period).not.toBeUndefined();
      expect(result.period!.startDate.getMonth()).toBe(11); // December

      // Summary
      expect(result.summary).not.toBeUndefined();
      expect(result.summary!.newBalance).toBe(459706.32);
      expect(result.summary!.previousBalance).toBe(197313.10);

      // Account info
      expect(result.accountInfo).not.toBeUndefined();
      expect(result.accountInfo!.accountNumber).toBe('221-1-47202-5');

      // Transactions (sample has 12 real transactions)
      expect(result.transactions.length).toBeGreaterThan(0);

      // Check a payment
      const sgg = result.transactions.find((t) =>
        t.description.includes('เอส จี จี')
      );
      expect(sgg).not.toBeUndefined();
      expect(sgg!.amount).toBe(270);
      expect(sgg!.type).toBe('charge');

      // Check a deposit
      const deposit = result.transactions.find(
        (t) => t.amount === -45000
      );
      expect(deposit).not.toBeUndefined();
      expect(deposit!.type).toBe('credit');

      // Check interest
      const interest = result.transactions.find(
        (t) => t.type === 'interest'
      );
      expect(interest).not.toBeUndefined();
      expect(interest!.amount).toBe(-22.57);

      // Check fee
      const fee = result.transactions.find((t) => t.type === 'fee');
      expect(fee).not.toBeUndefined();
      expect(fee!.amount).toBe(3.39);
    });

    it('should return error for non-Kasikorn statements', () => {
      const result = kasikornParser.parse('Chase Sapphire Reserve Statement');
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Text does not appear to be a Kasikorn Bank statement'
      );
      expect(result.confidence).toBe(0);
    });

    it('should include raw text when requested', () => {
      const text = 'KASIKORNBANK Statement';
      const result = kasikornParser.parse(text, { includeRawText: true });
      expect(result.rawText).toBe(text);
    });

    it('should handle statement with no transactions', () => {
      const result = kasikornParser.parse('KASIKORNBANK\nNothing here');
      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(0);
      expect(result.warnings).toContain(
        'No transactions extracted from statement'
      );
    });
  });
});

describe('KASIKORN_IDENTIFIERS', () => {
  it('should include key identifiers', () => {
    expect(KASIKORN_IDENTIFIERS).toContain('kasikornbank');
    expect(KASIKORN_IDENTIFIERS).toContain('kbank');
    expect(KASIKORN_IDENTIFIERS).toContain('k plus');
    expect(KASIKORN_IDENTIFIERS).toContain('k biz');
    expect(KASIKORN_IDENTIFIERS).toContain('kbpdf');
    expect(KASIKORN_IDENTIFIERS).toContain('ธนาคารกสิกรไทย');
    expect(KASIKORN_IDENTIFIERS).toContain('the wisdom');
  });
});

describe('TYPE_KEYWORDS', () => {
  it('should include all K Bank transaction types', () => {
    expect(TYPE_KEYWORDS).toContain('Payment');
    expect(TYPE_KEYWORDS).toContain('Transfer Withdrawal');
    expect(TYPE_KEYWORDS).toContain('Transfer Deposit');
    expect(TYPE_KEYWORDS).toContain('Cash Withdrawal');
    expect(TYPE_KEYWORDS).toContain('QR Transfer Deposit');
    expect(TYPE_KEYWORDS).toContain('Interest Deposit');
    expect(TYPE_KEYWORDS).toContain('Withholding Tax Payable');
  });
});
