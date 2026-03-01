/**
 * Shared import ID parser for the review queue.
 *
 * Statement items use composite IDs: stmt:<uuid>:<index> (or bare <uuid>:<index> for backward compat)
 * Email items use: email:<uuid>
 */

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

const MERGED_PREFIX_REGEX = new RegExp(`^merged:(${UUID_PATTERN})\\+stmt:(${UUID_PATTERN}):(\\d+)$`, 'i')
const STMT_PREFIX_REGEX = new RegExp(`^stmt:(${UUID_PATTERN}):(\\d+)$`, 'i')
const EMAIL_PREFIX_REGEX = new RegExp(`^email:(${UUID_PATTERN})$`, 'i')
const BARE_COMPOSITE_REGEX = new RegExp(`^(${UUID_PATTERN}):(\\d+)$`, 'i')

export type ParsedImportId =
  | { type: 'statement'; statementId: string; index: number }
  | { type: 'email'; emailId: string }
  | { type: 'merged'; emailId: string; statementId: string; index: number }

/**
 * Parse a prefixed import ID into its components.
 * Supports:
 * - merged:<emailUuid>+stmt:<stmtUuid>:<index>
 * - stmt:<uuid>:<index>
 * - email:<uuid>
 * - <uuid>:<index> (backward compat — treated as statement)
 */
export function parseImportId(id: string): ParsedImportId | null {
  // Try merged: prefix first (most specific)
  const mergedMatch = id.match(MERGED_PREFIX_REGEX)
  if (mergedMatch) {
    return { type: 'merged', emailId: mergedMatch[1], statementId: mergedMatch[2], index: parseInt(mergedMatch[3], 10) }
  }

  // Try stmt: prefix
  const stmtMatch = id.match(STMT_PREFIX_REGEX)
  if (stmtMatch) {
    return { type: 'statement', statementId: stmtMatch[1], index: parseInt(stmtMatch[2], 10) }
  }

  // Try email: prefix
  const emailMatch = id.match(EMAIL_PREFIX_REGEX)
  if (emailMatch) {
    return { type: 'email', emailId: emailMatch[1] }
  }

  // Backward compat: bare uuid:index → statement
  const bareMatch = id.match(BARE_COMPOSITE_REGEX)
  if (bareMatch) {
    return { type: 'statement', statementId: bareMatch[1], index: parseInt(bareMatch[2], 10) }
  }

  return null
}

/** Construct a prefixed statement ID */
export function makeStatementId(statementId: string, index: number): string {
  return `stmt:${statementId}:${index}`
}

/** Construct a prefixed email ID */
export function makeEmailId(emailId: string): string {
  return `email:${emailId}`
}

/** Construct a prefixed merged ID (email + statement pair) */
export function makeMergedId(emailId: string, statementId: string, index: number): string {
  return `merged:${emailId}+stmt:${statementId}:${index}`
}
