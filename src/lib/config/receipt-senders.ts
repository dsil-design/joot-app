/**
 * Receipt Sender Configuration
 *
 * Catalog of known receipt sender domains
 * Used for email receipt detection and vendor matching
 */

export interface ReceiptSenderInfo {
  domain: string
  category: string
  displayName: string
  subdomains?: string[] // e.g., ['orders', 'billing', 'receipts']
  confidence: number // 0-100, how confident this domain sends receipts
}

/**
 * Known receipt sender catalog
 *
 * Organized by category for easy maintenance
 * Add new senders as discovered
 */
export const RECEIPT_SENDER_CATALOG: Record<string, ReceiptSenderInfo> = {
  // ============================================================================
  // E-COMMERCE
  // ============================================================================
  'amazon.com': {
    domain: 'amazon.com',
    category: 'ecommerce',
    displayName: 'Amazon',
    subdomains: ['order-update', 'ship-confirm', 'auto-confirm'],
    confidence: 100,
  },
  'ebay.com': {
    domain: 'ebay.com',
    category: 'ecommerce',
    displayName: 'eBay',
    subdomains: ['ebay'],
    confidence: 100,
  },
  'shopify.com': {
    domain: 'shopify.com',
    category: 'ecommerce',
    displayName: 'Shopify',
    subdomains: ['orders'],
    confidence: 95,
  },
  'etsy.com': {
    domain: 'etsy.com',
    category: 'ecommerce',
    displayName: 'Etsy',
    subdomains: ['transaction'],
    confidence: 100,
  },
  'walmart.com': {
    domain: 'walmart.com',
    category: 'ecommerce',
    displayName: 'Walmart',
    subdomains: ['order'],
    confidence: 100,
  },
  'target.com': {
    domain: 'target.com',
    category: 'ecommerce',
    displayName: 'Target',
    confidence: 100,
  },
  'bestbuy.com': {
    domain: 'bestbuy.com',
    category: 'ecommerce',
    displayName: 'Best Buy',
    confidence: 100,
  },

  // ============================================================================
  // FOOD DELIVERY & RIDE-SHARING
  // ============================================================================
  'uber.com': {
    domain: 'uber.com',
    category: 'transportation',
    displayName: 'Uber',
    subdomains: ['uber'],
    confidence: 100,
  },
  'lyft.com': {
    domain: 'lyft.com',
    category: 'transportation',
    displayName: 'Lyft',
    confidence: 100,
  },
  'doordash.com': {
    domain: 'doordash.com',
    category: 'food_delivery',
    displayName: 'DoorDash',
    confidence: 100,
  },
  'grubhub.com': {
    domain: 'grubhub.com',
    category: 'food_delivery',
    displayName: 'Grubhub',
    confidence: 100,
  },
  'ubereats.com': {
    domain: 'ubereats.com',
    category: 'food_delivery',
    displayName: 'Uber Eats',
    confidence: 100,
  },
  'postmates.com': {
    domain: 'postmates.com',
    category: 'food_delivery',
    displayName: 'Postmates',
    confidence: 100,
  },

  // ============================================================================
  // TRAVEL & HOSPITALITY
  // ============================================================================
  'airbnb.com': {
    domain: 'airbnb.com',
    category: 'travel',
    displayName: 'Airbnb',
    confidence: 100,
  },
  'booking.com': {
    domain: 'booking.com',
    category: 'travel',
    displayName: 'Booking.com',
    subdomains: ['noreply'],
    confidence: 100,
  },
  'expedia.com': {
    domain: 'expedia.com',
    category: 'travel',
    displayName: 'Expedia',
    confidence: 100,
  },
  'hotels.com': {
    domain: 'hotels.com',
    category: 'travel',
    displayName: 'Hotels.com',
    confidence: 100,
  },
  'marriott.com': {
    domain: 'marriott.com',
    category: 'travel',
    displayName: 'Marriott',
    confidence: 100,
  },
  'hilton.com': {
    domain: 'hilton.com',
    category: 'travel',
    displayName: 'Hilton',
    confidence: 100,
  },

  // ============================================================================
  // SUBSCRIPTIONS & STREAMING
  // ============================================================================
  'netflix.com': {
    domain: 'netflix.com',
    category: 'subscription',
    displayName: 'Netflix',
    subdomains: ['info'],
    confidence: 100,
  },
  'spotify.com': {
    domain: 'spotify.com',
    category: 'subscription',
    displayName: 'Spotify',
    confidence: 100,
  },
  'hulu.com': {
    domain: 'hulu.com',
    category: 'subscription',
    displayName: 'Hulu',
    confidence: 100,
  },
  'disneyplus.com': {
    domain: 'disneyplus.com',
    category: 'subscription',
    displayName: 'Disney+',
    confidence: 100,
  },
  'youtube.com': {
    domain: 'youtube.com',
    category: 'subscription',
    displayName: 'YouTube',
    confidence: 90,
  },

  // ============================================================================
  // CLOUD & SOFTWARE
  // ============================================================================
  'aws.amazon.com': {
    domain: 'aws.amazon.com',
    category: 'cloud',
    displayName: 'Amazon Web Services',
    subdomains: ['billing'],
    confidence: 100,
  },
  'digitalocean.com': {
    domain: 'digitalocean.com',
    category: 'cloud',
    displayName: 'DigitalOcean',
    confidence: 100,
  },
  'vercel.com': {
    domain: 'vercel.com',
    category: 'cloud',
    displayName: 'Vercel',
    confidence: 100,
  },
  'github.com': {
    domain: 'github.com',
    category: 'software',
    displayName: 'GitHub',
    confidence: 100,
  },
  'heroku.com': {
    domain: 'heroku.com',
    category: 'cloud',
    displayName: 'Heroku',
    confidence: 100,
  },

  // ============================================================================
  // PAYMENT PROCESSORS
  // ============================================================================
  'paypal.com': {
    domain: 'paypal.com',
    category: 'payment',
    displayName: 'PayPal',
    subdomains: ['service'],
    confidence: 100,
  },
  'stripe.com': {
    domain: 'stripe.com',
    category: 'payment',
    displayName: 'Stripe',
    confidence: 100,
  },
  'square.com': {
    domain: 'square.com',
    category: 'payment',
    displayName: 'Square',
    confidence: 100,
  },
  'venmo.com': {
    domain: 'venmo.com',
    category: 'payment',
    displayName: 'Venmo',
    confidence: 100,
  },

  // ============================================================================
  // UTILITIES & SERVICES
  // ============================================================================
  'att.com': {
    domain: 'att.com',
    category: 'utilities',
    displayName: 'AT&T',
    subdomains: ['billing'],
    confidence: 95,
  },
  'verizon.com': {
    domain: 'verizon.com',
    category: 'utilities',
    displayName: 'Verizon',
    confidence: 95,
  },
  'comcast.com': {
    domain: 'comcast.com',
    category: 'utilities',
    displayName: 'Comcast',
    confidence: 95,
  },
  'xfinity.com': {
    domain: 'xfinity.com',
    category: 'utilities',
    displayName: 'Xfinity',
    confidence: 95,
  },

  // ============================================================================
  // GROCERY & RETAIL
  // ============================================================================
  'instacart.com': {
    domain: 'instacart.com',
    category: 'grocery',
    displayName: 'Instacart',
    confidence: 100,
  },
  'wholefoods.com': {
    domain: 'wholefoods.com',
    category: 'grocery',
    displayName: 'Whole Foods',
    confidence: 100,
  },
  'costco.com': {
    domain: 'costco.com',
    category: 'retail',
    displayName: 'Costco',
    confidence: 100,
  },
}

/**
 * Subdomain patterns that indicate receipts
 * Used when specific domain not in catalog
 */
export const RECEIPT_SUBDOMAIN_PATTERNS = [
  'billing',
  'invoice',
  'invoices',
  'receipts',
  'orders',
  'order',
  'noreply',
  'no-reply',
  'transaction',
  'transactions',
  'payment',
  'payments',
  'confirm',
  'confirmation',
]

/**
 * Generic receipt domain patterns
 * Used for domains not in the catalog
 */
export const RECEIPT_DOMAIN_PATTERNS = [
  /billing\./i,
  /invoice\./i,
  /receipts?\./i,
  /orders?\./i,
  /noreply\./i,
  /payment\./i,
]

/**
 * Lookup receipt sender info by domain
 *
 * @param domain - Email sender domain
 * @returns Sender info if known, undefined otherwise
 */
export function getReceiptSenderInfo(domain: string): ReceiptSenderInfo | undefined {
  const normalizedDomain = domain.toLowerCase().trim()

  // Exact match
  if (RECEIPT_SENDER_CATALOG[normalizedDomain]) {
    return RECEIPT_SENDER_CATALOG[normalizedDomain]
  }

  // Check for subdomain match (e.g., orders.amazon.com)
  for (const [key, info] of Object.entries(RECEIPT_SENDER_CATALOG)) {
    if (normalizedDomain.endsWith(`.${key}`)) {
      return info
    }
  }

  return undefined
}

/**
 * Check if domain likely sends receipts based on patterns
 *
 * @param domain - Email sender domain
 * @returns Confidence score (0-100)
 */
export function getDomainReceiptConfidence(domain: string): number {
  const normalizedDomain = domain.toLowerCase().trim()

  // Check catalog
  const senderInfo = getReceiptSenderInfo(normalizedDomain)
  if (senderInfo) {
    return senderInfo.confidence
  }

  // Check subdomain patterns
  const subdomain = normalizedDomain.split('.')[0]
  if (RECEIPT_SUBDOMAIN_PATTERNS.includes(subdomain)) {
    return 70 // Moderate confidence
  }

  // Check domain patterns
  const hasReceiptPattern = RECEIPT_DOMAIN_PATTERNS.some(pattern =>
    pattern.test(normalizedDomain)
  )
  if (hasReceiptPattern) {
    return 60 // Lower confidence
  }

  return 0 // Unknown domain
}

/**
 * Get all known categories
 *
 * @returns Array of unique categories
 */
export function getReceiptCategories(): string[] {
  const categories = new Set<string>()
  for (const info of Object.values(RECEIPT_SENDER_CATALOG)) {
    categories.add(info.category)
  }
  return Array.from(categories).sort()
}

/**
 * Get senders by category
 *
 * @param category - Category to filter by
 * @returns Array of sender info for category
 */
export function getSendersByCategory(category: string): ReceiptSenderInfo[] {
  return Object.values(RECEIPT_SENDER_CATALOG).filter(
    info => info.category === category
  )
}
