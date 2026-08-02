/**
 * Vendor pre-fill in the review dialogs.
 *
 * Regression cover for the blank Vendor field on Amazon receipts: the parser
 * stores `vendor_name_raw = "Amazon.com"`, the vendor record is named
 * "Amazon", and the dialog's only candidate query was
 * `name ILIKE '%Amazon.com%'` — which matches nothing, so a 90%-confidence
 * match never got the chance to happen.
 */

import {
  buildVendorSearchQueries,
  resolveVendorFromSignals,
} from '@/lib/proposals/vendor-prefill'

const VENDORS = [
  { id: 'v-amazon', name: 'Amazon' },
  { id: 'v-amazon-prime', name: 'Amazon Prime' },
  { id: 'v-amazon-go', name: 'Amazon Go' },
  { id: 'v-cafe-amazon', name: 'Cafe Amazon' },
  { id: 'v-lazada', name: 'Lazada' },
  { id: 'v-grab', name: 'Grab' },
]

/** Stands in for the Supabase `name ILIKE '%query%'` search the hook runs. */
function fakeSearchVendors(query: string) {
  const q = query.toLowerCase()
  return Promise.resolve(VENDORS.filter((v) => v.name.toLowerCase().includes(q)))
}

describe('buildVendorSearchQueries', () => {
  it('splits on punctuation, not just whitespace', () => {
    // The whitespace-only split this replaced produced ["Amazon.com"] alone.
    expect(buildVendorSearchQueries('Amazon.com')).toContain('Amazon')
  })

  it('drops tokens that identify nothing', () => {
    const queries = buildVendorSearchQueries('Amazon.com')
    expect(queries).not.toContain('com')
  })

  it('recovers the merchant from a card descriptor', () => {
    const queries = buildVendorSearchQueries('AMAZON MKTPL*BV3AR0KY1 Amzn.com/bill WA')
    expect(queries).toContain('AMAZON')
  })

  it('recovers the merchant from a gateway descriptor', () => {
    const queries = buildVendorSearchQueries('WWW.2C2P.COM*LAZADA PAY BANGKOK')
    expect(queries).toContain('LAZADA')
  })

  it('returns nothing for an empty signal', () => {
    expect(buildVendorSearchQueries('   ')).toEqual([])
  })
})

describe('resolveVendorFromSignals', () => {
  it('resolves "Amazon.com" to the Amazon vendor', async () => {
    const match = await resolveVendorFromSignals(
      { vendorNameRaw: 'Amazon.com' },
      fakeSearchVendors
    )

    expect(match?.id).toBe('v-amazon')
  })

  it('prefers the exact merchant over its lookalikes', async () => {
    // "Cafe Amazon" and "Amazon Prime" are also candidates for the query
    // "Amazon" — the scorer has to pick the one the receipt actually names.
    const match = await resolveVendorFromSignals(
      { vendorNameRaw: 'Amazon.com', fromName: 'Amazon.com' },
      fakeSearchVendors
    )

    expect(match?.name).toBe('Amazon')
  })

  it('falls back to the statement descriptor when no receipt names a vendor', async () => {
    const match = await resolveVendorFromSignals(
      { statementDescription: 'AMAZON MKTPL*BV3AR0KY1 Amzn.com/bill WA' },
      fakeSearchVendors
    )

    expect(match?.id).toBe('v-amazon')
  })

  it('resolves "Lazada Thailand" to the Lazada vendor', async () => {
    const match = await resolveVendorFromSignals(
      { vendorNameRaw: 'Lazada Thailand' },
      fakeSearchVendors
    )

    expect(match?.id).toBe('v-lazada')
  })

  it('leaves the field blank rather than guessing', async () => {
    const match = await resolveVendorFromSignals(
      { vendorNameRaw: 'Some Merchant Nobody Has Seen' },
      fakeSearchVendors
    )

    expect(match).toBeNull()
  })

  it('returns null when there is no signal at all', async () => {
    expect(await resolveVendorFromSignals({}, fakeSearchVendors)).toBeNull()
  })

  it('survives a failing search', async () => {
    const failing = () => Promise.reject(new Error('network'))
    await expect(
      resolveVendorFromSignals({ vendorNameRaw: 'Amazon.com' }, failing)
    ).resolves.toBeNull()
  })
})
