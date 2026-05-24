#!/usr/bin/env tsx
/**
 * Survey existing business-related tags and tech-stack vendors for 2025.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

async function main() {
  const rateMap = await getRateMap()

  // 1. Vendors and tags lookup
  const vendors = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('vendors').select('id,name')
  )
  const vendorById = new Map(vendors.map(v => [v.id, v.name]))

  const tags = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('tags').select('id,name')
  )
  const tagById = new Map(tags.map(t => [t.id, t.name]))

  // Filter to business-relevant tags
  const businessTagNames = ['Business', 'Business Expense', 'Tax Deductible', 'Work Travel', 'Client Meeting', 'Recurring']
  const businessTagIds = new Set(
    tags.filter(t => businessTagNames.includes(t.name)).map(t => t.id)
  )
  console.log('🏷️  Tags being checked:', tags.filter(t => businessTagIds.has(t.id)).map(t => t.name).join(', '))
  console.log()

  // 2. Get all transaction_tags joined with transactions for 2025
  const txTagRows = await fetchAllRows<{ transaction_id: string; tag_id: string }>(() =>
    supabase.from('transaction_tags').select('transaction_id,tag_id').in('tag_id', [...businessTagIds])
  )
  const tagsByTx = new Map<string, string[]>()
  for (const r of txTagRows) {
    const arr = tagsByTx.get(r.transaction_id) ?? []
    arr.push(tagById.get(r.tag_id)!)
    tagsByTx.set(r.transaction_id, arr)
  }

  const txIds = [...tagsByTx.keys()]
  console.log(`Found ${txIds.length} 2025-or-other transactions with one of those tags.\n`)

  // 3. Pull those transactions, restricted to 2025
  const taggedTxs: any[] = []
  for (let i = 0; i < txIds.length; i += 200) {
    const slice = txIds.slice(i, i + 200)
    const { data, error } = await supabase
      .from('transactions')
      .select('id,amount,original_currency,transaction_date,description,vendor_id,payment_method_id,transaction_type')
      .in('id', slice)
      .gte('transaction_date', '2025-01-01')
      .lte('transaction_date', '2025-12-31')
    if (error) throw error
    if (data) taggedTxs.push(...data)
  }

  console.log(`📋 ${taggedTxs.length} 2025 transactions are already tagged with a business-related tag.\n`)

  // Group by tag
  const byTag = new Map<string, { count: number; usd: number }>()
  for (const t of taggedTxs) {
    const r = rateFor(rateMap, t.original_currency, t.transaction_date)
    const usd = r ? Number(t.amount) * r : 0
    const tagNames = tagsByTx.get(t.id) ?? []
    for (const tn of tagNames) {
      const slot = byTag.get(tn) ?? { count: 0, usd: 0 }
      slot.count += 1
      slot.usd += usd
      byTag.set(tn, slot)
    }
  }
  console.log('Already-tagged 2025 expenses by tag:')
  for (const [tn, s] of [...byTag.entries()].sort((a, b) => b[1].usd - a[1].usd)) {
    console.log(`   ${tn.padEnd(20)} ${s.count.toString().padStart(4)} txs · $${s.usd.toFixed(2)}`)
  }
  console.log()

  // 4. Tech-stack vendor search
  const techPatterns = [
    'anthropic', 'openai', 'claude', 'chatgpt', 'cursor', 'github', 'vercel', 'supabase',
    'aws', 'amazon web', 'google cloud', 'gcp', 'cloudflare', 'figma', 'linear', 'notion',
    'slack', 'zoom', 'apple', 'microsoft', 'jetbrains', 'replit', 'render', 'fly.io',
    'digitalocean', 'stripe', 'twilio', 'sendgrid', 'mailgun', 'postmark', 'plausible',
    'posthog', 'mixpanel', 'sentry', 'datadog', 'expo', 'godaddy', 'namecheap', 'cloudways',
    'tailscale', '1password', 'lastpass', 'bitwarden', 'dropbox', 'gdrive', 'google work',
    'arc browser', 'raycast', 'wise', 'bookpal'
  ]

  const allTxs = await fetchAllRows<any>(() =>
    supabase
      .from('transactions')
      .select('id,amount,original_currency,transaction_date,description,vendor_id,payment_method_id')
      .gte('transaction_date', '2025-01-01')
      .lte('transaction_date', '2025-12-31')
      .eq('transaction_type', 'expense')
  )

  const matches: { vendor: string; description: string | null; date: string; amount: number; cur: string; usd: number }[] = []
  for (const t of allTxs) {
    const vendor = t.vendor_id ? vendorById.get(t.vendor_id) ?? '' : ''
    const desc = t.description ?? ''
    const haystack = (vendor + ' ' + desc).toLowerCase()
    if (techPatterns.some(p => haystack.includes(p))) {
      const r = rateFor(rateMap, t.original_currency, t.transaction_date)
      const usd = r ? Number(t.amount) * r : 0
      matches.push({
        vendor: vendor || '(no vendor)',
        description: t.description,
        date: t.transaction_date,
        amount: Number(t.amount),
        cur: t.original_currency,
        usd
      })
    }
  }

  // Group matches by vendor
  const byVendor = new Map<string, { count: number; usd: number; sample: string }>()
  for (const m of matches) {
    const slot = byVendor.get(m.vendor) ?? { count: 0, usd: 0, sample: m.description ?? '' }
    slot.count += 1
    slot.usd += m.usd
    byVendor.set(m.vendor, slot)
  }

  console.log(`💻 Tech-stack vendor matches (${matches.length} txs):`)
  for (const [v, s] of [...byVendor.entries()].sort((a, b) => b[1].usd - a[1].usd)) {
    console.log(`   $${s.usd.toFixed(2).padStart(9)}  ${s.count.toString().padStart(3)}x  ${v}${s.sample ? `  · "${s.sample.slice(0, 50)}"` : ''}`)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
