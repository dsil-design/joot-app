/**
 * Shared import ID parser for the review queue.
 *
 * Statement items use composite IDs: stmt:<uuid>:<index> (or bare <uuid>:<index> for backward compat)
 * Email items use: email:<uuid>
 */

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

const MERGED_PREFIX_REGEX = new RegExp(`^merged:(${UUID_PATTERN})\\+stmt:(${UUID_PATTERN}):(\\d+)$`, 'i')
const MERGED_SLIP_EMAIL_STMT_REGEX = new RegExp(`^merged:slip:(${UUID_PATTERN})\\+email:(${UUID_PATTERN})\\+stmt:(${UUID_PATTERN}):(\\d+)$`, 'i')
const MERGED_SLIP_EMAIL_REGEX = new RegExp(`^merged:slip:(${UUID_PATTERN})\\+email:(${UUID_PATTERN})$`, 'i')
const MERGED_SLIP_STMT_REGEX = new RegExp(`^merged:slip:(${UUID_PATTERN})\\+stmt:(${UUID_PATTERN}):(\\d+)$`, 'i')
const STMT_PREFIX_REGEX = new RegExp(`^stmt:(${UUID_PATTERN}):(\\d+)$`, 'i')
const EMAIL_PREFIX_REGEX = new RegExp(`^email:(${UUID_PATTERN})$`, 'i')
const SLIP_PREFIX_REGEX = new RegExp(`^slip:(${UUID_PATTERN})$`, 'i')
const SELF_TRANSFER_REGEX = new RegExp(`^self-transfer:stmt:(${UUID_PATTERN}):(\\d+)\\+stmt:(${UUID_PATTERN}):(\\d+)$`, 'i')
const BARE_COMPOSITE_REGEX = new RegExp(`^(${UUID_PATTERN}):(\\d+)$`, 'i')

export type ParsedImportId =
  | { type: 'statement'; statementId: string; index: number }
  | { type: 'email'; emailId: string }
  | { type: 'merged'; emailId: string; statementId: string; index: number }
  | { type: 'payment_slip'; slipId: string }
  | { type: 'merged_slip_email'; slipId: string; emailId: string }
  | { type: 'merged_slip_stmt'; slipId: string; statementId: string; index: number }
  | { type: 'merged_slip_email_stmt'; slipId: string; emailId: string; statementId: string; index: number }
  | { type: 'self_transfer'; debitStatementId: string; debitIndex: number; creditStatementId: string; creditIndex: number }

/**
 * Parse a prefixed import ID into its components.
 * Supports:
 * - merged:<emailUuid>+stmt:<stmtUuid>:<index>
 * - stmt:<uuid>:<index>
 * - email:<uuid>
 * - <uuid>:<index> (backward compat — treated as statement)
 */
export function parseImportId(id: string): ParsedImportId | null {
  // Try self-transfer prefix first (most specific)
  const selfTransferMatch = id.match(SELF_TRANSFER_REGEX)
  if (selfTransferMatch) {
    return {
      type: 'self_transfer',
      debitStatementId: selfTransferMatch[1],
      debitIndex: parseInt(selfTransferMatch[2], 10),
      creditStatementId: selfTransferMatch[3],
      creditIndex: parseInt(selfTransferMatch[4], 10),
    }
  }

  // Try merged: prefix (most specific after self-transfer)
  // 3-way slip+email+stmt must be checked before 2-way slip+email (longer prefix)
  const mergedSlipEmailStmtMatch = id.match(MERGED_SLIP_EMAIL_STMT_REGEX)
  if (mergedSlipEmailStmtMatch) {
    return {
      type: 'merged_slip_email_stmt',
      slipId: mergedSlipEmailStmtMatch[1],
      emailId: mergedSlipEmailStmtMatch[2],
      statementId: mergedSlipEmailStmtMatch[3],
      index: parseInt(mergedSlipEmailStmtMatch[4], 10),
    }
  }

  const mergedSlipEmailMatch = id.match(MERGED_SLIP_EMAIL_REGEX)
  if (mergedSlipEmailMatch) {
    return { type: 'merged_slip_email', slipId: mergedSlipEmailMatch[1], emailId: mergedSlipEmailMatch[2] }
  }

  const mergedSlipStmtMatch = id.match(MERGED_SLIP_STMT_REGEX)
  if (mergedSlipStmtMatch) {
    return { type: 'merged_slip_stmt', slipId: mergedSlipStmtMatch[1], statementId: mergedSlipStmtMatch[2], index: parseInt(mergedSlipStmtMatch[3], 10) }
  }

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

  // Try slip: prefix
  const slipMatch = id.match(SLIP_PREFIX_REGEX)
  if (slipMatch) {
    return { type: 'payment_slip', slipId: slipMatch[1] }
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

/** Construct a prefixed payment slip ID */
export function makePaymentSlipId(slipId: string): string {
  return `slip:${slipId}`
}

/** Construct a merged ID for payment slip + email pair */
export function makeMergedSlipEmailId(slipId: string, emailId: string): string {
  return `merged:slip:${slipId}+email:${emailId}`
}

/** Construct a merged ID for payment slip + statement pair */
export function makeMergedSlipStmtId(slipId: string, statementId: string, index: number): string {
  return `merged:slip:${slipId}+stmt:${statementId}:${index}`
}

/** Construct a merged ID for payment slip + email + statement triple */
export function makeMergedSlipEmailStmtId(
  slipId: string, emailId: string, statementId: string, index: number
): string {
  return `merged:slip:${slipId}+email:${emailId}+stmt:${statementId}:${index}`
}

/** Construct a self-transfer ID from two statement entries */
export function makeSelfTransferId(
  debitStatementId: string, debitIndex: number,
  creditStatementId: string, creditIndex: number
): string {
  return `self-transfer:stmt:${debitStatementId}:${debitIndex}+stmt:${creditStatementId}:${creditIndex}`
}
