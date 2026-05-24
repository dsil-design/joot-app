#!/usr/bin/env tsx
/**
 * Per-month business-expense analysis.
 *
 * Usage:
 *   npx tsx --env-file=.env.local database/scripts/tax-month-analysis.ts <YYYY-MM>
 *
 * Also dumps the existing "Business Expense"-tagged transactions for verification.
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

// Classification heuristics for a software/consulting solo operator
type Bucket = 'definite' | 'likely' | 'maybe' | 'personal'
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
  | '?'

function classify(vendor: string, description: string | null, amount: number, cur: string): {
  bucket: Bucket
  category: Category
  reason: string
} {
  const v = vendor.toLowerCase()
  const d = (description ?? '').toLowerCase()
  const text = v + ' || ' + d

  // ---- Definite business: tech-stack SaaS & dev tooling ----
  const definiteSaaS: { pattern: RegExp; cat: Category; why: string }[] = [
    { pattern: /anthropic|claude pro|claude max/, cat: 'Office Supplies', why: 'AI dev tool (Claude)' },
    { pattern: /openai|chatgpt/, cat: 'Office Supplies', why: 'AI dev tool (OpenAI)' },
    { pattern: /\bcursor\b/, cat: 'Office Supplies', why: 'IDE subscription (Cursor)' },
    { pattern: /jetbrains|webstorm|intellij|pycharm|datagrip/, cat: 'Office Supplies', why: 'IDE subscription (JetBrains)' },
    { pattern: /github(?! pages)/, cat: 'Office Supplies', why: 'GitHub' },
    { pattern: /vercel/, cat: 'Office Supplies', why: 'Vercel hosting' },
    { pattern: /supabase/, cat: 'Office Supplies', why: 'Supabase' },
    { pattern: /\bfigma\b/, cat: 'Office Supplies', why: 'Figma' },
    { pattern: /linear/, cat: 'Office Supplies', why: 'Linear' },
    { pattern: /godaddy|namecheap|cloudflare(?! warp)/, cat: 'Office Supplies', why: 'Domain/DNS' },
    { pattern: /google.*work|workspace|gsuite/, cat: 'Office Supplies', why: 'Google Workspace' },
    { pattern: /aws|amazon web services|ec2|s3 storage/, cat: 'Office Supplies', why: 'AWS' },
    { pattern: /digitalocean|render\.com|fly\.io|netlify|railway/, cat: 'Office Supplies', why: 'Hosting' },
    { pattern: /sentry|datadog|posthog|plausible|mixpanel/, cat: 'Office Supplies', why: 'Observability/analytics' },
    { pattern: /\bnotion\b/, cat: 'Office Supplies', why: 'Notion' },
    { pattern: /raycast|1password|bitwarden|tailscale/, cat: 'Office Supplies', why: 'Dev productivity tool' },
  ]
  for (const { pattern, cat, why } of definiteSaaS) {
    if (pattern.test(text)) return { bucket: 'definite', category: cat, reason: why }
  }

  // Wise transfer fees — business if used to pay clients/vendors
  if (v === 'wise' && /transfer fee/.test(d)) {
    return { bucket: 'likely', category: 'Other Expenses', reason: 'Wise fee — likely business if FX for work' }
  }

  // ---- Definite personal — clearly out ----
  const definitePersonal: { pattern: RegExp; why: string }[] = [
    { pattern: /landlord|castle management|north hill|bliss|^pol$|nidnoi|leigh|martin finn/, why: 'rent / personal transfer' },
    { pattern: /grab(?! pay)/, why: 'Grab — personal transport unless we mark trip as business' },
    { pattern: /\bbolt\b/, why: 'Bolt — personal transport' },
    { pattern: /\btops\b|gourmet market|villa market|big c|tesco|7-eleven|seven eleven/, why: 'groceries' },
    { pattern: /chef fuji|highlands|best wine|alpine golf/, why: 'restaurant / golf — personal' },
    { pattern: /vanguard|frontline|chase travel|etihad|airasia|ncl|ondeck|agoda|avis/, why: 'personal travel/investments — flag if any trip was business' },
    { pattern: /xfinity|t-mobile|pea(?!\w)/, why: 'utility — needs business % allocation if home office' },
    { pattern: /the grint|grint pro/, why: 'golf scoring app' },
    { pattern: /irs|pay1040|whittaker/, why: 'tax payment / legal — personal income tax not deductible' },
    { pattern: /myself/, why: 'self-transfer' },
    { pattern: /apple watch|airpods|iphone case/, why: 'personal accessory' },
    { pattern: /lazada|homepro|nocnoc|amazon(?! web)/, why: 'mixed shopping — needs item-level review' },
  ]
  for (const { pattern, why } of definitePersonal) {
    if (pattern.test(text)) {
      // mixed-shopping ones go to 'maybe' since they could include business items
      if (/lazada|amazon|homepro|nocnoc|apple(?!\s*watch|airpods)/.test(v) && !/the grint/.test(d)) {
        return { bucket: 'maybe', category: '?', reason: why }
      }
      return { bucket: 'personal', category: '?', reason: why }
    }
  }

  // ---- Likely / maybe ----
  // Coworking
  if (/coworking|wework|hubba|the work loft/.test(text)) {
    return { bucket: 'definite', category: 'Home Office', reason: 'Coworking space' }
  }
  // Education
  if (/udemy|coursera|frontend masters|egghead|pluralsight|maven|book ?pal|amazon.*book/.test(text)) {
    return { bucket: 'likely', category: 'Education & Training', reason: 'Education platform' }
  }
  // Professional fees
  if (/lawyer|legal|accountant|cpa|h&r block|turbotax/.test(text)) {
    return { bucket: 'likely', category: 'Professional Fees', reason: 'Professional services' }
  }
  // Marketing
  if (/google ads|facebook ads|meta ads|business cards|moo\.com/.test(text)) {
    return { bucket: 'likely', category: 'Marketing & Advertising', reason: 'Marketing' }
  }

  // Default: maybe
  return { bucket: 'maybe', category: '?', reason: 'unclassified — needs review' }
}

async function main() {
  const monthArg = process.argv[2]
  if (!monthArg || !/^\d{4}-\d{2}$/.test(monthArg)) {
    console.error('Usage: tax-month-analysis.ts <YYYY-MM>')
    process.exit(1)
  }
  const [year, month] = monthArg.split('-').map(Number)
  const start = `${monthArg}-01`
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)

  const rateMap = await getRateMap()
  const vendors = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('vendors').select('id,name')
  )
  const vendorById = new Map(vendors.map(v => [v.id, v.name]))
  const pms = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('payment_methods').select('id,name')
  )
  const pmById = new Map(pms.map(p => [p.id, p.name]))

  // Tags
  const tags = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('tags').select('id,name')
  )
  const tagById = new Map(tags.map(t => [t.id, t.name]))
  const txTagRows = await fetchAllRows<{ transaction_id: string; tag_id: string }>(() =>
    supabase.from('transaction_tags').select('transaction_id,tag_id')
  )
  const tagsByTx = new Map<string, string[]>()
  for (const r of txTagRows) {
    const arr = tagsByTx.get(r.transaction_id) ?? []
    arr.push(tagById.get(r.tag_id) ?? '?')
    tagsByTx.set(r.transaction_id, arr)
  }

  // === First, dump the existing "Business Expense" tagged 2025 transactions for verification ===
  if (monthArg === '2025-01') {
    const beTagId = tags.find(t => t.name === 'Business Expense')?.id
    if (beTagId) {
      const beTxIds = txTagRows.filter(r => r.tag_id === beTagId).map(r => r.transaction_id)
      if (beTxIds.length) {
        const verifyRows: any[] = []
        for (let i = 0; i < beTxIds.length; i += 200) {
          const slice = beTxIds.slice(i, i + 200)
          const { data, error } = await supabase
            .from('transactions')
            .select('id,amount,original_currency,transaction_date,description,vendor_id,payment_method_id')
            .in('id', slice)
            .gte('transaction_date', '2025-01-01')
            .lte('transaction_date', '2025-12-31')
            .order('transaction_date', { ascending: true })
          if (error) throw error
          if (data) verifyRows.push(...data)
        }
        console.log('═══════════════════════════════════════════════════════════════════════')
        console.log(`📌 EXISTING "Business Expense" tagged transactions (2025) — ${verifyRows.length} txs`)
        console.log('═══════════════════════════════════════════════════════════════════════\n')
        for (const t of verifyRows) {
          const v = t.vendor_id ? vendorById.get(t.vendor_id) ?? '?' : '?'
          const pm = t.payment_method_id ? pmById.get(t.payment_method_id) ?? '?' : '?'
          const r = rateFor(rateMap, t.original_currency, t.transaction_date)
          const usd = r ? Number(t.amount) * r : 0
          console.log(
            `   ${t.transaction_date}  ${t.original_currency} ${Number(t.amount).toFixed(2).padStart(10)}  =$${usd.toFixed(2).padStart(8)}  ${v}  · ${t.description ?? ''}  [${pm}]`
          )
        }
        console.log()
      }
    }
  }

  // === Now the actual month ===
  console.log('═══════════════════════════════════════════════════════════════════════')
  console.log(`📅 ${monthArg}  business-expense classification`)
  console.log('═══════════════════════════════════════════════════════════════════════\n')

  const txs = await fetchAllRows<any>(() =>
    supabase
      .from('transactions')
      .select('id,amount,original_currency,transaction_date,description,vendor_id,payment_method_id')
      .gte('transaction_date', start)
      .lte('transaction_date', endDate)
      .eq('transaction_type', 'expense')
      .order('transaction_date', { ascending: true })
  )

  const buckets: Record<Bucket, any[]> = { definite: [], likely: [], maybe: [], personal: [] }
  for (const t of txs) {
    const v = t.vendor_id ? vendorById.get(t.vendor_id) ?? '' : ''
    const c = classify(v, t.description, Number(t.amount), t.original_currency)
    const r = rateFor(rateMap, t.original_currency, t.transaction_date)
    const usd = r ? Number(t.amount) * r : 0
    const enriched = {
      ...t,
      vendor: v || '(none)',
      pm: t.payment_method_id ? pmById.get(t.payment_method_id) ?? '?' : '?',
      usd,
      tags: tagsByTx.get(t.id) ?? [],
      ...c
    }
    buckets[c.bucket].push(enriched)
  }

  const print = (label: string, arr: any[]) => {
    const total = arr.reduce((s, x) => s + x.usd, 0)
    console.log(`\n── ${label} (${arr.length} txs · $${total.toFixed(2)}) ──`)
    for (const t of arr) {
      const tagPart = t.tags.length ? `  🏷️ ${t.tags.join(',')}` : ''
      console.log(
        `   ${t.transaction_date}  ${t.original_currency}${Number(t.amount).toFixed(2).padStart(10)}  =$${t.usd.toFixed(2).padStart(8)}  [${t.category}]  ${t.vendor}  · ${t.description ?? ''}  (${t.reason})${tagPart}`
      )
    }
  }
  print('🟢 DEFINITE business', buckets.definite)
  print('🟡 LIKELY business — need your call', buckets.likely)
  print('🟠 MAYBE business — needs review', buckets.maybe)
  print('⚪ Likely personal (listed for spot-check)', buckets.personal)

  console.log('\n═══════════════════════════════════════════════════════════════════════')
  console.log(`Summary for ${monthArg}:`)
  console.log(`   Definite: ${buckets.definite.length} txs · $${buckets.definite.reduce((s, x) => s + x.usd, 0).toFixed(2)}`)
  console.log(`   Likely:   ${buckets.likely.length} txs · $${buckets.likely.reduce((s, x) => s + x.usd, 0).toFixed(2)}`)
  console.log(`   Maybe:    ${buckets.maybe.length} txs · $${buckets.maybe.reduce((s, x) => s + x.usd, 0).toFixed(2)}`)
  console.log(`   Personal: ${buckets.personal.length} txs · $${buckets.personal.reduce((s, x) => s + x.usd, 0).toFixed(2)}`)
  console.log('═══════════════════════════════════════════════════════════════════════')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
