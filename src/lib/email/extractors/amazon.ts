/**
 * Amazon Order Email Parser
 *
 * Parses "Ordered" confirmation emails from Amazon.
 *
 * Why this exists separately from the AI fallback:
 * Amazon frequently splits one shopping session into multiple sub-orders that
 * each ship and post to the credit card as a separate charge. The order email
 * shows the per-sub-order "Grand Total" alongside an overall sum, so the
 * parser emits one `ExtractedTransaction` (the grand total) plus a
 * `sub_orders[]` array — one entry per sub-order — so the matcher can pair
 * each sub-order against its own statement line.
 *
 * Email structure (plain text body) — repeats per sub-order:
 *
 *   Order #
 *   111-8507210-6332245
 *
 *   View or edit order
 *   https://.../orderID=111-8507210-6332245&...
 *
 *   * Item 1
 *     Quantity: 2
 *     7.98 USD
 *   ...
 *
 *   Grand Total:
 *   361.61 USD
 *
 * Single-order Amazon emails are the degenerate case: one block, one
 * Grand Total. We emit `sub_orders` with a single entry only when there are
 * two or more — otherwise the email behaves like a normal one-amount receipt.
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction, ExtractedSubOrder } from '../types';

// Sender patterns. We match on the *normalized* (de-iCloud-relayed) address.
const AMAZON_SENDER_PATTERNS = [
  /@amazon\.[a-z.]+$/i, // amazon.com, amazon.co.uk, amazon.de, amazon.co.jp, ...
];

// Subject patterns for order confirmations.
const AMAZON_SUBJECT_PATTERNS = [
  /^ordered:/i,                              // "Ordered: "Skechers..." and N more items"
  /^your amazon\.[a-z.]+ order/i,            // "Your Amazon.com order of ..."
  /^amazon\.[a-z.]+ order of /i,             // "Amazon.com order of ..."
];

// Amazon order IDs: 3 digits, dash, 7 digits, dash, 7 digits (sometimes prefixed
// with "D" for digital orders like "D01-6843166-4998654").
const ORDER_ID_REGEX = /\b[D]?\d{2,3}-\d{7}-\d{7}\b/;

// "Grand Total:\n361.61 USD" — capture amount + ISO-like currency code.
// Allowed currency codes seen on amazon.* domains: USD, GBP, EUR, CAD, JPY,
// AUD, INR, BRL, MXN, SAR, AED, SGD. We're permissive — any 3-letter code.
const GRAND_TOTAL_REGEX = /grand\s*total\s*:?[\s\r\n]*([\d.,]+)\s+([A-Z]{3})/gi;

// "Order #\n111-8507210-6332245" or "Order # 111-..." — the order ID appears
// on a line of its own (or right after "Order #").
const ORDER_BLOCK_HEADER_REGEX = /order\s*#[\s\r\n]*([D]?\d{2,3}-\d{7}-\d{7})/gi;

// "Arriving May 7" / "Arriving Sunday" — only the absolute-date form is useful
// for matching, so we only parse that form. Day-of-week is dropped.
const ARRIVAL_DATE_REGEX = /arriving\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i;

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseArrivalDate(raw: string | undefined, referenceDate: Date): Date | undefined {
  if (!raw) return undefined;
  const m = raw.match(ARRIVAL_DATE_REGEX);
  if (!m) return undefined;
  const month = MONTH_INDEX[m[1].slice(0, 3).toLowerCase()];
  if (month === undefined) return undefined;
  const day = parseInt(m[2], 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) return undefined;
  // Pick the year that places the arrival within ~120 days after referenceDate
  // (Amazon rarely promises arrivals more than a few months out).
  let year = referenceDate.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, month, day));
  const diff = (candidate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < -30) {
    candidate = new Date(Date.UTC(year + 1, month, day));
  }
  return candidate;
}

function parseAmount(raw: string): number | null {
  // "1,234.56" or "1234.56" — strip commas, parse, validate.
  const cleaned = raw.replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Split the body into per-sub-order blocks by "Order #" header.
 *
 * Each block is the text from one "Order #" header up to (but excluding) the
 * next one — or end of body for the last block.
 */
interface SubOrderBlock {
  orderId: string;
  text: string;
  /** Optional summary text (text before any items, used for arrival hint). */
  preItems: string;
}

function splitIntoSubOrderBlocks(body: string): SubOrderBlock[] {
  const blocks: SubOrderBlock[] = [];
  // Find all order-block headers with their start offsets
  const headers: Array<{ orderId: string; start: number }> = [];
  ORDER_BLOCK_HEADER_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ORDER_BLOCK_HEADER_REGEX.exec(body)) !== null) {
    headers.push({ orderId: m[1], start: m.index });
  }
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].start;
    const end = i + 1 < headers.length ? headers[i + 1].start : body.length;
    const text = body.substring(start, end);
    // preItems = portion before the first "*" bullet
    const bulletIdx = text.indexOf('\n*');
    const preItems = bulletIdx === -1 ? text : text.substring(0, bulletIdx);
    blocks.push({ orderId: headers[i].orderId, text, preItems });
  }
  return blocks;
}

function firstItemName(blockText: string): string | undefined {
  // Find first "* {name}" bullet, capture up to the next newline.
  const m = blockText.match(/\n\*\s+([^\n]+?)(?:\n|$)/);
  if (!m) return undefined;
  return m[1].trim().slice(0, 120);
}

function extractSubOrders(body: string, referenceDate: Date): ExtractedSubOrder[] {
  const blocks = splitIntoSubOrderBlocks(body);
  const result: ExtractedSubOrder[] = [];

  for (const block of blocks) {
    // Find the FIRST "Grand Total: X CCC" inside this block — Amazon repeats
    // the line per sub-order, so the first one in the block is the
    // sub-order's own total (not the overall sum, which appears after all
    // sub-orders in some templates).
    GRAND_TOTAL_REGEX.lastIndex = 0;
    const gt = GRAND_TOTAL_REGEX.exec(block.text);
    if (!gt) continue;
    const amount = parseAmount(gt[1]);
    if (amount === null) continue;
    const currency = gt[2].toUpperCase();

    const arrival = parseArrivalDate(block.preItems, referenceDate);
    const description = firstItemName(block.text);

    result.push({
      order_id: block.orderId,
      amount,
      currency,
      description,
      arrival_date: arrival,
    });
  }

  return result;
}

function isFromAmazon(fromAddress: string | null | undefined): boolean {
  if (!fromAddress) return false;
  const lower = fromAddress.toLowerCase();
  return AMAZON_SENDER_PATTERNS.some((re) => re.test(lower));
}

function hasAmazonSubject(subject: string | null | undefined): boolean {
  if (!subject) return false;
  return AMAZON_SUBJECT_PATTERNS.some((re) => re.test(subject));
}

export const amazonParser: EmailParser = {
  key: 'amazon',
  name: 'Amazon Order Parser',

  canParse(email: RawEmailData): boolean {
    if (isFromAmazon(email.from_address)) return true;
    // Fall back to subject matching for cases where the sender isn't an
    // obvious amazon.* address (forwarded mail, etc.) but the subject is.
    return hasAmazonSubject(email.subject);
  },

  extract(email: RawEmailData): ExtractionResult {
    const notes: string[] = [];
    const body = email.text_body || '';
    if (!body) {
      return {
        success: false,
        confidence: 0,
        errors: ['No text body available for Amazon email'],
      };
    }

    const subOrders = extractSubOrders(body, email.email_date);

    if (subOrders.length === 0) {
      return {
        success: false,
        confidence: 0,
        errors: ['Could not locate any "Grand Total" sub-order block'],
      };
    }

    // Currency — Amazon always charges in one currency per order email; if
    // sub-orders disagree something's off. Use the most common.
    const currencyCounts = new Map<string, number>();
    for (const so of subOrders) {
      currencyCounts.set(so.currency, (currencyCounts.get(so.currency) ?? 0) + 1);
    }
    const currency = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (currencyCounts.size > 1) {
      notes.push(`Sub-orders span ${currencyCounts.size} currencies; using ${currency}`);
    }

    // Grand total: sum of sub-orders. Amazon prints the sum on the email too,
    // but since each sub-order Grand Total is what hits the card individually,
    // summing the parts is the correct invariant.
    const grandTotal = subOrders.reduce((sum, so) => sum + so.amount, 0);

    // Composite order_id for the parent — pipe-separated, matches the format
    // the AI fallback historically produced so downstream code (group keys,
    // search) keeps working.
    const compositeOrderId = subOrders
      .map((so) => so.order_id)
      .filter((x): x is string => !!x)
      .join(' | ') || undefined;

    // Description summary
    const totalItems = subOrders.length;
    const description = totalItems === 1
      ? subOrders[0].description || 'Amazon order'
      : `Amazon order (${totalItems} sub-orders)`;

    // Confidence: pure regex + structured input → high. Cap at 95 to leave
    // room for AI to "exceed" only when given more context.
    let confidence = 40; // baseline (canParse matched + body present)
    confidence += 20;   // amount(s) extracted
    confidence += 20;   // date present
    confidence += 10;   // vendor known
    if (compositeOrderId) confidence += 10;
    confidence = Math.min(confidence, 95);

    const data: ExtractedTransaction = {
      vendor_name_raw: 'Amazon.com',
      amount: Number(grandTotal.toFixed(2)),
      currency,
      transaction_date: email.email_date,
      description,
      order_id: compositeOrderId,
    };

    if (subOrders.length >= 2) {
      data.sub_orders = subOrders;
      notes.push(`Detected ${subOrders.length} sub-orders: ${subOrders.map((s) => `${s.amount} ${s.currency}`).join(', ')}`);
    }

    return {
      success: true,
      confidence,
      data,
      notes: notes.length ? notes.join('; ') : undefined,
    };
  },
};

export {
  extractSubOrders,
  splitIntoSubOrderBlocks,
  parseArrivalDate,
  ORDER_ID_REGEX,
  AMAZON_SENDER_PATTERNS,
  AMAZON_SUBJECT_PATTERNS,
};
