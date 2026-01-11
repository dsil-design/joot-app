/**
 * Lazada Email Parser
 *
 * Parses order confirmation and receipt emails from Lazada Thailand:
 * - Order confirmations
 * - Order shipped notifications
 * - Delivery confirmations
 *
 * Key patterns:
 * - Sender: order@lazada.co.th, noreply@lazada.co.th
 * - Subject: "Order Confirmed", "Your order has been shipped", etc.
 * - Currency: Always THB
 * - Amount: May be estimates (pending actual charge)
 *
 * Note: Lazada order totals may differ from actual charges due to:
 * - Vouchers/discounts applied at checkout
 * - Partial shipments
 * - Returns/refunds
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction } from '../types';

// Lazada sender patterns
const LAZADA_SENDER_PATTERNS = [
  'order@lazada.co.th',
  'noreply@lazada.co.th',
  'notification@lazada.co.th',
  'orders@lazada.co.th',
];

// Lazada subject patterns for different email types
const LAZADA_SUBJECT_PATTERNS = [
  'order confirmed',
  'order has been confirmed',
  'your order',
  'order shipped',
  'has been shipped',
  'delivered',
  'lazada order',
  'payment confirmed',
  'thank you for your order',
];

// Amount extraction patterns
// THB with ฿ symbol or "THB" prefix/suffix
const THB_AMOUNT_PATTERN = /(?:฿|THB)\s*([\d,]+(?:\.\d{2})?)/gi;
const AMOUNT_THB_PATTERN = /([\d,]+(?:\.\d{2})?)\s*(?:฿|THB|baht)/gi;

// Order total patterns (more specific for order confirmations)
const ORDER_TOTAL_PATTERNS = [
  /total[:\s]*(?:฿|THB)\s*([\d,]+(?:\.\d{2})?)/gi,
  /order\s*total[:\s]*(?:฿|THB)\s*([\d,]+(?:\.\d{2})?)/gi,
  /grand\s*total[:\s]*(?:฿|THB)\s*([\d,]+(?:\.\d{2})?)/gi,
  /amount[:\s]*(?:฿|THB)\s*([\d,]+(?:\.\d{2})?)/gi,
];

// Order ID patterns
// Lazada order IDs are typically numeric with possible prefix
const ORDER_ID_PATTERNS = [
  /order\s*(?:id|no\.?|number|#)?[:\s]*([0-9]+)/gi,
  /order[:\s]*#?\s*([0-9]+)/gi,
  /#([0-9]{10,})/gi, // Long numeric order ID
];

// Known Lazada vendor ID (if available in the reference)
const LAZADA_VENDOR_ID = undefined; // Will be looked up when needed

/**
 * Email type detection
 */
type LazadaEmailType = 'order_confirmation' | 'shipped' | 'delivered' | 'payment' | 'unknown';

/**
 * Detect email type from subject and body
 */
function detectEmailType(subject: string, body: string): LazadaEmailType {
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();
  const combinedText = `${lowerSubject} ${lowerBody}`;

  // Order confirmation
  if (
    lowerSubject.includes('order confirmed') ||
    lowerSubject.includes('order has been confirmed') ||
    lowerSubject.includes('thank you for your order') ||
    combinedText.includes('order has been confirmed')
  ) {
    return 'order_confirmation';
  }

  // Shipped
  if (
    lowerSubject.includes('shipped') ||
    lowerSubject.includes('on the way') ||
    combinedText.includes('your order has been shipped')
  ) {
    return 'shipped';
  }

  // Delivered
  if (
    lowerSubject.includes('delivered') ||
    combinedText.includes('has been delivered')
  ) {
    return 'delivered';
  }

  // Payment confirmation
  if (
    lowerSubject.includes('payment confirmed') ||
    lowerSubject.includes('payment received')
  ) {
    return 'payment';
  }

  return 'unknown';
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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract order ID from email
 */
function extractOrderId(body: string, subject: string): string | null {
  const combinedText = `${subject} ${body}`;

  for (const pattern of ORDER_ID_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const match = pattern.exec(combinedText);
    if (match) {
      const orderId = match[1];
      // Validate it looks like a Lazada order ID (typically 10+ digits)
      if (orderId && orderId.length >= 6) {
        return orderId;
      }
    }
  }

  return null;
}

/**
 * Extract THB amount from email body
 * Prioritizes order total over individual item prices
 */
function extractAmount(body: string): { amount: number; confidence: number; isEstimate: boolean } | null {
  // Try order total patterns first (more reliable)
  for (const pattern of ORDER_TOTAL_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(body);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        return { amount, confidence: 90, isEstimate: true };
      }
    }
  }

  // Fall back to general amount patterns
  const allAmounts: number[] = [];

  // Try THB prefix pattern
  THB_AMOUNT_PATTERN.lastIndex = 0;
  let match;
  while ((match = THB_AMOUNT_PATTERN.exec(body)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
      allAmounts.push(amount);
    }
  }

  // Try amount with THB suffix
  AMOUNT_THB_PATTERN.lastIndex = 0;
  while ((match = AMOUNT_THB_PATTERN.exec(body)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0 && !allAmounts.includes(amount)) {
      allAmounts.push(amount);
    }
  }

  if (allAmounts.length === 0) {
    return null;
  }

  // For Lazada orders, the total is typically the largest amount
  // (individual items are smaller)
  const total = Math.max(...allAmounts);

  // Lower confidence when using fallback pattern
  const confidence = allAmounts.length > 1 ? 75 : 65;

  return { amount: total, confidence, isEstimate: true };
}

/**
 * Extract item count from order confirmation
 */
function extractItemCount(body: string): number | null {
  // Pattern: "X item(s)" or "X product(s)"
  const itemCountPattern = /(\d+)\s*(?:item|product|รายการ)s?/gi;
  const match = itemCountPattern.exec(body);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Build description based on email type and content
 */
function buildDescription(emailType: LazadaEmailType, body: string): string {
  const itemCount = extractItemCount(body);
  const itemSuffix = itemCount && itemCount > 1 ? ` (${itemCount} items)` : '';

  switch (emailType) {
    case 'order_confirmation':
      return `Online Order${itemSuffix}`;

    case 'shipped':
      return `Online Order${itemSuffix} - Shipped`;

    case 'delivered':
      return `Online Order${itemSuffix} - Delivered`;

    case 'payment':
      return `Online Order${itemSuffix} - Payment`;

    default:
      return `Online Order${itemSuffix}`;
  }
}

/**
 * Lazada Email Parser implementation
 */
export const lazadaParser: EmailParser = {
  key: 'lazada',
  name: 'Lazada Order Parser',

  /**
   * Check if this parser can handle the given email
   */
  canParse(email: RawEmailData): boolean {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Check sender
    const isFromLazada = LAZADA_SENDER_PATTERNS.some(pattern =>
      fromAddress.includes(pattern)
    );

    if (isFromLazada) {
      return true;
    }

    // Check subject as fallback (less reliable)
    const hasLazadaSubject = LAZADA_SUBJECT_PATTERNS.some(pattern =>
      subject.includes(pattern) && subject.includes('lazada')
    );

    return hasLazadaSubject;
  },

  /**
   * Extract transaction data from Lazada email
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

    // Strip HTML if present
    if (body.includes('<') && body.includes('>')) {
      body = stripHtml(body);
    }

    // Detect email type
    const emailType = detectEmailType(email.subject || '', body);
    if (emailType === 'unknown') {
      notes.push('Unknown Lazada email type - using generic extraction');
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

    // Always note that Lazada amounts are estimates
    notes.push('Amount may be estimated - actual charge may differ due to vouchers/discounts');

    // Extract order ID
    const orderId = extractOrderId(body, email.subject || '');
    if (!orderId) {
      notes.push('No order ID found');
    }

    // Build description
    const description = buildDescription(emailType, body);

    // Calculate confidence
    let confidence = 40; // Base: required fields present

    // Amount found
    confidence += 15; // Lower than other parsers due to estimate nature

    // Date from email (always have this)
    confidence += 20;

    // Order ID found
    if (orderId) {
      confidence += 15;
    }

    // Email type identified
    if (emailType !== 'unknown') {
      confidence += 10;
    }

    // Build extracted transaction
    const data: ExtractedTransaction = {
      vendor_name_raw: 'Lazada',
      amount: amountResult.amount,
      currency: 'THB',
      transaction_date: email.email_date,
      description,
      order_id: orderId,
    };

    // Add vendor ID if known
    if (LAZADA_VENDOR_ID) {
      data.vendor_id = LAZADA_VENDOR_ID;
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
  detectEmailType,
  stripHtml,
  extractOrderId,
  extractAmount,
  extractItemCount,
  buildDescription,
  LAZADA_SENDER_PATTERNS,
  LAZADA_SUBJECT_PATTERNS,
};
