/**
 * Parser/sender tag detection from email address or parser key.
 * Shared between email-transaction-card and match-card-panels.
 */

export interface ParserTag {
  label: string
  className: string
}

const PARSER_TAGS: { match: string; label: string; className: string }[] = [
  { match: "grab", label: "Grab", className: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300" },
  { match: "bolt", label: "Bolt", className: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300" },
  { match: "lazada", label: "Lazada", className: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" },
  { match: "shopee", label: "Shopee", className: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400" },
  { match: "foodpanda", label: "FoodPanda", className: "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300" },
  { match: "agoda", label: "Agoda", className: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" },
  { match: "line", label: "LINE", className: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" },
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
