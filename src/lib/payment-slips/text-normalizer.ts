/**
 * Extracted-text normalisation.
 *
 * The vision model emits invisible formatting characters inside otherwise
 * clean strings. It surfaced in `transaction_reference`, where two slips of
 * the *same* payment stored:
 *
 *   016041150258ATF04576
 *   01604115025<U+200B>8ATF04576
 *
 * Those compare unequal, so the bank reference — the one field that uniquely
 * identifies a transfer — could not be used to tell a re-uploaded slip from a
 * genuinely new payment. 24 of 300 references were affected, which is how a
 * duplicate upload of the same February payments went unnoticed: the file
 * hashes differ (re-exported images) and the references would not compare.
 *
 * Invisible characters carry no meaning on a bank slip, so they are stripped
 * everywhere. Whitespace is only collapsed — and only *removed* on reference
 * fields, which are machine identifiers. Account and name fields keep their
 * spacing so account matching and vendor lookups behave exactly as before.
 *
 * Note on Thai: U+200B also appears in Thai text as a line-break hint between
 * words. Removing it is harmless — Thai is normally written without spaces
 * between words, so the rendered result is unchanged.
 */

/**
 * Zero-width and directional formatting characters.
 *
 * U+00AD soft hyphen, U+200B-200F zero-width space/ZWNJ/ZWJ/LRM/RLM,
 * U+202A-202E directional embedding/override, U+2060-2064 word joiner and
 * invisible operators, U+2066-2069 directional isolates, U+FEFF BOM.
 */
const INVISIBLE_CHARS =
  /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g

/** Strip invisible characters from a string. */
export function stripInvisible(value: string): string {
  return value.replace(INVISIBLE_CHARS, '')
}

/**
 * Normalise a human-readable field: drop invisible characters, collapse runs
 * of whitespace, trim. Spacing is preserved so downstream name and account
 * matching is unaffected.
 */
export function normalizeText<T extends string | null | undefined>(value: T): T {
  if (typeof value !== 'string') return value
  const cleaned = stripInvisible(value).replace(/\s+/g, ' ').trim()
  return cleaned as T
}

/**
 * Normalise a machine identifier (bank/transaction reference): as above, plus
 * remove all internal whitespace so references compare reliably.
 */
export function normalizeReference<T extends string | null | undefined>(value: T): T {
  if (typeof value !== 'string') return value
  const cleaned = stripInvisible(value).replace(/\s+/g, '')
  return cleaned as T
}

/** Fields normalised as machine identifiers rather than prose. */
const REFERENCE_FIELDS = ['transaction_reference', 'bank_reference'] as const

/**
 * Normalise every string field on an extraction in place, and return it.
 *
 * Applied immediately after the model response is parsed, so validation,
 * direction detection, statement cross-checking and the database row all see
 * the same clean text.
 */
export function normalizeExtractionText<T extends object>(extraction: T): T {
  const record = extraction as Record<string, unknown>
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'string') continue
    record[key] = (REFERENCE_FIELDS as readonly string[]).includes(key)
      ? normalizeReference(value)
      : normalizeText(value)
  }
  return extraction
}
