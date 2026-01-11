/**
 * Unit tests for Bangkok Bank (Bualuang mBanking) email parser
 */

import {
  bangkokBankParser,
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
  BBL_SENDER_PATTERNS,
  BBL_SUBJECT_PATTERNS,
  VENDOR_MAPPINGS,
} from '@/lib/email/extractors/bangkok-bank';
import type { RawEmailData } from '@/lib/email/types';

// Helper to create mock email data
function createMockEmail(overrides: Partial<RawEmailData> = {}): RawEmailData {
  return {
    message_id: 'test-message-id',
    uid: 1,
    folder: 'INBOX',
    subject: 'ยืนยันการชำระเงิน / Payments confirmation',
    from_address: 'BualuangmBanking@bangkokbank.com',
    from_name: 'Bangkok Bank',
    email_date: new Date('2025-11-15T14:30:00+07:00'),
    text_body: null,
    html_body: null,
    seen: false,
    has_attachments: false,
    ...overrides,
  };
}

describe('bangkokBankParser', () => {
  describe('canParse', () => {
    it('should return true for emails from BualuangmBanking@bangkokbank.com', () => {
      const email = createMockEmail({
        from_address: 'BualuangmBanking@bangkokbank.com',
      });
      expect(bangkokBankParser.canParse(email)).toBe(true);
    });

    it('should return true for emails from noreply@bangkokbank.com', () => {
      const email = createMockEmail({
        from_address: 'noreply@bangkokbank.com',
      });
      expect(bangkokBankParser.canParse(email)).toBe(true);
    });

    it('should handle case-insensitive sender matching', () => {
      const email = createMockEmail({
        from_address: 'BUALUANGMBANKING@BANGKOKBANK.COM',
      });
      expect(bangkokBankParser.canParse(email)).toBe(true);
    });

    it('should return true for emails with Bangkok Bank subject patterns', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'Payments confirmation',
      });
      expect(bangkokBankParser.canParse(email)).toBe(true);
    });

    it('should return true for Thai subject patterns', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'ยืนยันการโอนเงิน',
      });
      expect(bangkokBankParser.canParse(email)).toBe(true);
    });

    it('should return true for PromptPay subject patterns', () => {
      const email = createMockEmail({
        from_address: 'unknown@example.com',
        subject: 'PromptPay Top Up Confirmation',
      });
      expect(bangkokBankParser.canParse(email)).toBe(true);
    });

    it('should return false for unrelated emails', () => {
      const email = createMockEmail({
        from_address: 'no-reply@grab.com',
        subject: 'Your Grab E-Receipt',
      });
      expect(bangkokBankParser.canParse(email)).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract bill payment transaction data', () => {
      const email = createMockEmail({
        subject: 'ยืนยันการชำระเงิน / Payments confirmation',
        text_body: `
          Bualuang mBanking

          Payments Confirmation

          Date and Time: 15/11/2025 14:30:00

          Company: บริษัท ม่อนพญาพรหม จำกัด

          Amount: 2,500.00 Baht

          Reference No.: BBL202511150001234567

          Thank you for using Bualuang mBanking.
        `,
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Highlands');
      expect(result.data!.amount).toBe(2500);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.order_id).toBe('BBL202511150001234567');
      expect(result.data!.vendor_id).toBe('308791b3-c439-44a8-848a-2511539ea105');
      expect(result.data!.description).toBe('Golf');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should extract PromptPay mobile transfer data', () => {
      const email = createMockEmail({
        subject: 'ยืนยันรายการโอนเงินไปยังหมายเลขโทรศัพท์มือถือโดยพร้อมเพย์ / Confirmation of funds transfer to Mobile Phone Number by PromptPay',
        text_body: `
          Bangkok Bank Public Company Limited

          Confirmation of Funds Transfer to Mobile Phone Number by PromptPay

          Date and Time: 18/11/2025 09:15:00

          To PromptPay ID: 098-XXX-XXXX

          Beneficiary Name: SUPAPORN KID

          Amount: 150.00 Baht

          Reference No.: BBL202511180009876543

          Thank you for using Bualuang mBanking.
        `,
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Nidnoi');
      expect(result.data!.amount).toBe(150);
      expect(result.data!.currency).toBe('THB');
      expect(result.data!.vendor_id).toBe('504c68c7-9a78-4e84-aa35-255918fdc5bb');
      expect(result.data!.description).toBe('Coffee');
    });

    it('should extract funds transfer data', () => {
      const email = createMockEmail({
        subject: 'ยืนยันการโอนเงิน / Funds transfer confirmation',
        text_body: `
          Bangkok Bank Public Company Limited

          Funds Transfer Confirmation

          Date and Time: 06/11/2025 10:00:00

          To Bank: Kasikorn Bank

          To Account: 123-4-56789-0

          To Account Name: บจ. บลิส คลีน แอนด์ แคร์

          Amount: 2,958.00 Baht

          Reference No.: BBL202511060005551234

          Thank you for using Bualuang mBanking.
        `,
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Bliss Clean Care');
      expect(result.data!.amount).toBe(2958);
      expect(result.data!.vendor_id).toBe('2056927d-a36a-4328-b878-e59f3d3ff8fd');
      expect(result.data!.description).toBe('Monthly: Cleaning Service');
    });

    it('should extract PromptPay TopUp data', () => {
      const email = createMockEmail({
        subject: 'ยืนยันการเติมเงินพร้อมเพย์ / PromptPay Top Up Confirmation',
        text_body: `
          Bangkok Bank Public Company Limited

          PromptPay Top Up Confirmation

          Date and Time: 22/11/2025 16:45:00

          To Wallet: SCB มณี SHOP (ALL TIME PICKLEBALL)

          Amount: 500.00 Baht

          Reference No.: BBL202511220007778899

          Thank you for using Bualuang mBanking.
        `,
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('All Time Pickleball');
      expect(result.data!.amount).toBe(500);
      expect(result.data!.vendor_id).toBe('4a5a1340-7613-479f-8d37-f5a85eae85c7');
    });

    it('should handle unknown recipient', () => {
      const email = createMockEmail({
        subject: 'ยืนยันรายการโอนเงินไปยังเลขประจำตัวประชาชน / Confirmation of funds transfer to Citizen ID',
        text_body: `
          Bangkok Bank Public Company Limited

          Confirmation of Funds Transfer to Citizen ID by PromptPay

          Date and Time: 12/11/2025 11:20:00

          To PromptPay ID: 3-XXXX-XXXXX-XX-X

          Beneficiary Name: Somchai Jaidee

          Amount: 1,200.00 Baht

          Reference No.: BBL202511120003334455

          Thank you for using Bualuang mBanking.
        `,
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.vendor_name_raw).toBe('Somchai Jaidee');
      expect(result.data!.amount).toBe(1200);
      expect(result.data!.vendor_id).toBeUndefined();
      expect(result.data!.description).toBe('PromptPay Transfer');
    });

    it('should extract date from email body', () => {
      const email = createMockEmail({
        email_date: new Date('2025-11-20T00:00:00Z'),
        text_body: `
          Date and Time: 15/11/2025 14:30:00
          Amount: 500.00 Baht
        `,
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.transaction_date.getDate()).toBe(15);
      expect(result.data!.transaction_date.getMonth()).toBe(10); // November (0-indexed)
      expect(result.data!.transaction_date.getFullYear()).toBe(2025);
    });

    it('should use email date when body date not found', () => {
      const testDate = new Date('2025-11-25T14:00:00+07:00');
      const email = createMockEmail({
        email_date: testDate,
        text_body: 'Amount: 500.00 Baht',
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(true);
      expect(result.data!.transaction_date).toEqual(testDate);
    });

    it('should fail gracefully when no amount found', () => {
      const email = createMockEmail({
        text_body: 'Thank you for using Bualuang mBanking.',
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No THB amount found in email');
    });

    it('should fail gracefully when no body content', () => {
      const email = createMockEmail({
        text_body: null,
        html_body: null,
      });

      const result = bangkokBankParser.extract(email);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No email body content available');
    });
  });
});

describe('detectTransferType', () => {
  it('should detect payment confirmation', () => {
    expect(detectTransferType('Payments confirmation')).toBe('payment');
    expect(detectTransferType('ยืนยันการชำระเงิน')).toBe('payment');
  });

  it('should detect PromptPay mobile transfer', () => {
    expect(detectTransferType('Confirmation of funds transfer to Mobile Phone Number by PromptPay')).toBe('promptpay_mobile');
    expect(detectTransferType('โอนเงินไปยังหมายเลขโทรศัพท์มือถือโดยพร้อมเพย์')).toBe('promptpay_mobile');
  });

  it('should detect PromptPay Citizen ID transfer', () => {
    expect(detectTransferType('funds transfer to Citizen ID')).toBe('promptpay_citizen');
  });

  it('should detect funds transfer confirmation', () => {
    expect(detectTransferType('Funds transfer confirmation')).toBe('funds_transfer');
    expect(detectTransferType('ยืนยันการโอนเงิน')).toBe('funds_transfer');
  });

  it('should detect PromptPay Top Up', () => {
    expect(detectTransferType('PromptPay Top Up Confirmation')).toBe('promptpay_topup');
  });

  it('should return unknown for unrecognized subjects', () => {
    expect(detectTransferType('Some random email subject')).toBe('unknown');
  });
});

describe('decodeBase64Content', () => {
  it('should decode base64 content when long enough', () => {
    // Function requires decoded content > 50 chars
    const longText = 'This is a long enough string that will pass the threshold check and be decoded properly as base64 content.';
    const encoded = Buffer.from(longText).toString('base64');
    const result = decodeBase64Content(encoded);
    expect(result).toBe(longText);
  });

  it('should return original content if not base64', () => {
    const text = 'Plain text content';
    const result = decodeBase64Content(text);
    expect(result).toBe(text);
  });

  it('should return original for short base64 encoded content', () => {
    // Short base64 encoded text is returned as-is (threshold protection)
    const encoded = Buffer.from('Short text').toString('base64');
    const result = decodeBase64Content(encoded);
    // Returns original because decoded is too short
    expect(result).toBe(encoded);
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
  it('should extract THB amount with Baht suffix', () => {
    const result = extractAmount('Amount: 2,500.00 Baht');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2500);
  });

  it('should extract THB amount with Thai suffix', () => {
    const result = extractAmount('จำนวนเงิน: 1,500.00 บาท');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500);
  });

  it('should extract simple amount with Baht', () => {
    const result = extractAmount('Total 500.00 Baht');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
  });

  it('should return largest amount when multiple found', () => {
    const result = extractAmount('Fee: 50.00 Baht\nAmount: 1,000.00 Baht');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
  });

  it('should return null when no amount found', () => {
    const result = extractAmount('Thank you for using our service');
    expect(result).toBeNull();
  });
});

describe('extractRecipient', () => {
  it('should extract company name for payment', () => {
    const result = extractRecipient('Company: Test Company Ltd', 'payment');
    expect(result).toBe('Test Company Ltd');
  });

  it('should extract beneficiary name for PromptPay', () => {
    const result = extractRecipient('Beneficiary Name: John Doe', 'promptpay_mobile');
    expect(result).toBe('John Doe');
  });

  it('should extract account name for funds transfer', () => {
    const result = extractRecipient('To Account Name: ABC Company', 'funds_transfer');
    expect(result).toBe('ABC Company');
  });

  it('should extract wallet for TopUp', () => {
    const result = extractRecipient('To Wallet: TrueMoney Wallet', 'promptpay_topup');
    expect(result).toBe('TrueMoney Wallet');
  });

  it('should return null when no recipient found', () => {
    const result = extractRecipient('Thank you for your transfer', 'payment');
    expect(result).toBeNull();
  });
});

describe('extractReference', () => {
  it('should extract reference number', () => {
    const result = extractReference('Reference No.: BBL202511150001234567');
    expect(result).toBe('BBL202511150001234567');
  });

  it('should extract ref format', () => {
    const result = extractReference('Ref: ABC123456');
    expect(result).toBe('ABC123456');
  });

  it('should return null when no reference found', () => {
    const result = extractReference('Thank you for your transfer');
    expect(result).toBeNull();
  });
});

describe('extractTransactionDate', () => {
  it('should extract date from DD/MM/YYYY HH:MM:SS format', () => {
    const result = extractTransactionDate('Date and Time: 15/11/2025 14:30:00');
    expect(result).not.toBeNull();
    expect(result!.getDate()).toBe(15);
    expect(result!.getMonth()).toBe(10); // November (0-indexed)
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getHours()).toBe(14);
    expect(result!.getMinutes()).toBe(30);
  });

  it('should handle Thai date label', () => {
    const result = extractTransactionDate('วันที่: 20/12/2025 09:00:00');
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
    const result = lookupVendor('บริษัท ม่อนพญาพรหม จำกัด');
    expect(result.vendorId).toBe('308791b3-c439-44a8-848a-2511539ea105');
    expect(result.vendorName).toBe('Highlands');
    expect(result.description).toBe('Golf');
  });

  it('should find partial match vendor', () => {
    const result = lookupVendor('SUPAPORN KID');
    expect(result.vendorId).toBe('504c68c7-9a78-4e84-aa35-255918fdc5bb');
    expect(result.vendorName).toBe('Nidnoi');
  });

  it('should find case-insensitive match', () => {
    const result = lookupVendor('NA VANA');
    expect(result.vendorId).toBe('d6ee061e-e861-451d-bcc7-4edb384552f8');
    expect(result.vendorName).toBe('Vanaa');
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
    const vendorInfo = { vendorId: '123', vendorName: 'Test', description: 'Golf' };
    const result = buildDescription('payment', 'Test Vendor', vendorInfo);
    expect(result).toBe('Golf');
  });

  it('should return Bill Payment for payment type', () => {
    const result = buildDescription('payment', 'Test Vendor', { vendorName: 'Test' });
    expect(result).toBe('Bill Payment');
  });

  it('should return PromptPay Transfer for PromptPay types', () => {
    const result = buildDescription('promptpay_mobile', 'Test', { vendorName: 'Test' });
    expect(result).toBe('PromptPay Transfer');
  });

  it('should return Bank Transfer for funds transfer', () => {
    const result = buildDescription('funds_transfer', 'Test', { vendorName: 'Test' });
    expect(result).toBe('Bank Transfer');
  });

  it('should return TopUp for PromptPay TopUp', () => {
    const result = buildDescription('promptpay_topup', 'Test', { vendorName: 'Test' });
    expect(result).toBe('TopUp');
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
    expect(BBL_SENDER_PATTERNS).toContain('bualuangmbanking@bangkokbank.com');
    expect(BBL_SENDER_PATTERNS).toContain('noreply@bangkokbank.com');
  });

  it('should have all transfer type patterns', () => {
    expect(BBL_SUBJECT_PATTERNS.payment).toBeDefined();
    expect(BBL_SUBJECT_PATTERNS.promptpayMobile).toBeDefined();
    expect(BBL_SUBJECT_PATTERNS.promptpayCitizen).toBeDefined();
    expect(BBL_SUBJECT_PATTERNS.fundsTransfer).toBeDefined();
    expect(BBL_SUBJECT_PATTERNS.promptpayTopUp).toBeDefined();
  });

  it('should have vendor mappings', () => {
    expect(Object.keys(VENDOR_MAPPINGS).length).toBeGreaterThan(0);
  });
});
