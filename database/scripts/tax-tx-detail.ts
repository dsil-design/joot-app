#!/usr/bin/env tsx
/**
 * Pull full source-level detail for a transaction (email subject/body, statement upload, etc.)
 * Useful when the description is ambiguous and we need to know what was actually purchased.
 *
 * Usage:
 *   npx tsx --env-file=.env.local database/scripts/tax-tx-detail.ts <date> <vendor-substr> [<desc-substr>]
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  const [date, vendorSubstr, descSubstr] = process.argv.slice(2)
  if (!date || !vendorSubstr) {
    console.error('Usage: tax-tx-detail.ts <YYYY-MM-DD> <vendor-substr> [<desc-substr>]')
    process.exit(1)
  }

  const { data: vendors } = await supabase.from('vendors').select('id,name')
  const vendorById = new Map((vendors ?? []).map(v => [v.id, v.name]))

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('transaction_date', date)
    .eq('transaction_type', 'expense')
  if (error) throw error
  const filtered = (txs ?? []).filter(t => {
    const v = (vendorById.get(t.vendor_id) ?? '').toLowerCase()
    const d = (t.description ?? '').toLowerCase()
    if (!v.includes(vendorSubstr.toLowerCase())) return false
    if (descSubstr && !d.includes(descSubstr.toLowerCase())) return false
    return true
  })

  for (const t of filtered) {
    console.log('═══════════════════════════════════════════════════════════════════════')
    console.log(`Transaction ${t.id}`)
    console.log(`Date: ${t.transaction_date}  Vendor: ${vendorById.get(t.vendor_id)}  Description: ${t.description}`)
    console.log(`Amount: ${t.original_currency}${t.amount}  Reference: ${t.reference_amount} ${t.reference_currency}`)
    console.log(`Source email: ${t.source_email_transaction_id}`)
    console.log(`Source statement upload: ${t.source_statement_upload_id}`)
    console.log(`Source payment slip: ${t.source_payment_slip_id}`)
    if (t.source_email_transaction_id) {
      const { data: et } = await supabase
        .from('email_transactions')
        .select('*')
        .eq('id', t.source_email_transaction_id)
        .single()
      console.log('\n--- Email transaction ---')
      console.log(JSON.stringify(et, null, 2))

      if (et?.email_id) {
        const { data: email } = await supabase
          .from('emails')
          .select('subject,from_address,received_at,snippet,body_text')
          .eq('id', et.email_id)
          .single()
        console.log('\n--- Email ---')
        console.log(`Subject: ${email?.subject}`)
        console.log(`From: ${email?.from_address}`)
        console.log(`Received: ${email?.received_at}`)
        console.log(`Snippet: ${email?.snippet}`)
        if (email?.body_text) {
          console.log(`\n--- Body (first 2000 chars) ---`)
          console.log(email.body_text.slice(0, 2000))
        }
      }
    }
    if (t.source_statement_upload_id) {
      const { data: su } = await supabase
        .from('statement_uploads')
        .select('id,bank_name,statement_period_start,statement_period_end,file_name')
        .eq('id', t.source_statement_upload_id)
        .single()
      console.log('\n--- Statement upload ---')
      console.log(JSON.stringify(su, null, 2))
    }
    console.log()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
