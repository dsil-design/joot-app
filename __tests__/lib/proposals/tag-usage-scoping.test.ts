/**
 * Per-tag usage counts belong to one user.
 *
 * `fetchTags` read `transaction_tags` with no user filter at all, under the
 * service role, so RLS was not there to catch it. On this database it happened
 * to return the right numbers — tag ids do not collide between accounts, and
 * the other two accounts have tagged nothing — so nothing looked wrong.
 *
 * What it costs shows up as soon as another account tags anything: their rows
 * count against the same capped response, and this user's links fall out of the
 * window. usageCount is the sort key for the twenty tags handed to the LLM, so
 * the failure is a quietly wrong tag list, not an error.
 */

import { prefetchRuleEngineContext } from '@/lib/proposals/proposal-service'
import { fakeSupabase, isTagUsageRead, SERVER_MAX_ROWS, type Row } from './fake-supabase'

const USER = 'user-1'
const OTHER_USER = 'user-2'
const REIMBURSEMENT = 'tag-reimbursement'
const FLORIDA_HOUSE = 'tag-florida-house'
const OTHER_USERS_TAG = 'tag-belongs-to-user-2'

/** A tag link, carrying the owner of the transaction it hangs off. */
function link(ownerId: string, index: number, tagId: string): Row {
  return {
    transaction_id: `${ownerId}-tx-${String(index).padStart(5, '0')}`,
    tag_id: tagId,
    tags: { name: tagId },
    transactions: { user_id: ownerId, vendor_id: 'vendor-1' },
  }
}

function supabaseWith(links: Row[]) {
  return fakeSupabase((q) => {
    if (q.table === 'vendors') return [{ id: 'vendor-1', name: 'Acme' }]
    if (q.table === 'tags') {
      // Only this user's tags — `fetchTags` already scopes that read correctly.
      // Deliberately not in usage order: when the counts collapse to zero the
      // sort is stable, so a ranking assertion that matches this order would
      // hold on broken code too.
      return [
        { id: FLORIDA_HOUSE, name: 'Florida House' },
        { id: REIMBURSEMENT, name: 'Reimbursement' },
      ]
    }
    if (q.table === 'transactions') {
      return [{
        id: `${USER}-tx-00000`,
        vendor_id: 'vendor-1',
        description: 'ACME',
        amount: 10,
        original_currency: 'USD',
        transaction_date: '2026-05-19',
        payment_method_id: null,
        transaction_type: 'expense',
        vendors: { name: 'Acme' },
      }]
    }
    if (q.table === 'transaction_tags') {
      // The database applies the join filter; the double has to as well, or a
      // read with no filter is indistinguishable from a scoped one.
      const scope = q.eqs.find(([col]) => col === 'transactions.user_id')?.[1]
      return scope
        ? links.filter((l) => (l.transactions as { user_id: string }).user_id === scope)
        : links
    }
    return []
  })
}

const usageOf = (tags: Array<{ id: string; usageCount: number }>, id: string) =>
  tags.find((t) => t.id === id)!.usageCount

describe('fetchTags — usage counts are scoped to the user', () => {
  it('ignores another account\'s tag links when counting', async () => {
    // The other account tags enough to fill the response on its own, so an
    // unscoped read never reaches this user's rows.
    const links = [
      ...Array.from({ length: SERVER_MAX_ROWS }, (_, i) => link(OTHER_USER, i, OTHER_USERS_TAG)),
      ...Array.from({ length: 9 }, (_, i) => link(USER, i, REIMBURSEMENT)),
      ...Array.from({ length: 4 }, (_, i) => link(USER, i + 9, FLORIDA_HOUSE)),
    ]
    const { client } = supabaseWith(links)

    const context = await prefetchRuleEngineContext(client, USER)

    expect(usageOf(context.tags, REIMBURSEMENT)).toBe(9)
    expect(usageOf(context.tags, FLORIDA_HOUSE)).toBe(4)
  })

  it('keeps the tag ordering the LLM prompt is built from', async () => {
    // Unscoped, both counts collapse to 0 and the order becomes arbitrary.
    const links = [
      ...Array.from({ length: SERVER_MAX_ROWS }, (_, i) => link(OTHER_USER, i, OTHER_USERS_TAG)),
      ...Array.from({ length: 4 }, (_, i) => link(USER, i, FLORIDA_HOUSE)),
      ...Array.from({ length: 9 }, (_, i) => link(USER, i + 4, REIMBURSEMENT)),
    ]
    const { client } = supabaseWith(links)

    const context = await prefetchRuleEngineContext(client, USER)
    const ranked = [...context.tags].sort((a, b) => b.usageCount - a.usageCount).map((t) => t.id)

    expect(ranked).toEqual([REIMBURSEMENT, FLORIDA_HOUSE])
  })

  it('filters the count read on the owning transaction\'s user', async () => {
    const { client, queries } = supabaseWith([link(USER, 0, REIMBURSEMENT)])

    await prefetchRuleEngineContext(client, USER)

    const read = queries.find(isTagUsageRead)
    expect(read).toBeDefined()
    expect(read!.filters).toContain('eq:transactions.user_id')
    expect(read!.eqs).toContainEqual(['transactions.user_id', USER])
  })

  it('counts this user\'s links past a single page', async () => {
    const links = Array.from({ length: SERVER_MAX_ROWS + 250 }, (_, i) => link(USER, i, REIMBURSEMENT))
    const { client } = supabaseWith(links)

    const context = await prefetchRuleEngineContext(client, USER)

    expect(usageOf(context.tags, REIMBURSEMENT)).toBe(SERVER_MAX_ROWS + 250)
  })
})
