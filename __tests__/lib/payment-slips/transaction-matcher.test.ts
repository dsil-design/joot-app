/**
 * Choosing the transaction a payment slip belongs to.
 *
 * The audit case: Dennis buys ฿65 coffee most days. On 2026-02-10 a ฿65 slip
 * (IMG_1345) auto-linked to the 2026-02-11 transaction while the correct
 * 2026-02-10 row sat in the same candidate list. The old rule took the first
 * amount match in whatever order Postgres returned, and used the date only to
 * pick a confidence number — so with a recurring amount the winner was
 * effectively arbitrary, and it was reported at high confidence.
 */

import {
  selectTransactionMatch,
  dayDistance,
  ambiguousMatchWarning,
  CONFIDENCE_EXACT_DATE,
  CONFIDENCE_ADJACENT_DATE,
  CONFIDENCE_DISAMBIGUATED,
  type MatchCandidate,
} from '@/lib/payment-slips/transaction-matcher'

/** The real ฿65 coffee run around the slip's date. */
const COFFEE_RUN: MatchCandidate[] = [
  { id: 'tx-feb-09', amount: 65, transaction_date: '2026-02-09' },
  { id: 'tx-feb-10', amount: 65, transaction_date: '2026-02-10' },
  { id: 'tx-feb-11', amount: 65, transaction_date: '2026-02-11' },
]

const SLIP = { amount: 65, date: '2026-02-10' }

describe('dayDistance', () => {
  it('counts whole days regardless of time or zone', () => {
    expect(dayDistance('2026-02-10', '2026-02-10')).toBe(0)
    expect(dayDistance('2026-02-11', '2026-02-10')).toBe(1)
    expect(dayDistance('2026-02-09', '2026-02-10')).toBe(1)
    expect(dayDistance('2026-02-12', '2026-02-10')).toBe(2)
  })

  it('survives a timestamp being passed instead of a date', () => {
    expect(dayDistance('2026-02-10T17:30:00+07:00', '2026-02-10')).toBe(0)
  })

  it('spans month and year boundaries', () => {
    expect(dayDistance('2026-03-01', '2026-02-28')).toBe(1)
    expect(dayDistance('2027-01-01', '2026-12-31')).toBe(1)
  })
})

describe('selectTransactionMatch', () => {
  it('picks the same-day transaction out of a recurring run — the regression', () => {
    const result = selectTransactionMatch(COFFEE_RUN, SLIP)

    expect(result.transactionId).toBe('tx-feb-10')
    expect(result.reason).toBe('exact_date')
    expect(result.confidence).toBe(CONFIDENCE_EXACT_DATE)
  })

  it('is not swayed by candidate order', () => {
    // The old rule returned whichever row came back first.
    const orders = [
      COFFEE_RUN,
      [...COFFEE_RUN].reverse(),
      [COFFEE_RUN[2], COFFEE_RUN[0], COFFEE_RUN[1]],
      [COFFEE_RUN[1], COFFEE_RUN[2], COFFEE_RUN[0]],
    ]
    for (const order of orders) {
      expect(selectTransactionMatch(order, SLIP).transactionId).toBe('tx-feb-10')
    }
  })

  it('matches an adjacent day when there is no same-day row', () => {
    const result = selectTransactionMatch(
      [{ id: 'tx-feb-11', amount: 65, transaction_date: '2026-02-11' }],
      SLIP
    )
    expect(result.transactionId).toBe('tx-feb-11')
    expect(result.reason).toBe('adjacent_date')
    expect(result.confidence).toBe(CONFIDENCE_ADJACENT_DATE)
  })

  it('refuses to guess between two same-day transactions', () => {
    const result = selectTransactionMatch(
      [
        { id: 'tx-a', amount: 65, transaction_date: '2026-02-10' },
        { id: 'tx-b', amount: 65, transaction_date: '2026-02-10' },
      ],
      SLIP
    )
    expect(result.transactionId).toBeNull()
    expect(result.confidence).toBeNull()
    expect(result.reason).toBe('ambiguous')
    expect(result.tiedTransactionIds).toEqual(['tx-a', 'tx-b'])
  })

  it('refuses to guess between both adjacent days', () => {
    // Feb 9 and Feb 11 are equidistant; neither is more correct.
    const result = selectTransactionMatch(
      [COFFEE_RUN[0], COFFEE_RUN[2]],
      SLIP
    )
    expect(result.transactionId).toBeNull()
    expect(result.reason).toBe('ambiguous')
    expect(result.tiedTransactionIds).toEqual(['tx-feb-09', 'tx-feb-11'])
  })

  it('breaks a tie when every other candidate is already claimed', () => {
    const result = selectTransactionMatch(
      [
        { id: 'tx-a', amount: 65, transaction_date: '2026-02-10' },
        { id: 'tx-b', amount: 65, transaction_date: '2026-02-10' },
      ],
      SLIP,
      new Set(['tx-a'])
    )
    expect(result.transactionId).toBe('tx-b')
    expect(result.reason).toBe('disambiguated_by_existing_link')
    // Inferred from bookkeeping, not from the slip — stays out of auto-approve.
    expect(result.confidence).toBe(CONFIDENCE_DISAMBIGUATED)
    expect(result.confidence).toBeLessThan(CONFIDENCE_EXACT_DATE)
  })

  it('stays ambiguous when claiming leaves more than one candidate', () => {
    const result = selectTransactionMatch(
      [
        { id: 'tx-a', amount: 65, transaction_date: '2026-02-10' },
        { id: 'tx-b', amount: 65, transaction_date: '2026-02-10' },
        { id: 'tx-c', amount: 65, transaction_date: '2026-02-10' },
      ],
      SLIP,
      new Set(['tx-a'])
    )
    expect(result.transactionId).toBeNull()
    expect(result.reason).toBe('ambiguous')
  })

  it('does not let an already-claimed row shadow the correct same-day match', () => {
    // Only one same-day candidate: claimed or not, it is still the answer.
    const result = selectTransactionMatch(COFFEE_RUN, SLIP, new Set(['tx-feb-10']))
    expect(result.transactionId).toBe('tx-feb-10')
    expect(result.reason).toBe('exact_date')
  })

  it('ignores transactions more than a day away', () => {
    const result = selectTransactionMatch(
      [{ id: 'tx-far', amount: 65, transaction_date: '2026-02-13' }],
      SLIP
    )
    expect(result.transactionId).toBeNull()
    expect(result.reason).toBe('no_candidate')
  })

  it('ignores different amounts, and tolerates rounding', () => {
    expect(
      selectTransactionMatch([{ id: 'tx', amount: 66, transaction_date: '2026-02-10' }], SLIP)
        .transactionId
    ).toBeNull()
    expect(
      selectTransactionMatch([{ id: 'tx', amount: 65.005, transaction_date: '2026-02-10' }], SLIP)
        .transactionId
    ).toBe('tx')
  })

  it('accepts an amount arriving as a string, as Postgres numerics do', () => {
    const result = selectTransactionMatch(
      [{ id: 'tx', amount: '65.00', transaction_date: '2026-02-10' }],
      SLIP
    )
    expect(result.transactionId).toBe('tx')
  })

  it.each([
    ['no candidates', [] as MatchCandidate[], SLIP],
    ['no amount', COFFEE_RUN, { amount: 0, date: '2026-02-10' }],
    ['no date', COFFEE_RUN, { amount: 65, date: '' }],
  ])('returns nothing for %s', (_label, candidates, slip) => {
    const result = selectTransactionMatch(candidates, slip)
    expect(result.transactionId).toBeNull()
    expect(result.reason).toBe('no_candidate')
  })
})

describe('ambiguousMatchWarning', () => {
  it('says how many transactions tied and what to do', () => {
    const selection = selectTransactionMatch([COFFEE_RUN[0], COFFEE_RUN[2]], SLIP)
    const text = ambiguousMatchWarning(selection, 65)
    expect(text).toContain('2 transactions')
    expect(text).toContain('65')
    expect(text).toContain('manually')
  })
})
