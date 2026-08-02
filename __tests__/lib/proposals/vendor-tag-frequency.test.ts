/**
 * Vendor tag frequency is read over the user's whole history, not a window.
 *
 * The numbers here are the measured shape of this account: 16,804
 * vendor-attributed transactions carrying 797 tag links, with tagging adopted
 * late so almost every link sits at the recent end. Reading tag links for only
 * the first 500 transaction ids saw 12% of the evidence, and dividing that by
 * each vendor's *full* transaction count diluted what survived. Measured over
 * the full history 52 vendor/tag pairs clear the 0.5 proposal threshold;
 * through the 500-id window not one of them did, and nothing said so.
 *
 * These tests pin the two properties that failure needed: the read is not
 * restricted to a slice of transaction ids, and it pages rather than trusting
 * a single response.
 */

import { prefetchRuleEngineContext } from '@/lib/proposals/proposal-service'
import { generateRuleProposal } from '@/lib/proposals/rule-engine'
import type { ProposalInput } from '@/lib/proposals/types'
import { fakeSupabase, isTagFrequencyRead, type Row } from './fake-supabase'

const USER = 'user-1'
const XFINITY = 'vendor-xfinity'
const FLORIDA_HOUSE = 'tag-florida-house'
const BUSINESS_EXPENSE = 'tag-business-expense'

function tagLink(transactionId: string, tagId: string, tagName: string): Row {
  return {
    transaction_id: transactionId,
    tag_id: tagId,
    tags: { name: tagName },
    transactions: { user_id: USER, vendor_id: XFINITY },
  }
}

/**
 * `total` transactions for one vendor, of which only the most recent
 * `taggedFlorida + taggedBusiness` carry any tag at all — tagging adopted late,
 * as it was here.
 */
function history(total: number, taggedFlorida: number, taggedBusiness: number) {
  const txns: Row[] = Array.from({ length: total }, (_, i) => ({
    id: `tx-${String(i).padStart(5, '0')}`,
    vendor_id: XFINITY,
    description: 'XFINITY MOBILE',
    amount: 75,
    original_currency: 'USD',
    transaction_date: '2026-05-19',
    payment_method_id: null,
    transaction_type: 'expense',
    vendors: { name: 'Xfinity' },
  }))

  const tagged = txns.slice(total - (taggedFlorida + taggedBusiness))
  const links: Row[] = [
    ...tagged.slice(0, taggedFlorida).map((t) => tagLink(t.id as string, FLORIDA_HOUSE, 'Florida House')),
    ...tagged.slice(taggedFlorida).map((t) => tagLink(t.id as string, BUSINESS_EXPENSE, 'Business Expense')),
  ]

  return { txns, links }
}

function supabaseFor(txns: Row[], links: Row[]) {
  return fakeSupabase((q) => {
    if (q.table === 'vendors') return [{ id: XFINITY, name: 'Xfinity' }]
    if (q.table === 'tags') {
      return [
        { id: FLORIDA_HOUSE, name: 'Florida House' },
        { id: BUSINESS_EXPENSE, name: 'Business Expense' },
      ]
    }
    if (q.table === 'transactions') return txns
    if (q.table === 'transaction_tags') return links
    return []
  })
}

const xfinityBill: ProposalInput = {
  compositeId: 'email:xfinity-may',
  sourceType: 'email',
  description: 'Automatic bill payment - Xfinity service',
  amount: 75,
  currency: 'USD',
  date: '2026-05-19',
  vendorNameRaw: 'Xfinity',
  parserKey: 'ai-fallback',
}

describe('fetchVendorTagFrequency — history beyond 500 transactions', () => {
  it('measures a vendor whose tags all sit past the first 500 transactions', async () => {
    // 600 transactions, only the last 7 tagged — every link outside a 500-id window.
    const { txns, links } = history(600, 5, 2)
    const { client } = supabaseFor(txns, links)

    const context = await prefetchRuleEngineContext(client, USER)
    const florida = context.vendorTagFrequency.find(
      (f) => f.vendorId === XFINITY && f.tagId === FLORIDA_HOUSE
    )

    expect(florida).toBeDefined()
    expect(florida!.count).toBe(5)
    // 5 of the 7 tagged transactions — not 5/600, and not 0 for being out of window.
    expect(florida!.frequency).toBeCloseTo(5 / 7)
  })

  it('proposes the tag — the suggestion the windowed read silently lost', async () => {
    const { txns, links } = history(600, 5, 2)
    const { client } = supabaseFor(txns, links)

    const context = await prefetchRuleEngineContext(client, USER)
    const result = generateRuleProposal(xfinityBill, context)

    expect(result.fields.vendorId).toBe(XFINITY)
    expect(result.fields.tagIds).toEqual([FLORIDA_HOUSE])
  })

  it('does not restrict the tag read to a list of transaction ids', async () => {
    const { txns, links } = history(600, 5, 2)
    const { client, queries } = supabaseFor(txns, links)

    await prefetchRuleEngineContext(client, USER)

    const read = queries.find(isTagFrequencyRead)
    expect(read).toBeDefined()
    // An `.in('transaction_id', [...])` here is the cap coming back: the caller
    // has to build that list from somewhere, and that somewhere gets sliced.
    expect(read!.filters.some((f) => f.startsWith('in:transaction_id'))).toBe(false)
    expect(read!.filters).toEqual(
      expect.arrayContaining(['eq:transactions.user_id', 'not:transactions.vendor_id'])
    )
  })

  it('pages the tag read instead of trusting one response', async () => {
    const { txns, links } = history(600, 5, 2)
    const { client, queries } = supabaseFor(txns, links)

    await prefetchRuleEngineContext(client, USER)

    expect(queries.find(isTagFrequencyRead)!.paged).toBe(true)
  })

  it('aggregates tag links that do not fit in a single page', async () => {
    // 1,200 links: past the 1,000-row page, and a caller that reads one page
    // would report 1,000/1,000 for the tag that fills it.
    const { txns, links } = history(4000, 700, 500)
    const { client } = supabaseFor(txns, links)

    const context = await prefetchRuleEngineContext(client, USER)
    const florida = context.vendorTagFrequency.find(
      (f) => f.vendorId === XFINITY && f.tagId === FLORIDA_HOUSE
    )
    const business = context.vendorTagFrequency.find(
      (f) => f.vendorId === XFINITY && f.tagId === BUSINESS_EXPENSE
    )

    expect(florida!.count).toBe(700)
    expect(business!.count).toBe(500)
    expect(florida!.frequency).toBeCloseTo(700 / 1200)
  })

  it('counts a vendor\'s transactions past a single page', async () => {
    // The same cap on the other read in this file: transaction counts feed the
    // vendor-match tiebreaker and the LLM's top-vendor list.
    const { txns, links } = history(4000, 5, 2)
    const { client } = supabaseFor(txns, links)

    const context = await prefetchRuleEngineContext(client, USER)

    expect(context.vendors.find((v) => v.id === XFINITY)!.transactionCount).toBe(4000)
  })
})
