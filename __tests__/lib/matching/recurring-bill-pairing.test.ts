/**
 * A recurring USD bill: receipt email + the card charge that settles it.
 *
 * The May 2026 Xfinity case. Both sources agree on $75.00 and 2026-05-19, so
 * pairing is unambiguous — the card only ever appeared as a lone email because
 * the statement row had been retired and the pair blacklisted by a reject the
 * user then asked to put back in the queue.
 */

import { findCrossSourcePairs, type PairCandidate } from '@/lib/matching/cross-source-pairer'

const STATEMENT_ID = '7ea35f60-3600-418f-a5a7-411a54a574c3'
const SUGGESTION_INDEX = 3

const emailCandidate: PairCandidate = {
  source: 'email',
  emailId: '037b5d20-4325-463f-9edf-3fc9be5dc5a5',
  date: '2026-05-19',
  amount: 75,
  currency: 'USD',
  description: 'Automatic bill payment - Xfinity service',
}

const statementCandidate: PairCandidate = {
  source: 'statement',
  statementId: STATEMENT_ID,
  statementIndex: SUGGESTION_INDEX,
  date: '2026-05-19',
  amount: 75,
  currency: 'USD',
  description: 'COMCAST / XFINITY 800-266-2278 FL',
}

// Same-currency pairs never consult exchange_rates.
function noRatesClient() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: async () => ({ data: [] }),
  }
  return { from: () => builder } as never
}
const noRates = noRatesClient()

describe('cross-source pairing of a recurring bill', () => {
  it('pairs the receipt email with the card charge', async () => {
    const pairs = await findCrossSourcePairs(noRates, [emailCandidate, statementCandidate])

    expect(pairs).toHaveLength(1)
    expect(pairs[0].emailCandidate.emailId).toBe(emailCandidate.emailId)
    expect(pairs[0].statementCandidate.statementIndex).toBe(SUGGESTION_INDEX)
    expect(pairs[0].percentDiff).toBe(0)
  })

  it('refuses the pair while the rejected key is on the email', async () => {
    // What the queue was doing: the reject wrote this key and the re-queue that
    // followed never removed it, so the two halves of one payment stayed apart.
    const pairs = await findCrossSourcePairs(noRates, [
      { ...emailCandidate, rejectedPairKeys: [`${STATEMENT_ID}:${SUGGESTION_INDEX}`] },
      statementCandidate,
    ])

    expect(pairs).toHaveLength(0)
  })
})
