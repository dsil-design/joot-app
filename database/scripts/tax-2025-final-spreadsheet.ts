#!/usr/bin/env tsx
/**
 * Final 2025 Schedule C business-expense spreadsheet.
 * Pulls all transactions tagged "2025 Business Expense (CC)" and categorizes them
 * for the tax-firm template.
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TAG_NAME = '2025 Business Expense (CC)'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

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
  const d = new Date(date)
  for (let i = 0; i < 30; i++) {
    const key = `${currency}|${d.toISOString().slice(0, 10)}`
    const r = map.get(key)
    if (r) return r
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return null
}

// Tax-firm category mapping for confirmed business expenses.
// Keyed by (vendor pattern, description pattern). Catch-all goes to Office Supplies.
type Category =
  | 'Office Supplies'
  | 'Home Office'
  | 'Travel & Transportation'
  | 'Meals & Entertainment'
  | 'Professional Fees'
  | 'Marketing & Advertising'
  | 'Insurance'
  | 'Equipment'
  | 'Education & Training'
  | 'Other Expenses'

function categorize(vendor: string, description: string): Category {
  const v = vendor.toLowerCase()
  const d = description.toLowerCase()
  // Marketing
  if (v.includes('five cats') || d.includes('headshot') || d.includes('photo session')) return 'Marketing & Advertising'
  // Insurance
  if (v.includes('hartford') && d.includes('business insurance')) return 'Insurance'
  // Equipment
  if (v.includes('logitech') || d.includes('logitech') || d.includes('mx vertical')) return 'Equipment'
  // Other Expenses
  if (v.includes('skype')) return 'Other Expenses'
  // Default — SaaS, dev tools, AI subscriptions
  return 'Office Supplies'
}

async function main() {
  const rateMap = await getRateMap()

  const vendors = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('vendors').select('id,name')
  )
  const vendorById = new Map(vendors.map(v => [v.id, v.name]))

  const tags = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('tags').select('id,name')
  )
  const tag = tags.find(t => t.name === TAG_NAME)
  if (!tag) {
    console.error(`Tag "${TAG_NAME}" not found`)
    process.exit(1)
  }

  const txTagRows = await fetchAllRows<{ transaction_id: string; tag_id: string }>(() =>
    supabase.from('transaction_tags').select('transaction_id,tag_id').eq('tag_id', tag.id)
  )
  const txIds = txTagRows.map(r => r.transaction_id)
  console.log(`Found ${txIds.length} transactions tagged "${TAG_NAME}"`)

  const txs: any[] = []
  for (let i = 0; i < txIds.length; i += 200) {
    const slice = txIds.slice(i, i + 200)
    const { data, error } = await supabase
      .from('transactions')
      .select('id,amount,original_currency,transaction_date,description,vendor_id')
      .in('id', slice)
      .order('transaction_date', { ascending: true })
    if (error) throw error
    if (data) txs.push(...data)
  }

  type Row = { date: string; vendor: string; description: string; cur: string; amt: number; usd: number; category: Category }
  const rows: Row[] = txs.map(t => {
    const vendor = vendorById.get(t.vendor_id) ?? '(unknown)'
    const description = t.description ?? ''
    const r = rateFor(rateMap, t.original_currency, t.transaction_date)
    const usd = r ? Number(t.amount) * r : 0
    return {
      date: t.transaction_date,
      vendor,
      description,
      cur: t.original_currency,
      amt: Number(t.amount),
      usd,
      category: categorize(vendor, description)
    }
  })

  // Per-category totals
  const byCategory = new Map<Category, { count: number; usd: number; rows: Row[] }>()
  for (const r of rows) {
    const slot = byCategory.get(r.category) ?? { count: 0, usd: 0, rows: [] }
    slot.count += 1
    slot.usd += r.usd
    slot.rows.push(r)
    byCategory.set(r.category, slot)
  }

  // Per-month totals
  const byMonth = new Map<string, { count: number; usd: number }>()
  for (const r of rows) {
    const m = r.date.slice(0, 7)
    const slot = byMonth.get(m) ?? { count: 0, usd: 0 }
    slot.count += 1
    slot.usd += r.usd
    byMonth.set(m, slot)
  }

  // === Output: console summary ===
  console.log('\n═══════════════════════════════════════════════════════════════════════')
  console.log('2025 SCHEDULE C BUSINESS EXPENSE SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════════════\n')

  const totalUsd = rows.reduce((s, x) => s + x.usd, 0)
  console.log(`TOTAL: ${rows.length} transactions · $${totalUsd.toFixed(2)}\n`)

  console.log('By Tax Category:')
  const categoryOrder: Category[] = [
    'Office Supplies', 'Home Office', 'Travel & Transportation', 'Meals & Entertainment',
    'Professional Fees', 'Marketing & Advertising', 'Insurance', 'Equipment',
    'Education & Training', 'Other Expenses'
  ]
  for (const cat of categoryOrder) {
    const slot = byCategory.get(cat)
    if (slot) {
      console.log(`   ${cat.padEnd(28)} ${slot.count.toString().padStart(3)} txs   $${slot.usd.toFixed(2).padStart(10)}`)
    } else {
      console.log(`   ${cat.padEnd(28)}   0 txs   $${'0.00'.padStart(10)}  (none)`)
    }
  }

  console.log('\nBy Month:')
  for (const m of [...byMonth.keys()].sort()) {
    const slot = byMonth.get(m)!
    console.log(`   ${m}   ${slot.count.toString().padStart(3)} txs   $${slot.usd.toFixed(2).padStart(10)}`)
  }

  // === Output: CSV ===
  const csvLines = ['Category,Date,Vendor,Description,Original Currency,Original Amount,USD']
  for (const cat of categoryOrder) {
    const slot = byCategory.get(cat)
    if (!slot) continue
    for (const r of slot.rows) {
      const desc = r.description.replace(/"/g, '""')
      csvLines.push(`"${cat}",${r.date},"${r.vendor.replace(/"/g, '""')}","${desc}",${r.cur},${r.amt.toFixed(2)},${r.usd.toFixed(2)}`)
    }
  }
  csvLines.push('')
  csvLines.push('SUMMARY,,,,,,,')
  for (const cat of categoryOrder) {
    const slot = byCategory.get(cat)
    csvLines.push(`"${cat}",,,,,,,${(slot?.usd ?? 0).toFixed(2)}`)
  }
  csvLines.push(`TOTAL,,,,,,,${totalUsd.toFixed(2)}`)
  const csv = csvLines.join('\n')
  writeFileSync('database/scripts/tax-2025-business-expenses.csv', csv, 'utf-8')
  console.log('\n📄 CSV written to database/scripts/tax-2025-business-expenses.csv')

  // === Output: Markdown spreadsheet ===
  const mdLines: string[] = []
  mdLines.push('# 2025 Schedule C Business Expenses\n')
  mdLines.push(`**Total: $${totalUsd.toFixed(2)} across ${rows.length} transactions**\n`)
  mdLines.push('## Summary by Tax Category\n')
  mdLines.push('| Category | Count | USD |')
  mdLines.push('|---|---:|---:|')
  for (const cat of categoryOrder) {
    const slot = byCategory.get(cat)
    if (slot) {
      mdLines.push(`| ${cat} | ${slot.count} | $${slot.usd.toFixed(2)} |`)
    } else {
      mdLines.push(`| ${cat} | 0 | $0.00 |`)
    }
  }
  mdLines.push(`| **TOTAL** | **${rows.length}** | **$${totalUsd.toFixed(2)}** |\n`)

  mdLines.push('## Detail\n')
  for (const cat of categoryOrder) {
    const slot = byCategory.get(cat)
    if (!slot) continue
    mdLines.push(`### ${cat} — $${slot.usd.toFixed(2)}\n`)
    mdLines.push('| Date | Vendor | Description | Original | USD |')
    mdLines.push('|---|---|---|---:|---:|')
    for (const r of slot.rows) {
      mdLines.push(`| ${r.date} | ${r.vendor} | ${r.description} | ${r.cur} ${r.amt.toFixed(2)} | $${r.usd.toFixed(2)} |`)
    }
    mdLines.push('')
  }
  writeFileSync('database/scripts/tax-2025-business-expenses.md', mdLines.join('\n'), 'utf-8')
  console.log('📄 Markdown written to database/scripts/tax-2025-business-expenses.md')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
