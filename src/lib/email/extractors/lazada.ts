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

// Known Lazada sender addresses. Kept for documentation and for the
// classifier's substring rules — canParse matches on the domain instead, since
// live mail arrives from subdomains (noreply@support.lazada.co.th) that no
// exact-address list survives.
const LAZADA_SENDER_PATTERNS = [
  'order@lazada.co.th',
  'noreply@lazada.co.th',
  'notification@lazada.co.th',
  'orders@lazada.co.th',
];

// Sender domains, including any subdomain of them
const LAZADA_DOMAINS = ['lazada.co.th', 'lazada.com'];

/**
 * True when the address sits on a Lazada domain or any of its subdomains.
 *
 * Addresses reach here already normalized out of iCloud Private Relay, so
 * `noreply_at_support_lazada_co_th_…@icloud.com` is seen as
 * `noreply@support.lazada.co.th`.
 */
function isLazadaSender(fromAddress: string): boolean {
  const at = fromAddress.lastIndexOf('@');
  if (at === -1) return false;
  const domain = fromAddress.slice(at + 1).toLowerCase().trim();
  return LAZADA_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

// Lazada subject patterns for different email types
const LAZADA_SUBJECT_PATTERNS = [
  'order confirmed',
  'order has been confirmed',
  'we have received your order',
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

/**
 * The charged total on a real order confirmation, printed as
 * `Total (VAT included): THB 2,930.84`. `\btotal\b` deliberately does not
 * match inside "Subtotal" — the subtotal excludes shipping and discounts and
 * is never what the card is charged.
 */
const CHARGED_TOTAL_PATTERN = /\btotal\b[^:\n]{0,24}:\s*(?:฿|THB)\s*([\d,]+(?:\.\d{2})?)/gi;

/** One line item: `<product name> THB 2,081.42 Quantity: 1` */
const ITEM_LINE_PATTERN = /THB\s*([\d,]+(?:\.\d{2})?)\s*Quantity:\s*(\d+)/gi;

/** Present only in the real order-confirmation layout. */
const ITEMIZED_MARKER = /\bQuantity:\s*\d/i;

/**
 * Lazada mails plenty that is not a purchase — refunds, cancellations, coupons,
 * support replies — and several of those still quote an order total. Matching
 * on the sender domain now catches all of them, so these are handed back to AI
 * extraction rather than booked as an expense with the wrong sign or no charge
 * behind them at all. Tested against the subject only: the body's navigation
 * bar mentions "Vouchers" on every single email.
 */
const NON_PURCHASE_SUBJECT_PATTERNS = [
  /refund/i,
  /คืนเงิน/,          // refund
  /cancel/i,
  /ยกเลิก/,           // cancelled
  /coupon/i,
  /contacting us/i,
  /ติดต่อ/,           // contacting (support reply)
];

/**
 * Everything from here on is advertising ("Don't Forget to Buy These", each
 * with its own ฿ price) or boilerplate. Left in, the largest-amount fallback
 * would happily bill an unrelated promo item.
 */
const PROMO_TAIL_MARKERS = [
  /don.{0,8}t forget to buy these/i,
  /shop now!/i,
  /note\s+lazada will not be responsible/i,
];

/** Labels that precede a product name in the parcel block. */
const ITEM_NAME_PREFIXES = [
  /estimated delivery dates:[^]*?\d{4}/gi,
  /sold by:\s*\S+/gi,
  /parcel\s*\d+/gi,
];

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

  // Order confirmation. The live Thai template announces itself as "We have
  // received your order No …" / "Thank you for your purchase!" rather than any
  // of the phrasings the older patterns expected.
  if (
    lowerSubject.includes('order confirmed') ||
    lowerSubject.includes('order has been confirmed') ||
    lowerSubject.includes('thank you for your order') ||
    lowerSubject.includes('we have received your order') ||
    combinedText.includes('order has been confirmed') ||
    lowerBody.includes('thank you for your purchase')
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
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Cut the marketing tail off the body before any amount is read from it.
 */
function trimPromoTail(body: string): string {
  let cut = body.length;
  for (const marker of PROMO_TAIL_MARKERS) {
    const match = marker.exec(body);
    if (match && match.index > 0) {
      cut = Math.min(cut, match.index);
    }
  }
  return cut < body.length ? body.slice(0, cut).trim() : body;
}

export interface LazadaOrderItem {
  name: string;
  amount: number;
  quantity: number;
}

/**
 * Pull the line items out of a real order confirmation.
 *
 * The product name is whatever precedes each `THB <price> Quantity: <n>`
 * triple, minus the parcel labels Lazada prints ahead of the first item
 * ("Parcel 1", "Sold by: X", delivery-date ranges, bracketed shipping notes).
 */
function extractOrderItems(body: string): LazadaOrderItem[] {
  const items: LazadaOrderItem[] = [];
  ITEM_LINE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  let cursor = 0;
  while ((match = ITEM_LINE_PATTERN.exec(body)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    const quantity = parseInt(match[2], 10);
    let name = body.slice(cursor, match.index);
    cursor = match.index + match[0].length;

    // Drop everything up to the last parcel label — the product name follows it
    let labelEnd = 0;
    for (const prefix of ITEM_NAME_PREFIXES) {
      prefix.lastIndex = 0;
      let labelMatch: RegExpExecArray | null;
      while ((labelMatch = prefix.exec(name)) !== null) {
        labelEnd = Math.max(labelEnd, labelMatch.index + labelMatch[0].length);
      }
    }
    name = name.slice(labelEnd);

    // Bracketed shipping notes ("[Send to Bangkok] Prachylap, …]") sit between
    // the labels and the name; the product starts after the last bracket.
    const lastBracket = name.lastIndexOf(']');
    if (lastBracket !== -1) {
      name = name.slice(lastBracket + 1);
    }

    name = name
      .replace(/^\s*promotion:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!isNaN(amount) && amount > 0 && quantity > 0) {
      items.push({ name, amount, quantity });
    }
  }

  return items;
}

/**
 * Build a description from the ordered products, e.g.
 * `Singha Sparkling Water, Lemon Scent ×4`. Returns null when no product name
 * could be read, so the caller can fall back to the generic description.
 */
function buildItemDescription(items: LazadaOrderItem[]): string | null {
  const named = items.filter((i) => i.name.length > 1);
  if (named.length === 0) return null;

  const first = named[0].name;
  const truncated = first.length > 70 ? `${first.slice(0, 69).trimEnd()}…` : first;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const allSameProduct = named.every((i) => i.name === first);

  const quantitySuffix = totalQuantity > 1 ? ` ×${totalQuantity}` : '';
  const moreSuffix = allSameProduct ? '' : ` +${named.length - 1} more`;

  return `${truncated}${quantitySuffix}${moreSuffix}`;
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
  // The printed charged total wins over everything else. Only the itemized
  // layout labels it unambiguously ("Total (VAT included): THB …"), so only
  // there is it treated as the real charge rather than an estimate.
  const itemized = ITEMIZED_MARKER.test(body);
  CHARGED_TOTAL_PATTERN.lastIndex = 0;
  const totalMatch = CHARGED_TOTAL_PATTERN.exec(body);
  if (totalMatch) {
    const amount = parseFloat(totalMatch[1].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      return { amount, confidence: itemized ? 95 : 90, isEstimate: !itemized };
    }
  }

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
export const lazadaParser = {
  key: 'lazada',
  name: 'Lazada Order Parser',

  /**
   * Check if this parser can handle the given email
   */
  canParse(email: RawEmailData): boolean {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Check sender domain (covers subdomains like support.lazada.co.th)
    if (isLazadaSender(fromAddress)) {
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

    const subject = email.subject || '';
    const nonPurchase = NON_PURCHASE_SUBJECT_PATTERNS.find((p) => p.test(subject));
    if (nonPurchase) {
      return {
        success: false,
        confidence: 0,
        errors: [`Not a purchase confirmation (subject matched ${nonPurchase})`],
      };
    }

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

    // Drop the "Don't Forget to Buy These" advertising block before reading any
    // number out of the body — its ฿ prices are not part of this order.
    body = trimPromoTail(body);

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

    if (amountResult.isEstimate) {
      notes.push('Amount may be estimated - actual charge may differ due to vouchers/discounts');
    } else {
      notes.push('Amount is the order summary total (VAT, shipping and discounts included)');
    }

    // Extract order ID
    const orderId = extractOrderId(body, email.subject || '');
    if (!orderId) {
      notes.push('No order ID found');
    }

    // Build description — name the products when the email itemizes them,
    // otherwise fall back to the generic "Online Order" phrasing.
    const items = extractOrderItems(body);
    const itemDescription = buildItemDescription(items);
    const description = itemDescription || buildDescription(emailType, body);

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

    // Itemized order: the products and the charged total were both read
    if (itemDescription && !amountResult.isEstimate) {
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
} satisfies EmailParser;

// Export helper functions for testing
export {
  detectEmailType,
  stripHtml,
  extractOrderId,
  extractAmount,
  extractItemCount,
  buildDescription,
  isLazadaSender,
  trimPromoTail,
  extractOrderItems,
  buildItemDescription,
  LAZADA_SENDER_PATTERNS,
  LAZADA_DOMAINS,
  LAZADA_SUBJECT_PATTERNS,
};
