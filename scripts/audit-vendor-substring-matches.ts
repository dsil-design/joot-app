/**
 * READ ONLY. Run matchVendor over every distinct email_transactions.vendor_name_raw
 * against the user's real vendor list and print the pairs it produces, so
 * substring false positives ("HEALTHLINK CO.,LTD." -> "Link") are visible.
 *
 * Usage: npx tsx scripts/audit-vendor-substring-matches.ts [minConfidence]
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { matchVendor } from '../src/lib/proposals/vendor-matcher'
import type { VendorRecord } from '../src/lib/proposals/types'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const minConfidence = Number(process.argv[2] || 0)

async function main() {
  const { data: users } = await sb.from('users').select('id, email')
  const counts = await Promise.all(
    (users || []).map(async (u) => {
      const { count } = await sb.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', u.id)
      return { id: u.id, count: count || 0 }
    })
  )
  counts.sort((a, b) => b.count - a.count)
  const userId = counts[0].id

  const [{ data: vendorRows }, { data: txRows }] = await Promise.all([
    sb.from('vendors').select('id, name').eq('user_id', userId),
    sb.from('transactions').select('vendor_id').eq('user_id', userId),
  ])

  const txCount = new Map<string, number>()
  for (const tx of txRows || []) {
    if (tx.vendor_id) txCount.set(tx.vendor_id, (txCount.get(tx.vendor_id) || 0) + 1)
  }

  const vendors: VendorRecord[] = (vendorRows || []).map((v) => ({
    id: v.id,
    name: v.name,
    transactionCount: txCount.get(v.id) || 0,
  }))

  const { data: emailRows } = await sb
    .from('email_transactions')
    .select('vendor_name_raw')
    .eq('user_id', userId)
    .not('vendor_name_raw', 'is', null)

  const raws = [...new Set((emailRows || []).map((r) => r.vendor_name_raw as string).filter((s) => s.trim()))]
  raws.sort()

  console.log(`user ${userId} — ${vendors.length} vendors, ${raws.length} distinct vendor_name_raw values\n`)

  let matched = 0
  for (const raw of raws) {
    const result = matchVendor(raw, vendors, [])
    if (!result || result.confidence < minConfidence) continue
    matched++
    const alts = result.alternatives.map((a) => `${a.name} ${a.confidence}%`).join(', ')
    console.log(
      `${String(result.confidence).padStart(3)}%  ${JSON.stringify(raw)}\n` +
        `       -> "${result.vendorName}"${alts ? `   [alts: ${alts}]` : ''}`
    )
  }

  console.log(`\n${matched}/${raws.length} raw names produced a match at >=${minConfidence}%`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
