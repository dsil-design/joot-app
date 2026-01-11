/**
 * Bolt Email Parser
 *
 * Parses receipt emails from Bolt ride-hailing service.
 *
 * Key patterns:
 * - Sender: bangkok@bolt.eu (via Apple Private Relay)
 * - Subject: "Your Bolt ride on [Day of Week]" (e.g., "Your Bolt ride on Saturday")
 * - Currency: Always THB (฿)
 * - Amount: Needs to be matched to USD credit card charge
 *
 * Bolt statement pattern: WWW.2C2P.COM*2C2P (THAILA on Chase statements
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction } from '../types';

// Bolt sender patterns
const BOLT_SENDER_PATTERNS = [
  'bangkok@bolt.eu',
  'bolt@bolt.eu',
  'noreply@bolt.eu',
];

// Bolt subject patterns
const BOLT_SUBJECT_PATTERNS = [
  'your bolt ride on',
  'bolt ride receipt',
  'bolt ride summary',
];

// Amount extraction patterns
// THB with ฿ symbol or "THB" prefix - supports various HTML entities
const THB_AMOUNT_PATTERN = /(?:฿|&#3647;|THB)\s*([\d,]+(?:\.\d{2})?)/gi;

// Total amount pattern (often labeled as "Total" in HTML)
const TOTAL_AMOUNT_PATTERN = /total[:\s]*(?:฿|&#3647;|THB)?\s*([\d,]+(?:\.\d{2})?)/gi;

// Trip/Ride ID patterns
const TRIP_ID_PATTERNS = [
  /trip\s*(?:id|#|no\.?)?[:\s]*([A-Z0-9-]+)/gi,
  /ride\s*(?:id|#|no\.?)?[:\s]*([A-Z0-9-]+)/gi,
  /booking\s*(?:id|#|no\.?)?[:\s]*([A-Z0-9-]+)/gi,
  /reference[:\s]*([A-Z0-9-]+)/gi,
];

// Known Bolt vendor ID from TRANSACTION-IMPORT-REFERENCE.md
const BOLT_VENDOR_ID = 'dcfd535e-46dc-42d5-9590-d9688d32e3cf';

/**
 * Extract destination from Bolt ride email
 */
function extractDestination(body: string): string | null {
  // Pattern: "Drop-off" or "Dropoff" or "To:" followed by location
  const dropoffPatterns = [
    /drop[\s-]?off[:\s]+([^\n<]+)/i,
    /destination[:\s]+([^\n<]+)/i,
    /to[:\s]+([^\n<]+)/i,
  ];

  for (const pattern of dropoffPatterns) {
    const match = body.match(pattern);
    if (match) {
      const location = match[1].trim().replace(/<[^>]*>/g, '').trim();
      // Return simplified destination
      return simplifyDestination(location);
    }
  }

  return null;
}

/**
 * Simplify destination to recognizable names
 */
function simplifyDestination(location: string): string {
  const lower = location.toLowerCase();

  // Common destination patterns
  if (lower.includes('airport')) return 'Airport';
  if (lower.includes('golf')) return 'Golf';
  if (lower.includes('central') || lower.includes('mall') || lower.includes('plaza')) return 'Mall';
  if (lower.includes('hotel')) return 'Hotel';
  if (lower.includes('hospital')) return 'Hospital';
  if (lower.includes('station') || lower.includes('terminal')) return 'Station';
  if (lower.includes('university') || lower.includes('university')) return 'University';

  // Return first meaningful part (before comma or parenthesis)
  const simplified = location.split(/[,(]/)[0].trim();
  return simplified.length > 30 ? simplified.substring(0, 30) + '...' : simplified;
}

/**
 * Extract pickup location from Bolt ride email
 */
function extractPickup(body: string): string | null {
  const pickupPatterns = [
    /pick[\s-]?up[:\s]+([^\n<]+)/i,
    /from[:\s]+([^\n<]+)/i,
    /origin[:\s]+([^\n<]+)/i,
  ];

  for (const pattern of pickupPatterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1].trim().replace(/<[^>]*>/g, '').trim();
    }
  }

  return null;
}

/**
 * Extract THB amount from email body
 * For Bolt, the total is usually clearly labeled
 */
function extractAmount(body: string): { amount: number; confidence: number } | null {
  // First try to find explicitly labeled "Total"
  const totalMatches: number[] = [];
  let match;

  // Reset lastIndex
  TOTAL_AMOUNT_PATTERN.lastIndex = 0;
  while ((match = TOTAL_AMOUNT_PATTERN.exec(body)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
      totalMatches.push(amount);
    }
  }

  if (totalMatches.length > 0) {
    // Take the largest "total" as the final amount
    return { amount: Math.max(...totalMatches), confidence: 95 };
  }

  // Fall back to finding any THB amounts
  const allMatches: number[] = [];
  THB_AMOUNT_PATTERN.lastIndex = 0;
  while ((match = THB_AMOUNT_PATTERN.exec(body)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
      allMatches.push(amount);
    }
  }

  if (allMatches.length === 0) {
    return null;
  }

  // Take the largest amount as the total
  return { amount: Math.max(...allMatches), confidence: 80 };
}

/**
 * Extract trip/ride ID from email
 */
function extractTripId(body: string, subject: string): string | null {
  const combinedText = `${subject} ${body}`;

  for (const pattern of TRIP_ID_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const match = pattern.exec(combinedText);
    if (match) {
      const id = match[1].trim();
      // Filter out very short IDs or common words
      if (id.length >= 5 && !/^(total|trip|ride|bolt|from|drop)$/i.test(id)) {
        return id;
      }
    }
  }

  return null;
}

/**
 * Extract day of week from subject line
 * "Your Bolt ride on Saturday" -> "Saturday"
 */
function extractDayFromSubject(subject: string): string | null {
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const lowerSubject = subject.toLowerCase();

  for (const day of daysOfWeek) {
    if (lowerSubject.includes(day)) {
      return day.charAt(0).toUpperCase() + day.slice(1);
    }
  }

  return null;
}

/**
 * Build description from Bolt ride details
 */
function buildDescription(body: string, subject: string): string {
  const destination = extractDestination(body);
  const dayOfWeek = extractDayFromSubject(subject);

  if (destination) {
    if (dayOfWeek) {
      return `${dayOfWeek} Ride to ${destination}`;
    }
    return `Ride to ${destination}`;
  }

  if (dayOfWeek) {
    return `${dayOfWeek} Ride`;
  }

  return 'Ride';
}

/**
 * Bolt Email Parser implementation
 */
export const boltParser: EmailParser = {
  key: 'bolt',
  name: 'Bolt Ride Receipt Parser',

  /**
   * Check if this parser can handle the given email
   */
  canParse(email: RawEmailData): boolean {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Check sender
    const isFromBolt = BOLT_SENDER_PATTERNS.some(pattern =>
      fromAddress.includes(pattern)
    );

    if (isFromBolt) {
      return true;
    }

    // Check subject as fallback
    const hasBoltSubject = BOLT_SUBJECT_PATTERNS.some(pattern =>
      subject.includes(pattern)
    );

    return hasBoltSubject;
  },

  /**
   * Extract transaction data from Bolt ride receipt email
   */
  extract(email: RawEmailData): ExtractionResult {
    const errors: string[] = [];
    const notes: string[] = [];

    // Use text body if available, fall back to HTML
    // Note: Bolt emails are typically HTML, so we may need to parse HTML
    let body = email.text_body || '';

    // If text body is empty or too short, use HTML body
    if (body.length < 50 && email.html_body) {
      // Strip HTML tags for basic extraction
      body = email.html_body
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script blocks
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp;
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }

    if (!body) {
      return {
        success: false,
        confidence: 0,
        errors: ['No email body content available'],
      };
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

    // Extract trip ID
    const tripId = extractTripId(body, email.subject || '');
    if (!tripId) {
      notes.push('No trip ID found');
    }

    // Build description
    const description = buildDescription(body, email.subject || '');

    // Calculate confidence
    let confidence = 40; // Base: all required fields present

    // Amount found
    confidence += 20;

    // Date from email (always have this)
    confidence += 20;

    // Vendor identified (Bolt)
    confidence += 10;

    // Trip ID found
    if (tripId) {
      confidence += 10;
    }

    // Build extracted transaction
    const data: ExtractedTransaction = {
      vendor_name_raw: 'Bolt',
      amount: amountResult.amount,
      currency: 'THB',
      transaction_date: email.email_date,
      description,
      order_id: tripId,
      vendor_id: BOLT_VENDOR_ID,
    };

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
  extractDestination,
  extractPickup,
  extractAmount,
  extractTripId,
  extractDayFromSubject,
  buildDescription,
  simplifyDestination,
  BOLT_SENDER_PATTERNS,
  BOLT_SUBJECT_PATTERNS,
  BOLT_VENDOR_ID,
};
