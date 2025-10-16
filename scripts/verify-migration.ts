#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uwjmgjqongcrsamprvjr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verify() {
  console.log('🔍 Verifying migration...\n')

  // Check structure
  console.log('1️⃣  Checking table structure:\n')
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .limit(5)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (transactions && transactions.length > 0) {
    const sample = transactions[0]
    const hasAmount = 'amount' in sample
    const hasAmountUsd = 'amount_usd' in sample
    const hasAmountThb = 'amount_thb' in sample

    console.log('Column check:')
    console.log('  amount column exists:', hasAmount ? '✅' : '❌')
    console.log('  amount_usd removed:', !hasAmountUsd ? '✅' : '❌')
    console.log('  amount_thb removed:', !hasAmountThb ? '✅' : '❌')
    console.log('')

    // Show sample data
    console.log('2️⃣  Sample transactions after migration:\n')
    transactions.forEach((t, i) => {
      console.log(`Transaction ${i + 1}:`)
      console.log(`  ID: ${t.id}`)
      console.log(`  Amount: ${t.amount}`)
      console.log(`  Currency: ${t.original_currency}`)
      console.log(`  Description: ${t.description || 'N/A'}`)
      console.log('')
    })

    // Count transactions
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })

    console.log(`3️⃣  Total transactions: ${count}\n`)

    if (hasAmount && !hasAmountUsd && !hasAmountThb) {
      console.log('✅ Migration completed successfully!')
      console.log('\nNext steps:')
      console.log('  1. Test the application to ensure it works with the new schema')
      console.log('  2. Commit and push the code changes')
    } else {
      console.log('⚠️  Migration may not have completed fully')
      console.log('Please check the migration output in Supabase Dashboard')
    }
  }
}

verify().catch(console.error)
