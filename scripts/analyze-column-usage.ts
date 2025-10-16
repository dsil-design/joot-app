#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uwjmgjqongcrsamprvjr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function analyzeColumns() {
  console.log('🔍 Analyzing column usage across all tables...\n')

  // Check transactions table columns
  console.log('📊 TRANSACTIONS TABLE:\n')

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .limit(100)

  if (error) {
    console.error('Error fetching transactions:', error)
    return
  }

  if (transactions && transactions.length > 0) {
    // Check exchange_rate column
    const withExchangeRate = transactions.filter(t => t.exchange_rate !== null && t.exchange_rate !== undefined)
    console.log(`exchange_rate column:`)
    console.log(`  - Total transactions: ${transactions.length}`)
    console.log(`  - With exchange_rate value: ${withExchangeRate.length}`)
    console.log(`  - Status: ${withExchangeRate.length === 0 ? '❌ UNUSED (all NULL)' : `⚠️  ${withExchangeRate.length} records have values`}`)
    console.log('')

    // Check title column
    const withTitle = transactions.filter(t => t.title !== null && t.title !== undefined && t.title !== '')
    console.log(`title column:`)
    console.log(`  - Total transactions: ${transactions.length}`)
    console.log(`  - With title value: ${withTitle.length}`)
    console.log(`  - Status: ${withTitle.length === 0 ? '❌ UNUSED (all NULL/empty)' : `⚠️  ${withTitle.length} records have values`}`)
    console.log('')
  }

  // Check users table columns
  console.log('📊 USERS TABLE:\n')

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(100)

  if (usersError) {
    console.error('Error fetching users:', usersError)
    return
  }

  if (users && users.length > 0) {
    const sample = users[0]

    // Check if preferred_currency exists
    if ('preferred_currency' in sample) {
      const withPreferredCurrency = users.filter(u => u.preferred_currency !== null && u.preferred_currency !== undefined)
      console.log(`preferred_currency column:`)
      console.log(`  - Total users: ${users.length}`)
      console.log(`  - With preferred_currency value: ${withPreferredCurrency.length}`)
      console.log(`  - Status: ${withPreferredCurrency.length === 0 ? '❌ UNUSED (all NULL)' : `⚠️  ${withPreferredCurrency.length} users have values`}`)
    } else {
      console.log(`preferred_currency column: ℹ️  Column does not exist in database`)
    }
    console.log('')
  }

  // Check payment_methods table
  console.log('📊 PAYMENT_METHODS TABLE:\n')

  const { data: paymentMethods, error: pmError } = await supabase
    .from('payment_methods')
    .select('*')
    .limit(100)

  if (!pmError && paymentMethods) {
    console.log(`  - Total payment methods: ${paymentMethods.length}`)
    console.log(`  - Columns: ${Object.keys(paymentMethods[0] || {}).join(', ')}`)
    console.log('')
  }

  // Check vendors table
  console.log('📊 VENDORS TABLE:\n')

  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('*')
    .limit(100)

  if (!vendorsError && vendors) {
    console.log(`  - Total vendors: ${vendors.length}`)
    console.log(`  - Columns: ${Object.keys(vendors[0] || {}).join(', ')}`)
    console.log('')
  }

  console.log('✅ Analysis complete!')
}

analyzeColumns().catch(console.error)
