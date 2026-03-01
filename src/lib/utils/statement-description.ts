/**
 * Statement Description Cleaning
 *
 * Cleans raw credit card / bank statement descriptions into
 * human-readable text for display. The raw data is preserved
 * in the database; this is purely a display transformation.
 */

/**
 * Metadata labels commonly found in statement descriptions
 * (especially airline/travel transactions). We truncate at
 * the first occurrence of any of these.
 */
const NOISE_PATTERNS = [
  /\bFrom:\s*/i,
  /\bTo:\s*/i,
  /\bCarrier:\s*/i,
  /\bClass:\s*/i,
  /\bTicket\s*(?:Number|No|#):?\s*/i,
  /\bDate\s+of\s+/i,
  /\bReference\s*(?:Number|No|#)?:?\s*/i,
  /\bCard\s*(?:Number|No|#):?\s*/i,
  /\bTransaction\s*(?:ID|Number|No|#):?\s*/i,
  /\bAuth(?:orization)?\s*(?:Code|#):?\s*/i,
  /\bMerchant\s*(?:ID|#):?\s*/i,
  /\bTerminal\s*(?:ID|#):?\s*/i,
  /\bSequence\s*(?:Number|No|#):?\s*/i,
]

/**
 * Clean a raw statement description for display.
 *
 * Steps:
 * 1. Fix missing spaces (camelCase joins, colon joins)
 * 2. Truncate at metadata noise
 * 3. Remove trailing junk (trailing numbers, dashes, slashes)
 * 4. Normalize whitespace
 * 5. Title-case if ALL CAPS
 */
export function cleanStatementDescription(raw: string): string {
  if (!raw) return ''

  let desc = raw

  // 1. Fix missing spaces around common join issues
  // lowercase→Uppercase: "BerhadFrom" → "Berhad From"
  desc = desc.replace(/([a-z])([A-Z])/g, '$1 $2')
  // letter→colon→letter without space: "Carrier:Class" → "Carrier: Class"
  desc = desc.replace(/:([A-Za-z])/g, ': $1')
  // digit stuck to letter: "BFMMFKDate" → "BFMMFK Date" (uppercase block then title-case)
  desc = desc.replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2')

  // 2. Truncate at the first noise keyword
  let earliestIndex = desc.length
  for (const pattern of NOISE_PATTERNS) {
    const match = pattern.exec(desc)
    if (match && match.index !== undefined && match.index > 0 && match.index < earliestIndex) {
      earliestIndex = match.index
    }
  }
  if (earliestIndex < desc.length) {
    desc = desc.substring(0, earliestIndex)
  }

  // 3. Collapse whitespace and trim
  desc = desc.replace(/\s+/g, ' ').trim()

  // 4. Remove trailing junk (dashes, slashes, stray numbers, stray punctuation)
  desc = desc.replace(/[\s\-/.,;:*#]+$/, '').trim()

  // 5. Title-case if the result is entirely uppercase (>3 chars)
  if (desc.length > 3 && desc === desc.toUpperCase()) {
    desc = titleCase(desc)
  }

  return desc || raw.substring(0, 60).trim()
}

/**
 * Simple title-case that handles hyphenated words and common separators.
 * Preserves 2-3 letter country/currency codes (TH, MY, USD) as uppercase.
 */
function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|[\s\-/])\S/g, (match) => match.toUpperCase())
    // Restore short uppercase tokens that are likely codes (TH, MY, US, etc.)
    .replace(/\b[a-z]{2,3}\b/gi, (word) => {
      // If original was all-uppercase and 2-3 chars, keep uppercase
      if (word.length <= 3 && /^[a-z]+$/i.test(word)) {
        const upper = word.toUpperCase()
        // Only restore if it looks like a code (not a common word)
        if (!COMMON_SHORT_WORDS.has(upper)) {
          return upper
        }
      }
      return word
    })
}

/** Common short words that should NOT be forced to uppercase */
const COMMON_SHORT_WORDS = new Set([
  'THE', 'AND', 'FOR', 'BUT', 'NOR', 'NOT', 'YET', 'SO',
  'AT', 'BY', 'IN', 'OF', 'ON', 'TO', 'UP', 'AS', 'IS',
  'IT', 'OR', 'AN', 'IF', 'DO', 'NO', 'GO', 'HE', 'ME',
  'WE', 'ALL', 'HAS', 'HIS', 'HER', 'ITS', 'OUR', 'ARE',
  'WAS', 'NEW', 'OLD', 'BIG', 'ONE', 'TWO', 'THE', 'CAN',
  'MAY', 'DAY', 'WAY', 'PAY', 'TOP',
])
