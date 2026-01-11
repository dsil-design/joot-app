/**
 * Kasikorn Bank (K PLUS) Email Parser
 *
 * Parses email confirmations from Kasikorn Bank's K PLUS app:
 * - Bill Payment (to merchant/company)
 * - Funds Transfer (bank-to-bank)
 * - PromptPay Funds Transfer (to mobile/ID)
 *
 * Key patterns:
 * - Sender: KPLUS@kasikornbank.com
 * - Subject: English (e.g., "Result of Bill Payment (Success)")
 * - Currency: Always THB
 * - Content: Bilingual (Thai section first, then English)
 * - These are direct bank transfers, no CC matching needed
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction } from '../types';

// Kasikorn sender patterns
const KPLUS_SENDER_PATTERNS = [
  'kplus@kasikornbank.com',
  'noreply@kasikornbank.com',
];

// Subject patterns for different transfer types
const KPLUS_SUBJECT_PATTERNS = {
  billPayment: ['result of bill payment', 'bill payment (success)'],
  fundsTransfer: ['result of funds transfer', 'funds transfer (success)'],
  promptpayTransfer: ['result of promptpay funds transfer', 'promptpay funds transfer (success)'],
};

// Amount extraction patterns
// THB amount in format "Amount (THB): X,XXX.XX" or "X,XXX.XX THB"
const THB_AMOUNT_PATTERN = /amount\s*\(?thb\)?[:\s]*([\d,]+(?:\.\d{2})?)/gi;
const SIMPLE_AMOUNT_PATTERN = /([\d,]+(?:\.\d{2})?)\s*(?:thb|baht|บาท)/gi;

// Reference/Transaction number pattern
const TRANSACTION_NUMBER_PATTERN = /transaction\s*(?:no\.?|number)?[:\s]*([A-Z0-9]+)/gi;

// Date/time extraction pattern (DD/MM/YYYY HH:MM:SS)
const DATE_PATTERN = /transaction\s*date[:\s]*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/gi;
const SIMPLE_DATE_PATTERN = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/gi;

// Known K PLUS vendor mappings from TRANSACTION-IMPORT-REFERENCE.md
const VENDOR_MAPPINGS: Record<string, { vendorId: string; vendorName: string; description?: string }> = {
  // Companies (Bill Payment)
  'kunchai cha yen': { vendorId: 'f22be1ef-2cec-4c8c-9978-d6316147a51d', vendorName: 'Zigarlab', description: 'Vapes' },
  'mk restaurant': { vendorId: '47a9df0f-7813-44a8-8849-d9119a957057', vendorName: 'MK Restaurant' },
  'minimal coffee': { vendorId: '8d4f8c89-0329-49ea-bccb-d88d70a74efc', vendorName: 'Minimal Coffee', description: 'Coffee' },
  'liquor shop': { vendorId: 'c49f435b-18c4-4f6d-8e4b-12b9f721e20d', vendorName: 'Liquor Shop' },

  // Individuals (Funds Transfer / PromptPay)
  'kittitach': { vendorId: '8f42f382-dd9a-49c8-8984-eea40169ec20', vendorName: 'Chef Fuji', description: 'Meal Plan' },
  'chaiyut': { vendorId: '24e01082-dd4f-4292-afd8-5b13c7177cc1', vendorName: "Leigh's Van Driver", description: 'Wedding Transport' },
  'patcharin': { vendorId: '1d45930f-7a7d-4c00-a2fb-8e3fff8d1426', vendorName: 'At Nata Resort', description: 'Drink' },
  'tang shop': { vendorId: 'fda28045-cd65-49bf-9ba4-0f333ccfec89', vendorName: 'Grab Driver', description: 'Delivery Fee' },
  'wassana jamsri': { vendorId: '4a5a1340-7613-479f-8d37-f5a85eae85c7', vendorName: 'All Time Pickleball', description: 'Pickleball Tournament' },

  // Supaporn / Nidnoi (multiple name variations)
  'ms. supaporn kidkla': { vendorId: '504c68c7-9a78-4e84-aa35-255918fdc5bb', vendorName: 'Nidnoi', description: 'Coffee' },
  'supaporn kidkla': { vendorId: '504c68c7-9a78-4e84-aa35-255918fdc5bb', vendorName: 'Nidnoi', description: 'Coffee' },
  'น.ส. สุภาภรณ์ คิดกล้า': { vendorId: '504c68c7-9a78-4e84-aa35-255918fdc5bb', vendorName: 'Nidnoi', description: 'Coffee' },

  // Pee Tik (multiple name variations)
  'chayaphorn bu': { vendorId: '9bd673d9-d0c0-4184-99de-bcaffa7cacc4', vendorName: 'Pee Tik', description: 'Massage' },
  'นางสาว ชยภร บัวเสน': { vendorId: '9bd673d9-d0c0-4184-99de-bcaffa7cacc4', vendorName: 'Pee Tik', description: 'Massage' },
};

// Transfer type based on subject
type TransferType = 'bill_payment' | 'funds_transfer' | 'promptpay_transfer' | 'unknown';

/**
 * Detect transfer type from email subject
 */
function detectTransferType(subject: string): TransferType {
  const lowerSubject = subject.toLowerCase();

  if (KPLUS_SUBJECT_PATTERNS.billPayment.some(p => lowerSubject.includes(p.toLowerCase()))) {
    return 'bill_payment';
  }
  if (KPLUS_SUBJECT_PATTERNS.fundsTransfer.some(p => lowerSubject.includes(p.toLowerCase()))) {
    return 'funds_transfer';
  }
  if (KPLUS_SUBJECT_PATTERNS.promptpayTransfer.some(p => lowerSubject.includes(p.toLowerCase()))) {
    return 'promptpay_transfer';
  }

  return 'unknown';
}

/**
 * Decode base64 content if present
 */
function decodeBase64Content(body: string): string {
  // Check if body appears to be base64 encoded
  const base64Pattern = /^[A-Za-z0-9+/=\s]+$/;

  // Try to find base64 content blocks
  const lines = body.split('\n');
  const base64Lines: string[] = [];
  let inBase64Block = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Base64 lines are typically 76 chars or a multiple, and contain only base64 chars
    if (trimmed.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
      inBase64Block = true;
      base64Lines.push(trimmed);
    } else if (inBase64Block && trimmed === '') {
      continue;
    } else if (inBase64Block && trimmed.length < 50 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
      // Last line of base64 (padding)
      base64Lines.push(trimmed);
    } else {
      inBase64Block = false;
    }
  }

  if (base64Lines.length > 0) {
    try {
      const base64Content = base64Lines.join('');
      const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
      if (decoded && decoded.length > 100) {
        return decoded;
      }
    } catch {
      // Not valid base64, return original
    }
  }

  // Also try the whole body if it looks like pure base64
  if (base64Pattern.test(body.replace(/\s/g, '')) && body.length > 100) {
    try {
      const decoded = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
      if (decoded && decoded.length > 50) {
        return decoded;
      }
    } catch {
      // Not valid base64
    }
  }

  return body;
}

/**
 * Strip HTML tags and normalize whitespace
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script blocks
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&') // Replace &amp;
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10))) // Decode numeric entities
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract THB amount from email body
 */
function extractAmount(body: string): { amount: number; confidence: number } | null {
  const allMatches: number[] = [];

  // Try specific amount patterns first
  let match;
  THB_AMOUNT_PATTERN.lastIndex = 0;
  while ((match = THB_AMOUNT_PATTERN.exec(body)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
      allMatches.push(amount);
    }
  }

  if (allMatches.length > 0) {
    // For bank transfers, usually there's one amount - take the largest
    return { amount: Math.max(...allMatches), confidence: 95 };
  }

  // Try simpler pattern
  SIMPLE_AMOUNT_PATTERN.lastIndex = 0;
  while ((match = SIMPLE_AMOUNT_PATTERN.exec(body)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
      allMatches.push(amount);
    }
  }

  if (allMatches.length === 0) {
    return null;
  }

  return { amount: Math.max(...allMatches), confidence: 80 };
}

/**
 * Extract recipient name from email body based on transfer type
 */
function extractRecipient(body: string, transferType: TransferType): string | null {
  const patterns: RegExp[] = [];

  switch (transferType) {
    case 'bill_payment':
      patterns.push(
        /company\s*name[:\s]+([^\n<]+)/i,
        /merchant[:\s]+([^\n<]+)/i,
        /biller[:\s]+([^\n<]+)/i,
        /ชื่อบริษัท[:\s]+([^\n<]+)/i,
      );
      break;

    case 'funds_transfer':
      patterns.push(
        /account\s*name[:\s]+([^\n<]+)/i,
        /to\s*account\s*name[:\s]+([^\n<]+)/i,
        /beneficiary\s*name[:\s]+([^\n<]+)/i,
        /ชื่อบัญชี[:\s]+([^\n<]+)/i,
      );
      break;

    case 'promptpay_transfer':
      patterns.push(
        /received\s*name[:\s]+([^\n<]+)/i,
        /recipient\s*name[:\s]+([^\n<]+)/i,
        /beneficiary\s*name[:\s]+([^\n<]+)/i,
        /ชื่อผู้รับ[:\s]+([^\n<]+)/i,
      );
      break;

    default:
      patterns.push(
        /(?:to|recipient|beneficiary)[:\s]+([^\n<]+)/i,
        /(?:ผู้รับ|ชื่อผู้รับ)[:\s]+([^\n<]+)/i,
      );
  }

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const recipient = match[1].trim();
      // Clean up recipient name
      return recipient
        .replace(/<[^>]*>/g, '') // Remove any HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }
  }

  return null;
}

/**
 * Extract reference/transaction number from email body
 */
function extractReference(body: string): string | null {
  TRANSACTION_NUMBER_PATTERN.lastIndex = 0;
  const match = TRANSACTION_NUMBER_PATTERN.exec(body);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extract transaction date from email body
 */
function extractTransactionDate(body: string): Date | null {
  // Try the specific "Transaction Date:" pattern first
  DATE_PATTERN.lastIndex = 0;
  let match = DATE_PATTERN.exec(body);

  if (!match) {
    // Fall back to simple date pattern
    SIMPLE_DATE_PATTERN.lastIndex = 0;
    match = SIMPLE_DATE_PATTERN.exec(body);
  }

  if (match) {
    // Date format: DD/MM/YYYY HH:MM:SS
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
    const year = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const second = parseInt(match[6], 10);

    const date = new Date(year, month, day, hour, minute, second);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

/**
 * Look up vendor from recipient name
 */
function lookupVendor(recipientName: string): { vendorId?: string; vendorName: string; description?: string } {
  const lowerRecipient = recipientName.toLowerCase();

  // Check exact matches first
  for (const [key, value] of Object.entries(VENDOR_MAPPINGS)) {
    if (key.toLowerCase() === lowerRecipient) {
      return value;
    }
  }

  // Check partial matches
  for (const [key, value] of Object.entries(VENDOR_MAPPINGS)) {
    if (lowerRecipient.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerRecipient)) {
      return value;
    }
  }

  // No match found - use raw recipient name
  return { vendorName: recipientName };
}

/**
 * Build description from transfer type and recipient
 */
function buildDescription(transferType: TransferType, recipientName: string | null, vendorInfo: ReturnType<typeof lookupVendor>): string {
  // If vendor lookup found a description, use it
  if (vendorInfo.description) {
    return vendorInfo.description;
  }

  // Default descriptions by transfer type
  switch (transferType) {
    case 'bill_payment':
      return 'Bill Payment';
    case 'funds_transfer':
      return 'Bank Transfer';
    case 'promptpay_transfer':
      return 'PromptPay Transfer';
    default:
      return 'Transfer';
  }
}

/**
 * Check if this appears to be a self-transfer (to user's own account)
 */
function isSelfTransfer(body: string, recipientName: string | null): boolean {
  if (!recipientName) return false;

  const lowerRecipient = recipientName.toLowerCase();
  const lowerBody = body.toLowerCase();

  // Check for common self-transfer indicators
  const selfIndicators = [
    'same name as sender',
    'own account',
    'truemoney', // TrueMoney wallet TopUp to self
    'line pay', // LINE Pay TopUp to self
    'rabbit line pay',
  ];

  for (const indicator of selfIndicators) {
    if (lowerRecipient.includes(indicator) || lowerBody.includes(indicator)) {
      return true;
    }
  }

  return false;
}

/**
 * Kasikorn Bank Email Parser implementation
 */
export const kasikornParser: EmailParser = {
  key: 'kasikorn',
  name: 'Kasikorn Bank (K PLUS) Parser',

  /**
   * Check if this parser can handle the given email
   */
  canParse(email: RawEmailData): boolean {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Check sender
    const isFromKPlus = KPLUS_SENDER_PATTERNS.some(pattern =>
      fromAddress.includes(pattern)
    );

    if (isFromKPlus) {
      return true;
    }

    // Check subject for K PLUS patterns
    const allPatterns = Object.values(KPLUS_SUBJECT_PATTERNS).flat();
    const hasKPlusSubject = allPatterns.some(pattern =>
      subject.includes(pattern.toLowerCase())
    );

    return hasKPlusSubject;
  },

  /**
   * Extract transaction data from Kasikorn Bank email
   */
  extract(email: RawEmailData): ExtractionResult {
    const errors: string[] = [];
    const notes: string[] = [];

    // Get body content - prefer text, then HTML
    let body = email.text_body || email.html_body || '';

    if (!body) {
      return {
        success: false,
        confidence: 0,
        errors: ['No email body content available'],
      };
    }

    // Try to decode base64 content
    body = decodeBase64Content(body);

    // Strip HTML if present
    if (body.includes('<') && body.includes('>')) {
      body = stripHtml(body);
    }

    // Detect transfer type
    const transferType = detectTransferType(email.subject || '');
    if (transferType === 'unknown') {
      notes.push('Unknown transfer type - using generic extraction');
    }

    // Extract amount
    const amountResult = extractAmount(body);
    if (!amountResult) {
      return {
        success: false,
        confidence: 0,
        errors: ['No THB amount found in email'],
      };
    }

    // Extract recipient
    const recipientName = extractRecipient(body, transferType);
    if (!recipientName) {
      notes.push('Could not extract recipient name');
    }

    // Check for self-transfer
    if (recipientName && isSelfTransfer(body, recipientName)) {
      notes.push('Possible self-transfer - verify with user');
    }

    // Look up vendor
    const vendorInfo = lookupVendor(recipientName || 'Unknown Recipient');

    // Extract reference number
    const reference = extractReference(body);
    if (!reference) {
      notes.push('No reference number found');
    }

    // Extract transaction date from body (more accurate than email date)
    const transactionDate = extractTransactionDate(body) || email.email_date;

    // Build description
    const description = buildDescription(transferType, recipientName, vendorInfo);

    // Calculate confidence
    let confidence = 40; // Base: required fields present

    // Amount found
    confidence += 20;

    // Date extracted
    if (extractTransactionDate(body)) {
      confidence += 20;
    } else {
      confidence += 10; // Using email date as fallback
    }

    // Vendor identified
    if (vendorInfo.vendorId) {
      confidence += 10;
    }

    // Reference found
    if (reference) {
      confidence += 10;
    }

    // Build extracted transaction
    const data: ExtractedTransaction = {
      vendor_name_raw: vendorInfo.vendorName,
      amount: amountResult.amount,
      currency: 'THB',
      transaction_date: transactionDate,
      description,
      order_id: reference,
    };

    // Add vendor ID if known
    if (vendorInfo.vendorId) {
      data.vendor_id = vendorInfo.vendorId;
    }

    return {
      success: true,
      confidence: Math.min(confidence, 100),
      data,
      notes: notes.length > 0 ? notes.join('; ') : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

// Export helper functions for testing
export {
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
};
