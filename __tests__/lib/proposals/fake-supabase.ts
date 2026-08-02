/**
 * Supabase double for the proposal context prefetch.
 *
 * Faithful about the three things the reads in proposal-service get wrong when
 * they are wrong: `.in(col, ids)` really drops rows outside the list, `.range()`
 * really pages, and an un-ranged response is really truncated at a server
 * ceiling. Without those, a capped or unscoped read is shaped exactly like a
 * complete one here too, and the test passes on broken code.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type Row = Record<string, unknown>

/**
 * PostgREST truncates an un-ranged response at the project's max-rows — 10,000
 * on this project — and says nothing about it. Scaled down so a test can hold
 * the dataset; what matters is that the ceiling exists, so a read that does not
 * page comes back short and cannot tell.
 */
export const SERVER_MAX_ROWS = 1000

/** What a fetcher asked for, so a test can assert the query's shape. */
export interface Query {
  table: string
  select: string
  filters: string[]
  /** Recorded `.eq()` column/value pairs, so a resolver can honour scoping. */
  eqs: Array<[string, unknown]>
  paged: boolean
}

export function fakeSupabase(rows: (q: Query) => Row[]) {
  const queries: Query[] = []

  const client = {
    from(table: string) {
      const q: Query = { table, select: '', filters: [], eqs: [], paged: false }
      let range: [number, number] | null = null
      let restrictTo: { col: string; values: Set<unknown> } | null = null
      const builder = {
        select(cols = '') {
          q.select = cols
          queries.push(q)
          return builder
        },
        eq(col: string, value: unknown) {
          q.filters.push(`eq:${col}`)
          q.eqs.push([col, value])
          return builder
        },
        not(col: string) {
          q.filters.push(`not:${col}`)
          return builder
        },
        in(col: string, values: unknown[]) {
          q.filters.push(`in:${col}:${values.length}`)
          restrictTo = { col, values: new Set(values) }
          return builder
        },
        gte: () => builder,
        lte: () => builder,
        order: () => builder,
        limit: () => builder,
        range(from: number, to: number) {
          q.paged = true
          range = [from, to]
          return builder
        },
        then(
          onFulfilled?: (v: { data: Row[]; error: null }) => unknown,
          onRejected?: (e: unknown) => unknown
        ) {
          let all = rows(q)
          if (restrictTo) {
            const { col, values } = restrictTo
            all = all.filter((r) => values.has(r[col]))
          }
          const data = range
            ? all.slice(range[0], Math.min(range[1] + 1, range[0] + SERVER_MAX_ROWS))
            : all.slice(0, SERVER_MAX_ROWS)
          return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected)
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, queries }
}

/** The `transaction_tags` read behind vendor tag frequency — it wants tag names. */
export const isTagFrequencyRead = (q: Query) =>
  q.table === 'transaction_tags' && q.select.includes('tags(name)')

/**
 * The `transaction_tags` read behind per-tag usage counts — the only one that
 * leads with `tag_id`, before and after it was scoped to the user.
 */
export const isTagUsageRead = (q: Query) =>
  q.table === 'transaction_tags' && q.select.startsWith('tag_id')
