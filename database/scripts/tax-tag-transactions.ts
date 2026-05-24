#!/usr/bin/env tsx
/**
 * Tag a list of transactions with "2025 Business Expense (CC)".
 * Creates the tag if it doesn't exist.
 *
 * Usage:
 *   echo '<tx-id-1> <tx-id-2> ...' | npx tsx --env-file=.env.local database/scripts/tax-tag-transactions.ts
 *   OR pass IDs as args:
 *   npx tsx --env-file=.env.local database/scripts/tax-tag-transactions.ts <id1> <id2> ...
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TAG_NAME = '2025 Business Expense (CC)'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  let ids = process.argv.slice(2)
  if (ids.length === 0) {
    const stdin = await new Promise<string>(res => {
      let buf = ''
      process.stdin.on('data', c => (buf += c))
      process.stdin.on('end', () => res(buf))
    })
    ids = stdin.split(/\s+/).filter(Boolean)
  }
  if (ids.length === 0) {
    console.error('No transaction IDs provided')
    process.exit(1)
  }

  // Find or create the tag — needs user_id; pull from first transaction
  const { data: firstTx, error: txErr } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('id', ids[0])
    .single()
  if (txErr || !firstTx) {
    console.error('Could not look up first transaction:', txErr)
    process.exit(1)
  }
  const userId = firstTx.user_id

  let { data: existingTag } = await supabase
    .from('tags')
    .select('id')
    .eq('name', TAG_NAME)
    .eq('user_id', userId)
    .maybeSingle()

  let tagId: string
  if (!existingTag) {
    const { data: created, error: createErr } = await supabase
      .from('tags')
      .insert({ name: TAG_NAME, user_id: userId, color: '#fef3c7' })
      .select('id')
      .single()
    if (createErr || !created) {
      console.error('Failed to create tag:', createErr)
      process.exit(1)
    }
    tagId = created.id
    console.log(`✅ Created tag "${TAG_NAME}" (${tagId})`)
  } else {
    tagId = existingTag.id
    console.log(`ℹ️  Using existing tag "${TAG_NAME}" (${tagId})`)
  }

  // Insert junction rows, ignoring duplicates
  const rows = ids.map(transaction_id => ({ transaction_id, tag_id: tagId }))
  const { error: insertErr, count } = await supabase
    .from('transaction_tags')
    .upsert(rows, { onConflict: 'transaction_id,tag_id', ignoreDuplicates: true, count: 'exact' })
  if (insertErr) {
    console.error('Failed to insert tags:', insertErr)
    process.exit(1)
  }
  console.log(`✅ Tagged ${ids.length} transaction(s) with "${TAG_NAME}"`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
