/**
 * Apple Receipt Email Parser
 *
 * Parses receipt emails from Apple (App Store, iTunes, subscriptions).
 *
 * Key patterns:
 * - Sender: no_reply@email.apple.com, no-reply@email.apple.com
 * - Subject: "Your receipt from Apple", "Receipt from Apple"
 * - Currency: USD
 * - Status: READY_TO_IMPORT (hits existing usd_ready rule)
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction } from '../types';

const APPLE_SENDER_PATTERNS = [
  'no_reply@email.apple.com',
  'no-reply@email.apple.com',
];

const APPLE_SUBJECT_PATTERNS = [
  'your receipt from apple',
  'receipt from apple',
];

// USD amount patterns
const USD_AMOUNT_PATTERN = /\$\s*([\d,]+(?:\.\d{2})?)/gi;
const TOTAL_AMOUNT_PATTERN = /total[:\s]*\$\s*([\d,]+(?:\.\d{2})?)/gi;

// Order ID pattern
const ORDER_ID_PATTERN = /order\s*(?:id|#|number)?[:\s]*([A-Z0-9]+)/gi;

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

function extractAmount(body: string): { amount: number; confidence: number } | null {
  // Try "Total" labeled amount first
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

function extractOrderId(body: string): string | null {
  ORDER_ID_PATTERN.lastIndex = 0;
  const match = ORDER_ID_PATTERN.exec(body);
  if (match) {
    const id = match[1].trim();
    if (id.length >= 5) return id;
  }
  return null;
}

export const appleParser: EmailParser = {
  key: 'apple',
  name: 'Apple Receipt Parser',

  canParse(email: RawEmailData): boolean {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    const isFromApple = APPLE_SENDER_PATTERNS.some(p => fromAddress.includes(p));
    if (isFromApple) return true;

    return APPLE_SUBJECT_PATTERNS.some(p => subject.includes(p));
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

    const orderId = extractOrderId(body);
    if (!orderId) notes.push('No order ID found');

    let confidence = 40 + 20 + 20 + 10; // base + amount + date + vendor
    if (orderId) confidence += 10;

    const data: ExtractedTransaction = {
      vendor_name_raw: 'Apple',
      amount: amountResult.amount,
      currency: 'USD',
      transaction_date: email.email_date,
      description: 'App Store / iTunes',
      order_id: orderId,
    };

    return {
      success: true,
      confidence: Math.min(confidence, 100),
      data,
      notes: notes.length > 0 ? notes.join('; ') : undefined,
    };
  },
};

export { APPLE_SENDER_PATTERNS, APPLE_SUBJECT_PATTERNS };
