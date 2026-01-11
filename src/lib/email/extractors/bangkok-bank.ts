/**
 * Bangkok Bank (Bualuang mBanking) Email Parser
 *
 * Parses email confirmations from Bangkok Bank's Bualuang mBanking app:
 * - Payments (Bill Payment to merchant/company)
 * - PromptPay to Mobile Phone Number
 * - PromptPay to Citizen ID
 * - Funds Transfer (bank-to-bank)
 * - PromptPay Top Up
 *
 * Key patterns:
 * - Sender: BualuangmBanking@bangkokbank.com
 * - Subject: Thai + English (e.g., "ยืนยันการชำระเงิน / Payments confirmation")
 * - Currency: Always THB
 * - Content: Base64-encoded HTML, bilingual format
 * - These are direct bank transfers, no CC matching needed
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction } from '../types';

// Bangkok Bank sender patterns
const BBL_SENDER_PATTERNS = [
  'bualuangmbanking@bangkokbank.com',
  'noreply@bangkokbank.com',
];

// Subject patterns for different transfer types
const BBL_SUBJECT_PATTERNS = {
  payment: ['payments confirmation', 'ยืนยันการชำระเงิน'],
  promptpayMobile: ['funds transfer to mobile phone number by promptpay', 'โอนเงินไปยังหมายเลขโทรศัพท์มือถือโดยพร้อมเพย์'],
  promptpayCitizen: ['funds transfer to citizen id', 'โอนเงินไปยังเลขประจำตัวประชาชน'],
  fundsTransfer: ['funds transfer confirmation', 'ยืนยันการโอนเงิน'],
  promptpayTopUp: ['promptpay top up confirmation', 'ยืนยันการเติมเงินพร้อมเพย์'],
};

// Amount extraction patterns
// THB amount in format "X,XXX.XX Baht" or "X,XXX.XX บาท"
const THB_AMOUNT_PATTERN = /(?:amount|จำนวนเงิน)[:\s]*(?:THB\s*)?([\d,]+(?:\.\d{2})?)\s*(?:baht|บาท)?/gi;
const SIMPLE_AMOUNT_PATTERN = /([\d,]+(?:\.\d{2})?)\s*(?:baht|บาท)/gi;

// Reference number pattern
const REFERENCE_PATTERN = /(?:reference\s*(?:no\.?|number)?|ref\.?)[:\s]*([A-Z0-9]+)/gi;

// Date/time extraction pattern (DD/MM/YYYY HH:MM:SS)
const DATE_PATTERN = /(?:date\s*(?:and\s*time)?|วันที่)[:\s]*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/gi;

// Known Bangkok Bank vendor mappings from TRANSACTION-IMPORT-REFERENCE.md
const VENDOR_MAPPINGS: Record<string, { vendorId: string; vendorName: string; description?: string }> = {
  // Companies (Payments / Bill Payment)
  'บริษัท ม่อนพญาพรหม จำกัด': { vendorId: '308791b3-c439-44a8-848a-2511539ea105', vendorName: 'Highlands', description: 'Golf' },
  'mon phaya phrom': { vendorId: '308791b3-c439-44a8-848a-2511539ea105', vendorName: 'Highlands', description: 'Golf' },
  'บริษัท เฮลธ์ลิ้งค์ จำกัด': { vendorId: 'a07811f5-de1a-49d1-8ec5-352137551174', vendorName: 'Alpine Golf Club', description: 'Golf' },
  'healthlink': { vendorId: 'a07811f5-de1a-49d1-8ec5-352137551174', vendorName: 'Alpine Golf Club', description: 'Golf' },
  'na vana': { vendorId: 'd6ee061e-e861-451d-bcc7-4edb384552f8', vendorName: 'Vanaa', description: 'Drinks' },
  'm sport complex': { vendorId: 'a7ac24a7-7966-4a07-8ac2-a63b69ca5cff', vendorName: 'MSport', description: 'Sports/Recreation' },
  'scb มณี shop (all time pickleball)': { vendorId: '4a5a1340-7613-479f-8d37-f5a85eae85c7', vendorName: 'All Time Pickleball', description: 'Pickleball' },
  'all time pickleball': { vendorId: '4a5a1340-7613-479f-8d37-f5a85eae85c7', vendorName: 'All Time Pickleball', description: 'Pickleball' },
  'คุณชายชาเย็น': { vendorId: 'f22be1ef-2cec-4c8c-9978-d6316147a51d', vendorName: 'Zigarlab', description: 'Vapes' },
  'kunchai cha yen': { vendorId: 'f22be1ef-2cec-4c8c-9978-d6316147a51d', vendorName: 'Zigarlab', description: 'Vapes' },
  'ร้านถุงเงิน (นอร์ธฮิลล์ กอล์ฟ คลับ)': { vendorId: '4df2d271-cc02-4c9b-92e7-cb9d665795f5', vendorName: 'North Hill', description: 'Golf' },
  'north hill': { vendorId: '4df2d271-cc02-4c9b-92e7-cb9d665795f5', vendorName: 'North Hill', description: 'Golf' },
  'janjira photo': { vendorId: '08ab6daf-e47c-4756-96ee-4c09ccd7876d', vendorName: 'Janjira Photo', description: 'Photography' },

  // Individuals (Funds Transfer)
  'บจ. บลิส คลีน แอนด์ แคร์': { vendorId: '2056927d-a36a-4328-b878-e59f3d3ff8fd', vendorName: 'Bliss Clean Care', description: 'Monthly: Cleaning Service' },
  'bliss clean': { vendorId: '2056927d-a36a-4328-b878-e59f3d3ff8fd', vendorName: 'Bliss Clean Care', description: 'Monthly: Cleaning Service' },

  // Individuals (PromptPay to Mobile) - partial phone numbers
  '004xx-xxx-xxx-9197': { vendorId: '8f42f382-dd9a-49c8-8984-eea40169ec20', vendorName: 'Chef Fuji', description: 'Meal Plan' },
  'supaporn kid': { vendorId: '504c68c7-9a78-4e84-aa35-255918fdc5bb', vendorName: 'Nidnoi', description: 'Coffee' },
};

// Transfer type based on subject
type TransferType = 'payment' | 'promptpay_mobile' | 'promptpay_citizen' | 'funds_transfer' | 'promptpay_topup' | 'unknown';

/**
 * Detect transfer type from email subject
 */
function detectTransferType(subject: string): TransferType {
  const lowerSubject = subject.toLowerCase();

  if (BBL_SUBJECT_PATTERNS.payment.some(p => lowerSubject.includes(p.toLowerCase()))) {
    return 'payment';
  }
  if (BBL_SUBJECT_PATTERNS.promptpayMobile.some(p => lowerSubject.includes(p.toLowerCase()))) {
    return 'promptpay_mobile';
  }
  if (BBL_SUBJECT_PATTERNS.promptpayCitizen.some(p => lowerSubject.includes(p.toLowerCase()))) {
    return 'promptpay_citizen';
  }
  if (BBL_SUBJECT_PATTERNS.fundsTransfer.some(p => lowerSubject.includes(p.toLowerCase()))) {
    return 'funds_transfer';
  }
  if (BBL_SUBJECT_PATTERNS.promptpayTopUp.some(p => lowerSubject.includes(p.toLowerCase()))) {
    return 'promptpay_topup';
  }

  return 'unknown';
}

/**
 * Decode base64 content if present
 */
function decodeBase64Content(body: string): string {
  // Check if body appears to be base64 encoded (long lines of alphanumeric chars)
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
      // Empty line might end the block
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
    case 'payment':
      patterns.push(
        /(?:company|merchant|ชื่อบริษัท)[:\s]+([^\n<]+)/i,
        /(?:payee|ผู้รับเงิน)[:\s]+([^\n<]+)/i,
      );
      break;

    case 'promptpay_mobile':
    case 'promptpay_citizen':
      patterns.push(
        /(?:beneficiary\s*name|ชื่อผู้รับเงิน)[:\s]+([^\n<]+)/i,
        /(?:received\s*name|ชื่อผู้รับ)[:\s]+([^\n<]+)/i,
        /(?:to\s*promptpay|ไปยังพร้อมเพย์)[:\s]+([^\n<]+)/i,
      );
      break;

    case 'funds_transfer':
      patterns.push(
        /(?:to\s*account\s*name|ชื่อบัญชีผู้รับ)[:\s]+([^\n<]+)/i,
        /(?:beneficiary|ผู้รับผลประโยชน์)[:\s]+([^\n<]+)/i,
        /(?:account\s*name|ชื่อบัญชี)[:\s]+([^\n<]+)/i,
      );
      break;

    case 'promptpay_topup':
      patterns.push(
        /(?:to\s*wallet|ไปยังกระเป๋า)[:\s]+([^\n<]+)/i,
        /(?:wallet\s*name|ชื่อกระเป๋า)[:\s]+([^\n<]+)/i,
        /(?:top\s*up\s*to|เติมเงินไปยัง)[:\s]+([^\n<]+)/i,
      );
      break;

    default:
      patterns.push(
        /(?:to|ไปยัง)[:\s]+([^\n<]+)/i,
        /(?:recipient|ผู้รับ)[:\s]+([^\n<]+)/i,
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
 * Extract reference number from email body
 */
function extractReference(body: string): string | null {
  REFERENCE_PATTERN.lastIndex = 0;
  const match = REFERENCE_PATTERN.exec(body);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extract transaction date from email body
 */
function extractTransactionDate(body: string): Date | null {
  DATE_PATTERN.lastIndex = 0;
  const match = DATE_PATTERN.exec(body);
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
    case 'payment':
      return 'Bill Payment';
    case 'promptpay_mobile':
    case 'promptpay_citizen':
      return 'PromptPay Transfer';
    case 'funds_transfer':
      return 'Bank Transfer';
    case 'promptpay_topup':
      return 'TopUp';
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

  // If recipient looks like user's own name or wallet, it might be self-transfer
  // But we can't know for sure without user context, so just flag for review
  for (const indicator of selfIndicators) {
    if (lowerRecipient.includes(indicator) || lowerBody.includes(indicator)) {
      return true;
    }
  }

  return false;
}

/**
 * Bangkok Bank Email Parser implementation
 */
export const bangkokBankParser: EmailParser = {
  key: 'bangkok-bank',
  name: 'Bangkok Bank (Bualuang) Parser',

  /**
   * Check if this parser can handle the given email
   */
  canParse(email: RawEmailData): boolean {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Check sender
    const isFromBBL = BBL_SENDER_PATTERNS.some(pattern =>
      fromAddress.includes(pattern)
    );

    if (isFromBBL) {
      return true;
    }

    // Check subject for Bangkok Bank patterns
    const allPatterns = Object.values(BBL_SUBJECT_PATTERNS).flat();
    const hasBBLSubject = allPatterns.some(pattern =>
      subject.includes(pattern.toLowerCase())
    );

    return hasBBLSubject;
  },

  /**
   * Extract transaction data from Bangkok Bank email
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

    // Try to decode base64 content (Bangkok Bank often base64 encodes)
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
  BBL_SENDER_PATTERNS,
  BBL_SUBJECT_PATTERNS,
  VENDOR_MAPPINGS,
};
