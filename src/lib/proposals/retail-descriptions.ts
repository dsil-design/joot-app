/**
 * Online-retail order descriptions
 *
 * Marketplace parsers (Amazon, Lazada, …) extract a *product-listing title*,
 * not a description. Those titles are keyword soup written for the seller's
 * search ranking:
 *
 *   "TACVASEN Workout Shirts for Men Muscle Tank Top Mens Sleeveless Shirts
 *    Gym Top Dry Fit UPF 50+ Workout Muscle Sleeveless Gym Tee Mulled Teal XL"
 *
 * The rule engine used to hand that straight through at 90% confidence, which
 * both filled the ledger with unreadable rows and blocked the LLM layer from
 * ever proposing something better (the merge only lets a higher score win).
 *
 * This module supplies the two things needed instead:
 *
 * - `isRawProductListing` / `isPlaceholderOrderDescription` — recognizing that
 *   a description is a raw title (or a "N sub-orders" stand-in), so the rule
 *   engine can score it low and escalate.
 * - `condenseProductTitle` / `summarizeOrderItems` — a deterministic
 *   shortening used when no LLM is available. Not as good as the model, but
 *   always better than the raw title.
 *
 * The conventions encoded here were read off the user's own history —
 * "Wine Saver with Bottle Stoppers", "Magnesium, Tote Bag", "Anker Power Bank",
 * "Gift for Leigh: Logitech MX Vertical Wireless Mouse".
 */

/** Parsers whose `description` is a verbatim product-listing title. */
export const RETAIL_PARSER_KEYS = new Set(['amazon', 'lazada'])

export interface RetailOrderItem {
  name: string
  quantity: number
  amount?: number
  currency?: string
}

export function isRetailParser(parserKey: string | undefined): boolean {
  return !!parserKey && RETAIL_PARSER_KEYS.has(parserKey)
}

/**
 * Marketplaces recognized by who sent the mail or how the charge posts.
 *
 * The dedicated parsers cover only Amazon and Lazada, and only when they win
 * the parse — plenty of the same merchants' receipts land on the AI fallback
 * instead, and a statement row can arrive with no email at all. Those are the
 * same kind of purchase and want the same kind of description.
 */
const MARKETPLACE_SENDER = /\b(amazon|lazada|shopee|aliexpress|alibaba|temu|ebay|etsy|shein|jd\.co)\b/i
const MARKETPLACE_DESCRIPTOR =
  /(amazon|amzn\.com|amzn\s+mktp|lazada|shopee|aliexpress|temu\.com|ebay|etsy)/i

/**
 * Whether an item is an online-retail order, from any signal available.
 * Sender and merchant descriptor are checked alongside the parser key so
 * marketplace receipts that fell through to the AI fallback are handled the
 * same way as ones a dedicated parser claimed.
 */
export function isRetailOrder(signals: {
  parserKey?: string
  fromAddress?: string
  fromName?: string
  statementDescription?: string
}): boolean {
  if (isRetailParser(signals.parserKey)) return true
  if (signals.fromAddress && MARKETPLACE_SENDER.test(signals.fromAddress)) return true
  if (signals.fromName && MARKETPLACE_SENDER.test(signals.fromName)) return true
  if (signals.statementDescription && MARKETPLACE_DESCRIPTOR.test(signals.statementDescription)) {
    return true
  }
  return false
}

/**
 * Stand-in descriptions a parser emits when it could not name the goods —
 * "Amazon order (2 sub-orders)", "Multiple orders: … (3 orders total)".
 * These say nothing about what was bought and must never be proposed as-is.
 */
export function isPlaceholderOrderDescription(description: string): boolean {
  const d = description.trim()
  if (!d) return true
  return (
    /\(\d+\s+sub-orders?\)/i.test(d) ||
    /\(\d+\s+orders?\s+total\)/i.test(d) ||
    /^(amazon|lazada)\s+order$/i.test(d) ||
    /^multiple orders\b/i.test(d) ||
    /^order\s+confirm(ed|ation)\b/i.test(d)
  )
}

/**
 * Marketing filler that a listing title stacks up and a description never
 * needs. Presence of several of these is the strongest signal that a string
 * is a listing title rather than something a person wrote.
 */
const LISTING_NOISE = [
  'for men', 'for women', 'for kids', 'mens', 'womens', "men's", "women's",
  'dry fit', 'quick dry', 'lightweight', 'heavy duty', 'high absorption',
  'premium', 'professional', 'upf', 'non-gmo', 'gluten free', 'vegan',
  'third party tested', 'multipack', 'pack of', 'with arch support',
  'best seller', 'upgraded', 'newest', 'compatible with', 'suitable for',
]

/**
 * Whether a description reads as a raw listing title rather than a human
 * description. Deliberately conservative: it takes real length *plus* a
 * corroborating signal, so a legitimate long description a person typed
 * ("Command Strips, Anniversary Gift: Pickleball Paddle Set") is left alone.
 */
export function isRawProductListing(description: string): boolean {
  const d = description.trim()
  if (d.length < 45) return false

  const lower = d.toLowerCase()
  const wordCount = d.split(/\s+/).length
  const noiseHits = LISTING_NOISE.filter((n) => lower.includes(n)).length

  // Size/colour/model tail: "… Mulled Teal XL", "… (Orange, 13 Wide)",
  // "… SH60/72", "… 90 Capsules".
  const hasSpecTail =
    /\b(?:XS|S|M|L|XL|XXL|2XL|3XL)\b\s*$/.test(d) ||
    /\((?:[^)]*\b(?:pack|count|ct|oz|ml|mg|capsules?|inch|wide|colou?r)\b[^)]*)\)\s*$/i.test(d) ||
    /\b\d+\s*(?:pack|count|ct|oz|ml|mg|capsules?|pcs?|pieces?)\b/i.test(d)

  // Listing titles repeat their keywords ("Workout … Workout", "Sleeveless
  // … Sleeveless") because repetition is what ranks.
  const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3)
  const repeated = words.length - new Set(words).size

  if (noiseHits >= 2) return true
  if (wordCount >= 12 && (noiseHits >= 1 || hasSpecTail || repeated >= 2)) return true
  if (wordCount >= 16) return true
  return false
}

/**
 * Boundaries where a listing title stops naming the product and starts
 * qualifying it. Cutting at the first one keeps the noun phrase and drops the
 * keyword tail: "TACVASEN Workout Shirts for Men Muscle Tank Top …" →
 * "TACVASEN Workout Shirts".
 */
const QUALIFIER_BOUNDARY =
  /(?:,\s|\s(?:[-–—|]\s|for\s+(?:men|women|kids|boys|girls|adults?)\b|with\s|w\/\s))/i

const MAX_WORDS = 6
const MAX_CHARS = 60

/**
 * Shorten one product-listing title to a description-length noun phrase.
 * Deterministic — this is the no-LLM fallback, not the primary path.
 */
export function condenseProductTitle(title: string): string {
  let s = title
    .replace(/\s+/g, ' ')
    .trim()
    // Trailing parentheticals are always variant detail: "(Orange, 13 Wide)"
    .replace(/\s*\([^)]*\)\s*$/g, '')
    // Bracketed seller tags: "[Amazon Exclusive]"
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim()

  const cut = s.search(QUALIFIER_BOUNDARY)
  if (cut > 0) s = s.slice(0, cut).trim()

  const words = s.split(/\s+/)
  if (words.length > MAX_WORDS) s = words.slice(0, MAX_WORDS).join(' ')

  if (s.length > MAX_CHARS) {
    const clipped = s.slice(0, MAX_CHARS)
    const lastSpace = clipped.lastIndexOf(' ')
    s = (lastSpace > 20 ? clipped.slice(0, lastSpace) : clipped).trim()
  }

  // Drop a dangling connective left by the cut ("Shirts for", "Case with")
  s = s.replace(/\s+(?:for|with|and|the|a|an|in|of|to|by|w\/)$/i, '').trim()

  if (s && s === s.toUpperCase() && s.length > 3) {
    s = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return s || title.trim()
}

/**
 * Summarize a whole order's line items the way the user writes them:
 * distinct products comma-separated, repeats collapsed to a count.
 *
 *   4× the same tank top          → "TACVASEN Workout Shirts (4)"
 *   magnesium + a tote bag        → "Magnesium Glycinate, Tote Bag"
 *
 * Returns null when there is nothing usable to summarize, so callers keep
 * their own fallback.
 */
export function summarizeOrderItems(items: RetailOrderItem[]): string | null {
  const named = items.filter((i) => i.name && i.name.trim().length > 1)
  if (named.length === 0) return null

  // Group by condensed title so four variants of one shirt read as one line.
  const groups: Array<{ label: string; quantity: number; amount: number }> = []
  for (const item of named) {
    const label = condenseProductTitle(item.name)
    if (!label) continue
    const key = label.toLowerCase()
    const existing = groups.find((g) => g.label.toLowerCase() === key)
    const qty = Math.max(1, item.quantity || 1)
    if (existing) {
      existing.quantity += qty
      existing.amount += (item.amount ?? 0) * qty
    } else {
      groups.push({ label, quantity: qty, amount: (item.amount ?? 0) * qty })
    }
  }
  if (groups.length === 0) return null

  // Most significant first — by spend when the parser gave us prices, else
  // by the order they appeared in the email.
  if (groups.some((g) => g.amount > 0)) {
    groups.sort((a, b) => b.amount - a.amount)
  }

  const MAX_GROUPS = 3
  const shown = groups.slice(0, MAX_GROUPS)
  const hidden = groups.length - shown.length

  const parts = shown.map((g) => (g.quantity > 1 ? `${g.label} (${g.quantity})` : g.label))
  let summary = parts.join(', ')
  if (hidden > 0) summary += ` +${hidden} more`

  return summary
}

/**
 * The best description we can produce for a retail order without an LLM:
 * the item summary when line items were recovered, otherwise a condensed
 * version of whatever title the parser stored.
 */
export function fallbackRetailDescription(
  description: string,
  items?: RetailOrderItem[]
): string | null {
  const fromItems = items && items.length > 0 ? summarizeOrderItems(items) : null
  if (fromItems) return fromItems
  if (isPlaceholderOrderDescription(description)) return null
  const condensed = condenseProductTitle(description)
  return condensed && condensed !== description.trim() ? condensed : null
}
