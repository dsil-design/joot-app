#!/usr/bin/env tsx
/**
 * 2025 tax survey — high-level lay of the land for business expense analysis.
 * Outputs:
 *   - Payment methods (so we can identify the "business" card)
 *   - Monthly transaction counts and totals (USD-converted via exchange_rates)
 *   - Top vendors by spend
 *   - Spend by payment method
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

type Row = {
  id: string
  amount: number
  original_currency: string
  transaction_type: 'income' | 'expense' | 'transfer'
  transaction_date: string
  description: string | null
  vendor_id: string | null
  payment_method_id: string | null
}

async function fetchAllRows<T>(builder: () => any): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  const out: T[] = []
  while (true) {
    const { data, error } = await builder().range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return out
}

async function getRateMap() {
  const rows = await fetchAllRows<{ from_currency: string; to_currency: string; rate: number; date: string }>(() =>
    supabase.from('exchange_rates').select('from_currency,to_currency,rate,date').eq('to_currency', 'USD')
  )
  const m = new Map<string, number>()
  for (const r of rows) m.set(`${r.from_currency}|${r.date}`, Number(r.rate))
  return m
}

function rateFor(map: Map<string, number>, currency: string, date: string): number | null {
  if (currency === 'USD') return 1
  // try exact date, then walk back up to 14 days
  const d = new Date(date)
  for (let i = 0; i < 30; i++) {
    const key = `${currency}|${d.toISOString().slice(0, 10)}`
    const r = map.get(key)
    if (r) return r
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return null
}

async function main() {
  console.log('🔍 2025 tax survey\n')

  // 1. Payment methods
  const pms = await fetchAllRows<{ id: string; name: string; type: string; card_last_four: string | null }>(() =>
    supabase.from('payment_methods').select('id,name,type,card_last_four').order('name')
  )
  const pmById = new Map(pms.map(p => [p.id, p]))
  console.log('💳 Payment methods:')
  for (const p of pms) {
    console.log(`   ${p.name}${p.card_last_four ? ` (****${p.card_last_four})` : ''} — ${p.type}`)
  }
  console.log()

  // 2. Vendors
  const vendors = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('vendors').select('id,name')
  )
  const vendorById = new Map(vendors.map(v => [v.id, v.name]))

  // 3. All 2025 expense transactions
  const txs = await fetchAllRows<Row>(() =>
    supabase
      .from('transactions')
      .select('id,amount,original_currency,transaction_type,transaction_date,description,vendor_id,payment_method_id')
      .gte('transaction_date', '2025-01-01')
      .lte('transaction_date', '2025-12-31')
      .eq('transaction_type', 'expense')
      .order('transaction_date', { ascending: true })
  )

  console.log(`📊 Total 2025 expense transactions: ${txs.length}\n`)

  const rateMap = await getRateMap()

  // 4. Per-month totals (USD)
  const monthly = new Map<string, { count: number; usd: number; missing: number }>()
  let totalUsd = 0
  let missingFx = 0
  for (const t of txs) {
    const month = t.transaction_date.slice(0, 7)
    const r = rateFor(rateMap, t.original_currency, t.transaction_date)
    const usd = r ? Number(t.amount) * r : 0
    if (!r) missingFx++
    const slot = monthly.get(month) ?? { count: 0, usd: 0, missing: 0 }
    slot.count += 1
    slot.usd += usd
    if (!r) slot.missing += 1
    monthly.set(month, slot)
    totalUsd += usd
  }

  console.log('📅 Monthly expense totals (USD):')
  const months = [...monthly.keys()].sort()
  for (const m of months) {
    const s = monthly.get(m)!
    console.log(
      `   ${m}: ${s.count.toString().padStart(4)} txs · $${s.usd.toFixed(2).padStart(10)}${s.missing ? `  (⚠️ ${s.missing} missing FX)` : ''}`
    )
  }
  console.log(`   ─────`)
  console.log(`   TOTAL: ${txs.length} txs · $${totalUsd.toFixed(2)}${missingFx ? `  (${missingFx} missing FX)` : ''}\n`)

  // 5. Top vendors by USD spend
  const byVendor = new Map<string, { count: number; usd: number }>()
  for (const t of txs) {
    const name = t.vendor_id ? vendorById.get(t.vendor_id) ?? '(unknown vendor)' : '(no vendor)'
    const r = rateFor(rateMap, t.original_currency, t.transaction_date)
    const usd = r ? Number(t.amount) * r : 0
    const slot = byVendor.get(name) ?? { count: 0, usd: 0 }
    slot.count += 1
    slot.usd += usd
    byVendor.set(name, slot)
  }
  const topVendors = [...byVendor.entries()].sort((a, b) => b[1].usd - a[1].usd).slice(0, 40)
  console.log('🏪 Top 40 vendors by USD spend:')
  for (const [name, s] of topVendors) {
    console.log(`   $${s.usd.toFixed(2).padStart(10)}  ${s.count.toString().padStart(4)}x  ${name}`)
  }
  console.log()

  // 6. Spend by payment method
  const byPm = new Map<string, { count: number; usd: number }>()
  for (const t of txs) {
    const name = t.payment_method_id
      ? pmById.get(t.payment_method_id)?.name ?? '(unknown)'
      : '(no payment method)'
    const r = rateFor(rateMap, t.original_currency, t.transaction_date)
    const usd = r ? Number(t.amount) * r : 0
    const slot = byPm.get(name) ?? { count: 0, usd: 0 }
    slot.count += 1
    slot.usd += usd
    byPm.set(name, slot)
  }
  const pmSorted = [...byPm.entries()].sort((a, b) => b[1].usd - a[1].usd)
  console.log('💳 Spend by payment method:')
  for (const [name, s] of pmSorted) {
    console.log(`   $${s.usd.toFixed(2).padStart(10)}  ${s.count.toString().padStart(4)}x  ${name}`)
  }
  console.log()

  // 7. Existing tags
  const tags = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('tags').select('id,name').order('name')
  )
  console.log(`🏷️  Existing tags (${tags.length}): ${tags.map(t => t.name).join(', ')}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
