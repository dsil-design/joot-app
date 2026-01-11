/**
 * Unit tests for Kasikorn Bank (K PLUS) email parser
 */

import {
  kasikornParser,
  detectTransferType,
  decodeBase64Content,
  stripHtml,
  extractAmount,
  extractRecipient,
  extractReference,
  extractTransactionDate,
  lookupVendor,
  buildDescription,
  isSelfTransfer,
  KPLUS_SENDER_PATTERNS,
  KPLUS_SUBJECT_PATTERNS,
  VENDOR_MAPPINGS,
} from '@/lib/email/extractors/kasikorn';
import type { RawEmailData } from '@/lib/email/types';

// Helper to create mock email data
function createMockEmail(overrides: Partial<RawEmailData> = {}): RawEmailData {
  return {
    message_id: 'test-message-id',
    uid: 1,
    folder: 'INBOX',
    subject: 'Result of Bill Payment (Success)',
    from_address: 'KPLUS@kasikornbank.com',
    from_name: 'K PLUS',
    email_date: new Date('2025-11-15T14:30:00+07:00'),
    text_body: null,
    html_body: null,
    seen: false,
    has_attachments: false,
    ...overrides,
  };
}

describe('kasikornParser', () => {
  describe('canParse', () => {
    it('should return true for emails from KPLUS@kasikornbank.com', () => {
      const email = createMockEmail({
        from_address: 'KPLUS@kasikornbank.com',
      });
      expect(kasikornParser.canParse(email)).toBe(true);
    });

    it('should return true for emails from noreply@kasikornbank.com', () => {
      const email = createMockEmail({
        from_address: 'noreply@kasikornbank.com',
      });
      expect(kasikornParser.canParse(email)).toBe(true);
    });

    it('should handle case-insensitive sender matching', () => {
      const email = createMockEmail({
        from_address: 'kplus@KASIKORNBANK.COM',
      });
      expect(kasikornParser.canParse(email)).toBe(true);
    });

    it('should return true for emails with K PLUS subject patterns', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Result of Bill Payment (Success)',
      });
      expect(kasikornParser.canParse(email)).toBe(true);
    });

    it('should return true for funds transfer subject pattern', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Result of Funds Transfer (Success)',
      });
      expect(kasikornParser.canParse(email)).toBe(true);
    });

    it('should return true for PromptPay subject patterns', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Result of PromptPay Funds Transfer (Success)',
      });
      expect(kasikornParser.canParse(email)).toBe(true);
    });

    it('should return false for unrelated emails', () => {
      const email = createMockEmail({
        from_address: 'no-reply@grab.com',
        subject: 'Your Grab E-Receipt',
      });
      expect(kasikornParser.canParse(email)).toBe(false);
    });

    it('should return false for Bangkok Bank emails', () => {
      const email = createMockEmail({
        from_address: 'BualuangmBanking@bangkokbank.com',
        subject: 'Payments confirmation',
      });
      expect(kasikornParser.canParse(email)).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract bill payment transaction data', () => {
      const email = createMockEmail({
        subject: 'Result of Bill Payment (Success)',
        text_body: `
          K PLUS

          Result of Bill Payment (Success)

          Transaction Date: 15/11/2025  14:30:00

          Transaction Number: KPLUS202511150001234567

          Company Name: Kunchai cha yen

          Amount (THB): 850.00

          Thank you for using K PLUS.
        `,
      });

      const result = kasikornParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Zigarlab');
      expect(result.data!.amount).toBe(850);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.order_id).toBe('KPLUS202511150001234567');
      expect(result.data!.vendor_id).toBe('f22be1ef-2cec-4c8c-9978-d6316147a51d');
      expect(result.data!.description).toBe('Vapes');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should extract funds transfer data', () => {
      const email = createMockEmail({
        subject: 'Result of Funds Transfer (Success)',
        text_body: `
          K PLUS

          Result of Funds Transfer (Success)

          Transaction Date: 06/11/2025  10:00:00

          Transaction Number: KPLUS202511060005551234

          To Bank: Bangkok Bank

          To Account: 123-4-56789-0

          Account Name: Kittitach

          Amount (THB): 12,500.00

          Thank you for using K PLUS.
        `,
      });

      const result = kasikornParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Chef Fuji');
      expect(result.data!.amount).toBe(12500);
      expect(result.data!.vendor_id).toBe('8f42f382-dd9a-49c8-8984-eea40169ec20');
      expect(result.data!.description).toBe('Meal Plan');
    });

    it('should extract PromptPay transfer data', () => {
      const email = createMockEmail({
        subject: 'Result of PromptPay Funds Transfer (Success)',
        text_body: `
          K PLUS

          Result of PromptPay Funds Transfer (Success)

          Transaction Date: 05/11/2025  18:45:00

          Transaction Number: KPLUS202511050008889999

          To PromptPay ID: 091-XXX-XXXX

          Received Name: MS. SUPAPORN KIDKLA

          Amount (THB): 180.00

          Thank you for using K PLUS.
        `,
      });

      const result = kasikornParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Nidnoi');
      expect(result.data!.amount).toBe(180);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.vendor_id).toBe('504c68c7-9a78-4e84-aa35-255918fdc5bb');
      expect(result.data!.description).toBe('Coffee');
    });

    it('should handle unknown recipient', () => {
      const email = createMockEmail({
        subject: 'Result of Funds Transfer (Success)',
        text_body: `
          K PLUS

          Result of Funds Transfer (Success)

          Transaction Date: 10/11/2025  09:30:00

          Transaction Number: KPLUS202511100003337777

          To Bank: SCB

          To Account: 555-5-55555-5

          Account Name: Some New Person

          Amount (THB): 500.00

          Thank you for using K PLUS.
        `,
      });

      const result = kasikornParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Some New Person');
      expect(result.data!.amount).toBe(500);
      expect(result.data!.vendor_id).toBeUndefined();
      expect(result.data!.description).toBe('Bank Transfer');
    });

    it('should extract date from email body', () => {
      const email = createMockEmail({
        email_date: new Date('2025-11-20T00:00:00Z'),
        text_body: `
          Transaction Date: 15/11/2025  14:30:00
          Amount (THB): 500.00
        `,
      });

      const result = kasikornParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.transaction_date.getDate()).toBe(15);
      expect(result.data!.transaction_date.getMonth()).toBe(10); // November (0-indexed)
      expect(result.data!.transaction_date.getFullYear()).toBe(2025);
    });

    it('should use email date when body date not found', () => {
      const testDate = new Date('2025-11-25T14:00:00+07:00');
      const email = createMockEmail({
        email_date: testDate,
        text_body: 'Amount (THB): 500.00',
      });

      const result = kasikornParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.transaction_date).toEqual(testDate);
    });

    it('should fail gracefully when no amount found', () => {
      const email = createMockEmail({
        text_body: 'Thank you for using K PLUS.',
      });

      const result = kasikornParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No THB amount found in email');
    });

    it('should fail gracefully when no body content', () => {
      const email = createMockEmail({
        text_body: null,
        html_body: null,
      });

      const result = kasikornParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No email body content available');
    });
  });
});

describe('detectTransferType', () => {
  it('should detect bill payment', () => {
    expect(detectTransferType('Result of Bill Payment (Success)')).toBe('bill_payment');
    expect(detectTransferType('Bill Payment (Success)')).toBe('bill_payment');
  });

  it('should detect funds transfer', () => {
    expect(detectTransferType('Result of Funds Transfer (Success)')).toBe('funds_transfer');
    expect(detectTransferType('Funds Transfer (Success)')).toBe('funds_transfer');
  });

  it('should detect PromptPay transfer', () => {
    expect(detectTransferType('Result of PromptPay Funds Transfer (Success)')).toBe('promptpay_transfer');
    expect(detectTransferType('PromptPay Funds Transfer (Success)')).toBe('promptpay_transfer');
  });

  it('should return unknown for unrecognized subjects', () => {
    expect(detectTransferType('Some random email subject')).toBe('unknown');
  });
});

describe('decodeBase64Content', () => {
  it('should decode base64 content', () => {
    const encoded = Buffer.from('Hello World').toString('base64');
    const result = decodeBase64Content(encoded);
    expect(result).toBe('Hello World');
  });

  it('should return original content if not base64', () => {
    const text = 'Plain text content';
    const result = decodeBase64Content(text);
    expect(result).toBe(text);
  });

  it('should handle mixed content with base64 blocks', () => {
    const text = 'Some header\n' + Buffer.from('Decoded content here').toString('base64');
    const result = decodeBase64Content(text);
    expect(result).toContain('Decoded content here');
  });
});

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    const html = '<div><p>Hello <strong>World</strong></p></div>';
    const result = stripHtml(html);
    expect(result).toBe('Hello World');
  });

  it('should remove style blocks', () => {
    const html = '<style>body { color: red; }</style><p>Content</p>';
    const result = stripHtml(html);
    expect(result).toBe('Content');
  });

  it('should decode HTML entities', () => {
    const html = '<p>Hello&nbsp;World &amp; Friends</p>';
    const result = stripHtml(html);
    expect(result).toContain('Hello World & Friends');
  });

  it('should normalize whitespace', () => {
    const html = '<p>Hello    \n\n   World</p>';
    const result = stripHtml(html);
    expect(result).toBe('Hello World');
  });
});

describe('extractAmount', () => {
  it('should extract THB amount with (THB) label', () => {
    const result = extractAmount('Amount (THB): 2,500.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2500);
  });

  it('should extract THB amount with THB suffix', () => {
    const result = extractAmount('Total: 1,500.00 THB');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500);
  });

  it('should extract simple amount with Baht', () => {
    const result = extractAmount('Total 500.00 Baht');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
  });

  it('should return largest amount when multiple found', () => {
    const result = extractAmount('Fee: 50.00 THB\nAmount (THB): 1,000.00');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
  });

  it('should return null when no amount found', () => {
    const result = extractAmount('Thank you for using our service');
    expect(result).toBeNull();
  });
});

describe('extractRecipient', () => {
  it('should extract company name for bill payment', () => {
    const result = extractRecipient('Company Name: Test Company Ltd', 'bill_payment');
    expect(result).toBe('Test Company Ltd');
  });

  it('should extract received name for PromptPay', () => {
    const result = extractRecipient('Received Name: John Doe', 'promptpay_transfer');
    expect(result).toBe('John Doe');
  });

  it('should extract account name for funds transfer', () => {
    const result = extractRecipient('Account Name: ABC Company', 'funds_transfer');
    expect(result).toBe('ABC Company');
  });

  it('should return null when no recipient found', () => {
    const result = extractRecipient('Thank you for your transfer', 'bill_payment');
    expect(result).toBeNull();
  });
});

describe('extractReference', () => {
  it('should extract transaction number', () => {
    const result = extractReference('Transaction Number: KPLUS202511150001234567');
    expect(result).toBe('KPLUS202511150001234567');
  });

  it('should extract transaction no format', () => {
    const result = extractReference('Transaction No.: ABC123456');
    expect(result).toBe('ABC123456');
  });

  it('should return null when no reference found', () => {
    const result = extractReference('Thank you for your transfer');
    expect(result).toBeNull();
  });
});

describe('extractTransactionDate', () => {
  it('should extract date from Transaction Date format', () => {
    const result = extractTransactionDate('Transaction Date: 15/11/2025  14:30:00');
    expect(result).not.toBeNull();
    expect(result!.getDate()).toBe(15);
    expect(result!.getMonth()).toBe(10); // November (0-indexed)
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getHours()).toBe(14);
    expect(result!.getMinutes()).toBe(30);
  });

  it('should handle simple date format', () => {
    const result = extractTransactionDate('20/12/2025 09:00:00');
    expect(result).not.toBeNull();
    expect(result!.getDate()).toBe(20);
    expect(result!.getMonth()).toBe(11); // December
  });

  it('should return null when no date found', () => {
    const result = extractTransactionDate('Thank you for your transfer');
    expect(result).toBeNull();
  });
});

describe('lookupVendor', () => {
  it('should find exact match vendor', () => {
    const result = lookupVendor('Kunchai cha yen');
    expect(result.vendorId).toBe('f22be1ef-2cec-4c8c-9978-d6316147a51d');
    expect(result.vendorName).toBe('Zigarlab');
    expect(result.description).toBe('Vapes');
  });

  it('should find partial match vendor', () => {
    const result = lookupVendor('MS. SUPAPORN KIDKLA');
    expect(result.vendorId).toBe('504c68c7-9a78-4e84-aa35-255918fdc5bb');
    expect(result.vendorName).toBe('Nidnoi');
  });

  it('should find case-insensitive match', () => {
    const result = lookupVendor('KITTITACH');
    expect(result.vendorId).toBe('8f42f382-dd9a-49c8-8984-eea40169ec20');
    expect(result.vendorName).toBe('Chef Fuji');
  });

  it('should return raw name for unknown vendor', () => {
    const result = lookupVendor('Unknown Person');
    expect(result.vendorId).toBeUndefined();
    expect(result.vendorName).toBe('Unknown Person');
    expect(result.description).toBeUndefined();
  });
});

describe('buildDescription', () => {
  it('should use vendor description when available', () => {
    const vendorInfo = { vendorId: '123', vendorName: 'Test', description: 'Vapes' };
    const result = buildDescription('bill_payment', 'Test Vendor', vendorInfo);
    expect(result).toBe('Vapes');
  });

  it('should return Bill Payment for bill payment type', () => {
    const result = buildDescription('bill_payment', 'Test Vendor', { vendorName: 'Test' });
    expect(result).toBe('Bill Payment');
  });

  it('should return PromptPay Transfer for PromptPay type', () => {
    const result = buildDescription('promptpay_transfer', 'Test', { vendorName: 'Test' });
    expect(result).toBe('PromptPay Transfer');
  });

  it('should return Bank Transfer for funds transfer', () => {
    const result = buildDescription('funds_transfer', 'Test', { vendorName: 'Test' });
    expect(result).toBe('Bank Transfer');
  });
});

describe('isSelfTransfer', () => {
  it('should detect TrueMoney self transfer', () => {
    const result = isSelfTransfer('Transfer to TrueMoney Wallet', 'TrueMoney');
    expect(result).toBe(true);
  });

  it('should detect LINE Pay self transfer', () => {
    const result = isSelfTransfer('Transfer to LINE Pay', 'LINE Pay');
    expect(result).toBe(true);
  });

  it('should not flag normal transfers as self', () => {
    const result = isSelfTransfer('Transfer to vendor', 'Some Vendor');
    expect(result).toBe(false);
  });

  it('should not flag null recipient', () => {
    const result = isSelfTransfer('Transfer', null);
    expect(result).toBe(false);
  });
});

describe('Constants', () => {
  it('should have correct sender patterns', () => {
    expect(KPLUS_SENDER_PATTERNS).toContain('kplus@kasikornbank.com');
    expect(KPLUS_SENDER_PATTERNS).toContain('noreply@kasikornbank.com');
  });

  it('should have all transfer type patterns', () => {
    expect(KPLUS_SUBJECT_PATTERNS.billPayment).toBeDefined();
    expect(KPLUS_SUBJECT_PATTERNS.fundsTransfer).toBeDefined();
    expect(KPLUS_SUBJECT_PATTERNS.promptpayTransfer).toBeDefined();
  });

  it('should have vendor mappings', () => {
    expect(Object.keys(VENDOR_MAPPINGS).length).toBeGreaterThan(0);
  });
});
