/**
 * Per-source deep links for review-queue cards.
 *
 * A card's ID identifies every source behind it, so a card merged from a
 * payment slip + email + statement can link to all three. The earlier
 * card-level helper returned a single link chosen by the ID's type, which
 * meant every section of a multi-source card pointed at the same place —
 * sections either linked to the wrong source or had their link removed to
 * avoid it. Each section asks for its own source's link instead; a source
 * the ID doesn't carry returns null and the section renders no link.
 */

import { parseImportId } from './import-id'

/** Link to the payment slip behind a card, or null when it has none. */
export function getSlipLink(id: string): string | null {
  const parsed = parseImportId(id)
  if (!parsed) return null
  switch (parsed.type) {
    case 'payment_slip':
    case 'merged_slip_email':
    case 'merged_slip_stmt':
    case 'merged_slip_email_stmt':
      return `/imports/payment-slips/${parsed.slipId}`
    default:
      return null
  }
}

/** Link to the email behind a card, or null when it has none. */
export function getEmailLink(id: string): string | null {
  const parsed = parseImportId(id)
  if (!parsed) return null
  switch (parsed.type) {
    case 'email':
    case 'merged':
    case 'merged_slip_email':
    case 'merged_slip_email_stmt':
      return `/imports/emails/${parsed.emailId}`
    default:
      return null
  }
}

/**
 * Link to the statement behind a card, or null when it has none.
 * Self-transfers span two statement rows and have no single target.
 */
export function getStatementLink(id: string): string | null {
  const parsed = parseImportId(id)
  if (!parsed) return null
  switch (parsed.type) {
    case 'statement':
    case 'merged':
    case 'merged_slip_stmt':
    case 'merged_slip_email_stmt':
      return `/imports/statements/${parsed.statementId}/results`
    default:
      return null
  }
}
