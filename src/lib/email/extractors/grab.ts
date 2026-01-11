/**
 * Grab Email Parser
 *
 * Parses receipt emails from Grab services:
 * - GrabFood (food delivery)
 * - GrabTaxi/GrabCar (ride-hailing)
 * - GrabMart (grocery/shopping delivery)
 * - GrabExpress (package delivery)
 *
 * Key patterns:
 * - Sender: no-reply@grab.com
 * - Subject: "Your Grab E-Receipt" or "Your GrabExpress Receipt"
 * - Currency: Always THB (฿)
 * - Amount: Needs to be matched to USD credit card charge
 */

import type { EmailParser, RawEmailData, ExtractionResult, ExtractedTransaction } from '../types';

// Grab sender patterns
const GRAB_SENDER_PATTERNS = [
  'no-reply@grab.com',
  'noreply@grab.com',
];

// Grab subject patterns
const GRAB_SUBJECT_PATTERNS = [
  'your grab e-receipt',
  'your grabexpress receipt',
  'your grabmart receipt',
];

// Amount extraction patterns
// THB with ฿ symbol or "THB" prefix
const THB_AMOUNT_PATTERN = /(?:฿|THB)\s*([\d,]+(?:\.\d{2})?)/gi;

// Order/Booking ID patterns
// Note: Patterns are checked in order - more specific patterns first
const ORDER_ID_PATTERNS = [
  /\b(A-\d{12,})\b/gi, // Grab format: A-XXXXXXXXXXXX
  /\b((?:GF|GM|GE|GC)-[\w-]+)\b/gi, // Service-specific prefixes with full match capture
  /(?:Order|Booking)\s+(?:ID|No\.?|Number)[:\s]+([A-Z0-9-]+)/gi, // Must have ID/No/Number keyword
];

// Service type detection patterns
interface GrabServiceInfo {
  type: 'food' | 'taxi' | 'mart' | 'express';
  vendorName: string;
  vendorId?: string;
}

// Known vendor IDs from TRANSACTION-IMPORT-REFERENCE.md
const GRAB_VENDOR_IDS = {
  food: '6b451d8c-b8db-4475-b19b-6c3cf38b93d0',
  taxi: '20af541a-173c-4f7a-9e04-e0c821f7d367',
  mart: '58f6f707-3771-41bf-a5eb-12a0b2ef0e3b',
  express: undefined, // Look up when encountered
};

/**
 * Detect Grab service type from email content
 */
function detectServiceType(body: string, subject: string): GrabServiceInfo {
  const lowerBody = body.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  // GrabExpress - check first as it has unique subject
  if (
    lowerSubject.includes('grabexpress') ||
    lowerBody.includes('grabexpress') ||
    lowerBody.includes('grabassistant')
  ) {
    return {
      type: 'express',
      vendorName: 'GrabExpress',
      vendorId: GRAB_VENDOR_IDS.express,
    };
  }

  // GrabMart
  if (lowerBody.includes('grabmart') || lowerSubject.includes('grabmart')) {
    return {
      type: 'mart',
      vendorName: 'GrabMart',
      vendorId: GRAB_VENDOR_IDS.mart,
    };
  }

  // GrabTaxi/GrabCar - rides have specific indicators
  if (
    lowerBody.includes('hope you enjoyed your ride') ||
    lowerBody.includes('grabtaxi') ||
    lowerBody.includes('grabcar') ||
    lowerBody.includes('your ride') ||
    lowerBody.includes('pickup:') && lowerBody.includes('dropoff:')
  ) {
    return {
      type: 'taxi',
      vendorName: 'Grab Taxi',
      vendorId: GRAB_VENDOR_IDS.taxi,
    };
  }

  // GrabFood - most common, check for food-related patterns
  if (
    lowerBody.includes('grabfood') ||
    lowerBody.includes('your order from') ||
    lowerBody.includes('food delivery') ||
    lowerBody.includes('restaurant')
  ) {
    return {
      type: 'food',
      vendorName: 'GrabFood',
      vendorId: GRAB_VENDOR_IDS.food,
    };
  }

  // Default to GrabFood as it's most common
  return {
    type: 'food',
    vendorName: 'Grab',
    vendorId: GRAB_VENDOR_IDS.food,
  };
}

/**
 * Extract restaurant name from GrabFood emails
 */
function extractRestaurantName(body: string): string | null {
  // Pattern: "Your order from {Restaurant}"
  const orderFromMatch = body.match(/your order from\s+([^\n<]+)/i);
  if (orderFromMatch) {
    return orderFromMatch[1].trim().replace(/<[^>]*>/g, '').trim();
  }

  // Pattern: "Order from {Restaurant}"
  const fromMatch = body.match(/order from\s+([^\n<]+)/i);
  if (fromMatch) {
    return fromMatch[1].trim().replace(/<[^>]*>/g, '').trim();
  }

  return null;
}

/**
 * Extract dropoff location from GrabTaxi emails
 */
function extractDropoffLocation(body: string): string | null {
  // Pattern: "Drop-off: {Location}" or "Dropoff: {Location}"
  const dropoffMatch = body.match(/drop-?off[:\s]+([^\n<]+)/i);
  if (dropoffMatch) {
    const location = dropoffMatch[1].trim().replace(/<[^>]*>/g, '').trim();
    // Simplify to recognizable destination
    return simplifyDestination(location);
  }
  return null;
}

/**
 * Simplify destination to common names
 */
function simplifyDestination(location: string): string {
  const lower = location.toLowerCase();

  if (lower.includes('golf')) return 'Golf';
  if (lower.includes('airport')) return 'Airport';
  if (lower.includes('central') || lower.includes('mall')) return 'Mall';
  if (lower.includes('hotel')) return 'Hotel';
  if (lower.includes('hospital')) return 'Hospital';
  if (lower.includes('station')) return 'Station';

  // Return first meaningful part (before comma or parenthesis)
  const simplified = location.split(/[,(]/)[0].trim();
  return simplified.length > 30 ? simplified.substring(0, 30) + '...' : simplified;
}

/**
 * Extract description based on service type
 */
function extractDescription(body: string, serviceInfo: GrabServiceInfo, emailDate: Date): string {
  switch (serviceInfo.type) {
    case 'food': {
      const restaurant = extractRestaurantName(body);
      if (restaurant) {
        const foodType = getFoodType(emailDate, restaurant);
        return `${foodType}: ${restaurant}`;
      }
      return 'Food Delivery';
    }

    case 'taxi': {
      const dropoff = extractDropoffLocation(body);
      if (dropoff) {
        return `Taxi to ${dropoff}`;
      }
      return 'Ride';
    }

    case 'mart': {
      // Try to extract store name
      const storeMatch = body.match(/from\s+([^\n<]+)/i);
      if (storeMatch) {
        const store = storeMatch[1].trim().replace(/<[^>]*>/g, '').trim();
        return `Groceries - ${store}`;
      }
      return 'Grocery Delivery';
    }

    case 'express': {
      return 'Delivery';
    }

    default:
      return 'Grab';
  }
}

/**
 * Determine food type based on time of day and restaurant type
 */
function getFoodType(emailDate: Date, restaurant: string): string {
  const lowerRestaurant = restaurant.toLowerCase();

  // Dessert shops - always "Dessert" regardless of time
  const dessertShops = ['dairy queen', 'swensen', 'baskin', 'ice cream', 'gelato', 'cake'];
  if (dessertShops.some(shop => lowerRestaurant.includes(shop))) {
    return 'Dessert';
  }

  // Coffee shops - always "Coffee"
  const coffeeShops = ['starbucks', 'cafe', 'coffee', 'ristr8to', 'amazon'];
  if (coffeeShops.some(shop => lowerRestaurant.includes(shop))) {
    return 'Coffee';
  }

  // Convenience stores - usually "Snack"
  const convenienceStores = ['7-eleven', '7eleven', 'family mart', 'lawson'];
  if (convenienceStores.some(shop => lowerRestaurant.includes(shop))) {
    return 'Snack';
  }

  // Time-based for regular restaurants
  const hour = emailDate.getHours();
  if (hour < 11) return 'Breakfast';
  if (hour < 15) return 'Lunch';
  if (hour >= 17) return 'Dinner';
  return 'Meal';
}

/**
 * Extract THB amount from email body
 */
function extractAmount(body: string): { amount: number; confidence: number } | null {
  const matches: number[] = [];

  // Find all THB amounts
  let match;
  while ((match = THB_AMOUNT_PATTERN.exec(body)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (!isNaN(amount) && amount > 0) {
      matches.push(amount);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  // For Grab receipts, the total is typically the largest amount
  // (includes service fees, delivery fees, etc.)
  const total = Math.max(...matches);

  // Higher confidence if multiple amounts found (indicates itemized receipt)
  const confidence = matches.length > 1 ? 95 : 80;

  return { amount: total, confidence };
}

/**
 * Extract order/booking ID from email
 */
function extractOrderId(body: string, subject: string): string | null {
  const combinedText = `${subject} ${body}`;

  for (const pattern of ORDER_ID_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const match = pattern.exec(combinedText);
    if (match) {
      // Return the captured group if present, otherwise the full match
      return match[1] || match[0];
    }
  }

  return null;
}

/**
 * Check if email uses GrabPay Wallet
 * If so, no CC charge is expected (covered by wallet TopUp)
 */
function isGrabPayWallet(body: string): boolean {
  const lowerBody = body.toLowerCase();
  return lowerBody.includes('grabpay wallet') || lowerBody.includes('grabpay balance');
}

/**
 * Grab Email Parser implementation
 */
export const grabParser: EmailParser = {
  key: 'grab',
  name: 'Grab Receipt Parser',

  /**
   * Check if this parser can handle the given email
   */
  canParse(email: RawEmailData): boolean {
    const fromAddress = email.from_address?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';

    // Check sender
    const isFromGrab = GRAB_SENDER_PATTERNS.some(pattern =>
      fromAddress.includes(pattern)
    );

    if (isFromGrab) {
      return true;
    }

    // Check subject as fallback
    const hasGrabSubject = GRAB_SUBJECT_PATTERNS.some(pattern =>
      subject.includes(pattern)
    );

    return hasGrabSubject;
  },

  /**
   * Extract transaction data from Grab email
   */
  extract(email: RawEmailData): ExtractionResult {
    const errors: string[] = [];
    const notes: string[] = [];

    // Use text body if available, fall back to HTML
    const body = email.text_body || email.html_body || '';

    if (!body) {
      return {
        success: false,
        confidence: 0,
        errors: ['No email body content available'],
      };
    }

    // Check if GrabPay Wallet was used
    if (isGrabPayWallet(body)) {
      notes.push('Payment via GrabPay Wallet - no CC charge expected');
    }

    // Detect service type
    const serviceInfo = detectServiceType(body, email.subject || '');

    // Extract amount
    const amountResult = extractAmount(body);
    if (!amountResult) {
      return {
        success: false,
        confidence: 0,
        errors: ['No THB amount found in email'],
      };
    }

    // Extract order ID
    const orderId = extractOrderId(body, email.subject || '');
    if (!orderId) {
      notes.push('No order ID found');
    }

    // Extract description
    const description = extractDescription(body, serviceInfo, email.email_date);

    // Calculate confidence
    let confidence = 40; // Base: all required fields present

    // Amount found
    confidence += 20;

    // Date from email (always have this)
    confidence += 20;

    // Vendor identified
    if (serviceInfo.vendorId) {
      confidence += 10;
    }

    // Order ID found
    if (orderId) {
      confidence += 10;
    }

    // Build extracted transaction
    const data: ExtractedTransaction = {
      vendor_name_raw: serviceInfo.vendorName,
      amount: amountResult.amount,
      currency: 'THB',
      transaction_date: email.email_date,
      description,
      order_id: orderId,
    };

    // Add vendor ID if known
    if (serviceInfo.vendorId) {
      data.vendor_id = serviceInfo.vendorId;
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
  detectServiceType,
  extractRestaurantName,
  extractDropoffLocation,
  extractAmount,
  extractOrderId,
  isGrabPayWallet,
  getFoodType,
  GRAB_SENDER_PATTERNS,
  GRAB_SUBJECT_PATTERNS,
};
