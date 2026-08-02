/**
 * Per-source deep links for review-queue cards.
 *
 * The case these exist for: on a card merged from a payment slip + email +
 * statement, every section's external-link icon pointed at the payment slip.
 * The old helper picked one link per card from the ID's type, so a section
 * either linked to the wrong source or had its link removed to avoid it.
 */

import { getSlipLink, getEmailLink, getStatementLink } from '@/lib/utils/import-source-links'

const SLIP = '11111111-1111-1111-1111-111111111111'
const EMAIL = '22222222-2222-2222-2222-222222222222'
const STMT = '33333333-3333-3333-3333-333333333333'

const SLIP_URL = `/imports/payment-slips/${SLIP}`
const EMAIL_URL = `/imports/emails/${EMAIL}`
const STMT_URL = `/imports/statements/${STMT}/results`

describe('each section links to its own source', () => {
  it('resolves all three on a slip+email+statement card', () => {
    const id = `merged:slip:${SLIP}+email:${EMAIL}+stmt:${STMT}:0`
    expect(getSlipLink(id)).toBe(SLIP_URL)
    expect(getEmailLink(id)).toBe(EMAIL_URL)
    expect(getStatementLink(id)).toBe(STMT_URL)
  })

  it('resolves both on a slip+statement card', () => {
    const id = `merged:slip:${SLIP}+stmt:${STMT}:0`
    expect(getSlipLink(id)).toBe(SLIP_URL)
    expect(getStatementLink(id)).toBe(STMT_URL)
    expect(getEmailLink(id)).toBeNull()
  })

  it('resolves both on a slip+email card', () => {
    const id = `merged:slip:${SLIP}+email:${EMAIL}`
    expect(getSlipLink(id)).toBe(SLIP_URL)
    expect(getEmailLink(id)).toBe(EMAIL_URL)
    expect(getStatementLink(id)).toBeNull()
  })

  it('resolves both on an email+statement card', () => {
    const id = `merged:${EMAIL}+stmt:${STMT}:0`
    expect(getEmailLink(id)).toBe(EMAIL_URL)
    expect(getStatementLink(id)).toBe(STMT_URL)
    expect(getSlipLink(id)).toBeNull()
  })
})

describe('single-source cards expose only their own link', () => {
  it.each([
    ['statement', `stmt:${STMT}:0`, [null, null, STMT_URL]],
    ['email', `email:${EMAIL}`, [null, EMAIL_URL, null]],
    ['payment slip', `slip:${SLIP}`, [SLIP_URL, null, null]],
  ])('%s', (_label, id, [slip, email, stmt]) => {
    expect(getSlipLink(id as string)).toBe(slip)
    expect(getEmailLink(id as string)).toBe(email)
    expect(getStatementLink(id as string)).toBe(stmt)
  })
})

it('returns null for every source on an unparseable ID', () => {
  expect(getSlipLink('nonsense')).toBeNull()
  expect(getEmailLink('nonsense')).toBeNull()
  expect(getStatementLink('nonsense')).toBeNull()
})

it('returns null for a self-transfer, which spans two statement rows', () => {
  const id = `self-transfer:stmt:${STMT}:0+stmt:${STMT}:1`
  expect(getStatementLink(id)).toBeNull()
  expect(getSlipLink(id)).toBeNull()
  expect(getEmailLink(id)).toBeNull()
})
