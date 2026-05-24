#!/usr/bin/env tsx
/**
 * Tag a curated list of (date, vendor-substring, description-substring) for a month.
 * Single-purpose runner used during the 2025 Schedule C survey.
 *
 * Edit the `selections` constant in main() and run.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TAG_NAME = '2025 Business Expense (CC)'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

type Selection = {
  date: string
  vendorSubstr: string
  descSubstr: string
  expectedUsd?: number
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

async function findOrCreateTag(userId: string): Promise<string> {
  const { data: existingTag } = await supabase
    .from('tags')
    .select('id')
    .eq('name', TAG_NAME)
    .eq('user_id', userId)
    .maybeSingle()
  if (existingTag) return existingTag.id
  const { data: created, error } = await supabase
    .from('tags')
    .insert({ name: TAG_NAME, user_id: userId, color: '#fef3c7' })
    .select('id')
    .single()
  if (error || !created) throw error ?? new Error('tag create failed')
  console.log(`✅ Created tag "${TAG_NAME}" (${created.id})`)
  return created.id
}

async function resolveSelections(selections: Selection[]) {
  const startDates = [...new Set(selections.map(s => s.date))]
  const minDate = startDates.sort()[0]
  const maxDate = startDates.sort().slice(-1)[0]

  const txs = await fetchAllRows<any>(() =>
    supabase
      .from('transactions')
      .select('id,user_id,transaction_date,description,vendor_id,amount,original_currency')
      .gte('transaction_date', minDate)
      .lte('transaction_date', maxDate)
      .eq('transaction_type', 'expense')
  )
  const vendors = await fetchAllRows<{ id: string; name: string }>(() =>
    supabase.from('vendors').select('id,name')
  )
  const vendorById = new Map(vendors.map(v => [v.id, v.name]))

  const matched: { sel: Selection; tx: any }[] = []
  const unmatched: Selection[] = []
  const ambiguous: { sel: Selection; candidates: any[] }[] = []
  for (const sel of selections) {
    const candidates = txs.filter(t => {
      if (t.transaction_date !== sel.date) return false
      const vname = (vendorById.get(t.vendor_id) ?? '').toLowerCase()
      const desc = (t.description ?? '').toLowerCase()
      return vname.includes(sel.vendorSubstr.toLowerCase()) && desc.includes(sel.descSubstr.toLowerCase())
    })
    if (candidates.length === 0) unmatched.push(sel)
    else if (candidates.length > 1) ambiguous.push({ sel, candidates })
    else matched.push({ sel, tx: candidates[0] })
  }

  return { matched, unmatched, ambiguous, vendorById }
}

async function main() {
  // EDIT THIS for each month run
  const selections: Selection[] = [
    { date: '2025-12-15', vendorSubstr: 'Anthropic',      descSubstr: 'Claude Pro',           expectedUsd: 20.00 },
    { date: '2025-12-18', vendorSubstr: 'JetBrains',      descSubstr: 'WebStorm',             expectedUsd: 59.25 },
    { date: '2025-12-19', vendorSubstr: 'Anthropic',      descSubstr: 'Upgrade',              expectedUsd: 82.62 },
  ]

  const { matched, unmatched, ambiguous, vendorById } = await resolveSelections(selections)

  console.log(`\n📋 Match summary: ${matched.length} matched, ${unmatched.length} unmatched, ${ambiguous.length} ambiguous`)
  for (const u of unmatched) console.log(`   ❌ NOT FOUND: ${u.date} · ${u.vendorSubstr} · ${u.descSubstr}`)
  for (const a of ambiguous) {
    console.log(`   ⚠️  AMBIGUOUS: ${a.sel.date} · ${a.sel.vendorSubstr} · ${a.sel.descSubstr} → ${a.candidates.length} candidates:`)
    for (const c of a.candidates) {
      console.log(`        ${c.id}  ${c.transaction_date}  ${vendorById.get(c.vendor_id)}  · ${c.description}  ${c.original_currency}${c.amount}`)
    }
  }
  for (const m of matched) {
    console.log(`   ✅ ${m.tx.id}  ${m.tx.transaction_date}  ${vendorById.get(m.tx.vendor_id)}  · ${m.tx.description}  ${m.tx.original_currency}${m.tx.amount}`)
  }

  if (unmatched.length || ambiguous.length) {
    console.error('\n⛔ Refusing to tag — resolve unmatched/ambiguous selections first.')
    process.exit(1)
  }

  if (matched.length === 0) {
    console.log('\nNothing to tag.')
    return
  }

  const userId = matched[0].tx.user_id
  const tagId = await findOrCreateTag(userId)
  const rows = matched.map(m => ({ transaction_id: m.tx.id, tag_id: tagId }))
  const { error: insertErr } = await supabase
    .from('transaction_tags')
    .upsert(rows, { onConflict: 'transaction_id,tag_id', ignoreDuplicates: true })
  if (insertErr) {
    console.error('❌ Tag insert failed:', insertErr)
    process.exit(1)
  }
  console.log(`\n✅ Tagged ${matched.length} transaction(s).`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
