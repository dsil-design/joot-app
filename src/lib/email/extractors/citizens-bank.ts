/**
 * Citizens Bank iPhone Loan Email Parser
 *
 * Parses the monthly "Automatic Payment Reminder: iPhone Loan" email Citizens
 * sends a couple of days before each auto-pay charge. This is the canonical
 * monthly transaction email for the iPhone loan.
 *
 * Key patterns:
 * - Sender: mail@em.citizensbank.com / email@email.citizensbank.com
 *   (often arrives via iCloud Private Relay — extraction-service normalizes
 *   the relay address before canParse runs).
 * - Subject: "Automatic Payment Reminder: iPhone Loan"
 * - Currency: USD
 * - Body (after HTML strip) contains:
 *     "Recurring Monthly Payment: $57.00"
 *     "Payment Scheduled Date: 03-19"
 *   The scheduled date is MM-DD with no year — derive the year from the
 *   email date (with rollover when the scheduled month is earlier than the
 *   email's month, i.e. a December email scheduling a January payment).
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction } from '../types';

const CITIZENS_SENDER_SUBSTRING = 'citizensbank.com';
const CITIZENS_SUBJECT_SUBSTRING = 'automatic payment reminder: iphone loan';

const AMOUNT_PATTERN = /Recurring Monthly Payment:\s*\$([\d,]+\.\d{2})/i;
const SCHEDULED_DATE_PATTERN = /Payment Scheduled Date:\s*(\d{1,2})-(\d{1,2})/i;

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
 * Resolve the year for an MM-DD scheduled date based on the email's send date.
 * The reminder is sent ~2 days before the scheduled charge, so the scheduled
 * date is essentially always within ~7 days after the email date. If the
 * scheduled month is earlier than the email month, it's a December→January
 * rollover and we use email year + 1.
 */
function resolveScheduledYear(emailDate: Date, schedMonth: number): number {
  const emailMonth = emailDate.getUTCMonth() + 1;
  if (schedMonth < emailMonth - 6) return emailDate.getUTCFullYear() + 1;
  if (schedMonth > emailMonth + 6) return emailDate.getUTCFullYear() - 1;
  return emailDate.getUTCFullYear();
}

export const citizensBankParser: EmailParser = {
  key: 'citizens-bank',
  name: 'Citizens Bank iPhone Loan Parser',

  canParse(email: RawEmailData): boolean {
    const from = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';
    return (
      from.includes(CITIZENS_SENDER_SUBSTRING) &&
      subject.includes(CITIZENS_SUBJECT_SUBSTRING)
    );
  },

  extract(email: RawEmailData): ExtractionResult {
    // Try both bodies. Citizens sometimes sends a useless text_body
    // ("It looks like your email client might not support HTML formatted
    // email...") while the real content lives in html_body, so we cannot
    // just prefer text_body — we have to try both and use whichever
    // actually contains the payment fields.
    const candidates: string[] = [];
    if (email.text_body) candidates.push(email.text_body);
    if (email.html_body) candidates.push(stripHtml(email.html_body));

    if (candidates.length === 0) {
      return { success: false, confidence: 0, errors: ['No email body content available'] };
    }

    let amountMatch: RegExpMatchArray | null = null;
    let dateMatch: RegExpMatchArray | null = null;
    for (const body of candidates) {
      amountMatch = body.match(AMOUNT_PATTERN);
      dateMatch = body.match(SCHEDULED_DATE_PATTERN);
      if (amountMatch && dateMatch) break;
    }

    if (!amountMatch) {
      return {
        success: false,
        confidence: 0,
        errors: ['Could not find "Recurring Monthly Payment" amount in email body'],
      };
    }
    if (!dateMatch) {
      return {
        success: false,
        confidence: 0,
        errors: ['Could not find "Payment Scheduled Date" in email body'],
      };
    }

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      return { success: false, confidence: 0, errors: ['Invalid payment amount'] };
    }

    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { success: false, confidence: 0, errors: ['Invalid scheduled date'] };
    }

    const year = resolveScheduledYear(email.email_date, month);
    const transactionDate = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(transactionDate.getTime())) {
      return { success: false, confidence: 0, errors: ['Invalid scheduled date'] };
    }

    const data: ExtractedTransaction = {
      vendor_name_raw: 'Citizens Bank',
      amount,
      currency: 'USD',
      transaction_date: transactionDate,
      description: 'iPhone loan payment',
      order_id: null,
    };

    return {
      success: true,
      confidence: 95,
      data,
    };
  },
};

export { AMOUNT_PATTERN, SCHEDULED_DATE_PATTERN, stripHtml, resolveScheduledYear };
