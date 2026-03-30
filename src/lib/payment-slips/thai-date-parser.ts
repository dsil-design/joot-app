/**
 * Deterministic Thai Date Parser
 *
 * Parses raw Thai date strings from bank payment slips into ISO dates.
 * Used to cross-check Claude Vision's date extraction.
 */

// Thai abbreviated months → 0-indexed month number
const THAI_MONTH_MAP: Record<string, number> = {
  'ม.ค.': 0,   // January
  'ก.พ.': 1,   // February
  'มี.ค.': 2,  // March
  'เม.ย.': 3,  // April
  'พ.ค.': 4,   // May
  'มิ.ย.': 5,  // June
  'ก.ค.': 6,   // July
  'ส.ค.': 7,   // August
  'ก.ย.': 8,   // September
  'ต.ค.': 9,   // October
  'พ.ย.': 10,  // November
  'ธ.ค.': 11,  // December
}

// English 3-letter abbreviated months → 0-indexed month number
const EN_MONTH_MAP: Record<string, number> = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3,
  'may': 4, 'jun': 5, 'jul': 6, 'aug': 7,
  'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
}

export interface ThaiDateParseResult {
  date: string       // ISO YYYY-MM-DD
  source: 'thai_be' | 'western'
}

/**
 * Parse a raw date string from a Thai bank payment slip.
 *
 * Supports:
 * - KBank Thai BE format: "20 ต.ค. 69" → October 20, 2026
 * - Bangkok Bank Western format: "14 Mar 26, 21:04" → March 14, 2026
 *
 * Returns null if the string cannot be parsed.
 */
export function parseThaiSlipDate(raw: string): ThaiDateParseResult | null {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()

  // Try KBank Thai format: "DD <thai_month> YY" (e.g. "20 ต.ค. 69")
  const thaiResult = parseKBankThaiDate(trimmed)
  if (thaiResult) return thaiResult

  // Try Bangkok Bank Western format: "DD Mon YY" with optional time (e.g. "14 Mar 26, 21:04")
  const westernResult = parseBangkokBankDate(trimmed)
  if (westernResult) return westernResult

  return null
}

function parseKBankThaiDate(raw: string): ThaiDateParseResult | null {
  // Match: day, Thai month abbreviation, 2-or-4-digit year
  // Example: "20 ต.ค. 69" or "8 มี.ค. 2569"
  for (const [thaiMonth, monthIndex] of Object.entries(THAI_MONTH_MAP)) {
    if (!raw.includes(thaiMonth)) continue

    // Extract day (before the month) and year (after the month)
    const monthPos = raw.indexOf(thaiMonth)
    const beforeMonth = raw.substring(0, monthPos).trim()
    const afterMonth = raw.substring(monthPos + thaiMonth.length).trim()

    const day = parseInt(beforeMonth, 10)
    if (isNaN(day) || day < 1 || day > 31) continue

    // Extract year — first number after the month
    const yearMatch = afterMonth.match(/(\d{2,4})/)
    if (!yearMatch) continue

    let year = parseInt(yearMatch[1], 10)

    // Convert from Buddhist Era to CE
    if (year < 100) {
      // Short year: "69" = 2569 BE = 2026 CE
      year = year + 2500 - 543
    } else if (year > 2400) {
      // Full BE year: 2569 = 2026 CE
      year = year - 543
    }
    // else: already CE (unlikely for KBank but handle gracefully)

    const iso = formatISODate(year, monthIndex, day)
    if (!iso) continue

    return { date: iso, source: 'thai_be' }
  }

  return null
}

function parseBangkokBankDate(raw: string): ThaiDateParseResult | null {
  // Match: "DD Mon YY" with optional comma and time
  // Example: "14 Mar 26, 21:04" or "14 Mar 26"
  const match = raw.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const monthStr = match[2].toLowerCase()
  let year = parseInt(match[3], 10)

  const monthIndex = EN_MONTH_MAP[monthStr]
  if (monthIndex === undefined) return null

  // Bangkok Bank uses 2-digit CE years
  if (year < 100) {
    year = 2000 + year
  }

  const iso = formatISODate(year, monthIndex, day)
  if (!iso) return null

  return { date: iso, source: 'western' }
}

function formatISODate(year: number, monthIndex: number, day: number): string | null {
  // Basic sanity check
  if (year < 2000 || year > 2100) return null
  if (monthIndex < 0 || monthIndex > 11) return null
  if (day < 1 || day > 31) return null

  const mm = String(monthIndex + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}
