#!/usr/bin/env tsx
/**
 * One-off repair: fix a single email's currency code.
 *
 * Originally written for email 6386799e-eec9-4188-9ee1-09d02d79c6f2 — a
 * Hanoi GrabFood receipt mislabeled THB by the (now-fixed) AI fallback when
 * the Grab parser couldn't find a ฿ amount and fell back to the AI prompt
 * that anchored on the user's THB context.
 *
 * Usage:
 *   tsx database/scripts/repair-email-currency.ts <emailId> <newCurrency>
 *   tsx database/scripts/repair-email-currency.ts <emailId> <newCurrency> --apply
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const emailId = process.argv[2]
  const newCurrency = process.argv[3]
  const apply = process.argv.includes('--apply')
  if (!emailId || !newCurrency) {
    console.error('usage: tsx database/scripts/repair-email-currency.ts <emailId> <currency> [--apply]')
    process.exit(1)
  }

  const { data: before, error } = await sb
    .from('email_transactions')
    .select('id, amount, currency, description, transaction_date, status')
    .eq('id', emailId)
    .single()
  if (error || !before) {
    console.error('lookup failed:', error)
    process.exit(1)
  }

  console.log('BEFORE:', JSON.stringify(before, null, 2))
  if (before.currency === newCurrency) {
    console.log('Currency already', newCurrency, '— nothing to do.')
    return
  }

  if (!apply) {
    console.log(`\nWould update currency: ${before.currency} -> ${newCurrency}`)
    console.log('Pass --apply to commit.')
    return
  }

  const { error: upErr } = await sb
    .from('email_transactions')
    .update({ currency: newCurrency, updated_at: new Date().toISOString() })
    .eq('id', emailId)
  if (upErr) {
    console.error('update failed:', upErr)
    process.exit(1)
  }
  console.log(`Updated currency: ${before.currency} -> ${newCurrency}`)
}

main().catch(e => { console.error(e); process.exit(1) })
