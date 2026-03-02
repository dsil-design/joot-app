/**
 * Stripe Receipt/Invoice Email Parser
 *
 * Parses receipt and invoice emails from Stripe.
 *
 * Key patterns:
 * - Sender: receipts@stripe.com
 * - Subject: "Receipt from {VENDOR}", "Payment to {VENDOR}"
 * - Currency: USD
 * - Status: READY_TO_IMPORT (hits existing usd_ready rule)
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction } from '../types';

const STRIPE_SENDER_PATTERNS = [
  'receipts@stripe.com',
];

const STRIPE_SUBJECT_PATTERNS = [
  'receipt from',
  'payment to',
];

// USD amount patterns
const USD_AMOUNT_PATTERN = /\$\s*([\d,]+(?:\.\d{2})?)/gi;
const TOTAL_AMOUNT_PATTERN = /(?:total|amount\s*(?:paid|charged))[:\s]*\$\s*([\d,]+(?:\.\d{2})?)/gi;

// Receipt number pattern
const RECEIPT_NUMBER_PATTERN = /receipt\s*(?:#|number|no\.?)[:\s]*([A-Za-z0-9-]+)/gi;

/**
 * Strip HTML tags and normalize whitespace
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract vendor name from subject line.
 * "Receipt from Anthropic" → "Anthropic"
 * "Payment to Vercel Inc" → "Vercel Inc"
 */
function extractVendorFromSubject(subject: string): string | null {
  const receiptMatch = subject.match(/receipt\s+from\s+(.+)/i);
  if (receiptMatch) return receiptMatch[1].trim();

  const paymentMatch = subject.match(/payment\s+to\s+(.+)/i);
  if (paymentMatch) return paymentMatch[1].trim();

  return null;
}

function extractAmount(body: string): { amount: number; confidence: number } | null {
  // Try labeled total first
  const totalMatches: number[] = [];
  let match;

  TOTAL_AMOUNT_PATTERN.lastIndex = 0;
  while ((match = TOTAL_AMOUNT_PATTERN.exec(body)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      totalMatches.push(amount);
    }
  }

  if (totalMatches.length > 0) {
    return { amount: Math.max(...totalMatches), confidence: 95 };
  }

  // Fall back to any USD amount
  const allMatches: number[] = [];
  USD_AMOUNT_PATTERN.lastIndex = 0;
  while ((match = USD_AMOUNT_PATTERN.exec(body)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      allMatches.push(amount);
    }
  }

  if (allMatches.length === 0) return null;
  return { amount: Math.max(...allMatches), confidence: 80 };
}

function extractReceiptNumber(body: string): string | null {
  RECEIPT_NUMBER_PATTERN.lastIndex = 0;
  const match = RECEIPT_NUMBER_PATTERN.exec(body);
  if (match) {
    const id = match[1].trim();
    if (id.length >= 4) return id;
  }
  return null;
}

export const stripeParser: EmailParser = {
  key: 'stripe',
  name: 'Stripe Receipt Parser',

  canParse(email: RawEmailData): boolean {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    const isFromStripe = STRIPE_SENDER_PATTERNS.some(p => fromAddress.includes(p));
    if (isFromStripe) return true;

    return STRIPE_SUBJECT_PATTERNS.some(p => subject.includes(p));
  },

  extract(email: RawEmailData): ExtractionResult {
    const notes: string[] = [];

    let body = email.text_body || '';
    if (body.length < 50 && email.html_body) {
      body = stripHtml(email.html_body);
    }

    if (!body) {
      return { success: false, confidence: 0, errors: ['No email body content available'] };
    }

    const amountResult = extractAmount(body);
    if (!amountResult) {
      return { success: false, confidence: 0, errors: ['No USD amount found in email'] };
    }

    // Extract vendor from subject
    const vendorName = extractVendorFromSubject(email.subject || '') || 'Stripe Payment';

    const receiptNumber = extractReceiptNumber(body);
    if (!receiptNumber) notes.push('No receipt number found');

    let confidence = 40 + 20 + 20 + 10; // base + amount + date + vendor
    if (receiptNumber) confidence += 10;

    const data: ExtractedTransaction = {
      vendor_name_raw: vendorName,
      amount: amountResult.amount,
      currency: 'USD',
      transaction_date: email.email_date,
      description: `Payment to ${vendorName}`,
      order_id: receiptNumber,
    };

    return {
      success: true,
      confidence: Math.min(confidence, 100),
      data,
      notes: notes.length > 0 ? notes.join('; ') : undefined,
    };
  },
};

export { STRIPE_SENDER_PATTERNS, STRIPE_SUBJECT_PATTERNS };
