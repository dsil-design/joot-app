/**
 * Parser/sender tag detection from email address or parser key.
 * Shared between email-transaction-card and match-card-panels.
 */

export interface ParserTag {
  label: string
  className: string
}

const PARSER_TAGS: { match: string; label: string; className: string }[] = [
  { match: "grab", label: "Grab", className: "bg-orange-100 text-orange-700" },
  { match: "bolt", label: "Bolt", className: "bg-green-100 text-green-700" },
  { match: "lazada", label: "Lazada", className: "bg-blue-100 text-blue-700" },
  { match: "shopee", label: "Shopee", className: "bg-red-100 text-red-700" },
  { match: "foodpanda", label: "FoodPanda", className: "bg-pink-100 text-pink-700" },
  { match: "agoda", label: "Agoda", className: "bg-indigo-100 text-indigo-700" },
  { match: "line", label: "LINE", className: "bg-emerald-100 text-emerald-700" },
]

/**
 * Get parser tag from an email address or parser key.
 */
export function getParserTag(fromAddress: string | null | undefined, parserKey?: string | null): ParserTag | null {
  const search = (parserKey || fromAddress || "").toLowerCase()
  if (!search) return null

  for (const tag of PARSER_TAGS) {
    if (search.includes(tag.match)) {
      return { label: tag.label, className: tag.className }
    }
  }
  return null
}
