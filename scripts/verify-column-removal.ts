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

async function verifyColumnRemoval() {
  console.log('🔍 Verifying column removal migration...\n')

  // Check transactions table
  console.log('📊 TRANSACTIONS TABLE:\n')

  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)

  if (transError) {
    console.error('❌ Error fetching transactions:', transError)
    return
  }

  if (transactions && transactions.length > 0) {
    const sampleTransaction = transactions[0]
    const columns = Object.keys(sampleTransaction)

    console.log('Current columns:', columns.join(', '))
    console.log('')

    // Check for removed columns
    const hasExchangeRate = 'exchange_rate' in sampleTransaction
    const hasTitle = 'title' in sampleTransaction

    console.log('Column removal verification:')
    console.log('  exchange_rate removed:', !hasExchangeRate ? '✅' : '❌ STILL EXISTS')
    console.log('  title removed:', !hasTitle ? '✅' : '❌ STILL EXISTS')
    console.log('')

    // Show expected columns
    const expectedColumns = [
      'id', 'user_id', 'vendor_id', 'payment_method_id',
      'description', 'amount', 'original_currency',
      'transaction_type', 'transaction_date', 'created_at', 'updated_at'
    ]

    const unexpectedColumns = columns.filter(col => !expectedColumns.includes(col))
    if (unexpectedColumns.length > 0) {
      console.log('⚠️  Unexpected columns found:', unexpectedColumns.join(', '))
    } else {
      console.log('✅ Transactions table structure is clean')
    }
    console.log('')
  }

  // Check users table
  console.log('📊 USERS TABLE:\n')

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1)

  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return
  }

  if (users && users.length > 0) {
    const sampleUser = users[0]
    const userColumns = Object.keys(sampleUser)

    console.log('Current columns:', userColumns.join(', '))
    console.log('')

    // Check for removed column
    const hasPreferredCurrency = 'preferred_currency' in sampleUser

    console.log('Column removal verification:')
    console.log('  preferred_currency removed:', !hasPreferredCurrency ? '✅' : '❌ STILL EXISTS')
    console.log('')

    // Show expected columns
    const expectedUserColumns = [
      'id', 'email', 'first_name', 'last_name',
      'avatar_url', 'role', 'created_at', 'updated_at'
    ]

    const unexpectedUserColumns = userColumns.filter(col => !expectedUserColumns.includes(col))
    if (unexpectedUserColumns.length > 0) {
      console.log('⚠️  Unexpected columns found:', unexpectedUserColumns.join(', '))
    } else {
      console.log('✅ Users table structure is clean')
    }
    console.log('')
  }

  // Final summary
  console.log('📋 SUMMARY:\n')

  const allColumnsRemoved = (
    transactions && transactions.length > 0 &&
    !('exchange_rate' in transactions[0]) &&
    !('title' in transactions[0]) &&
    users && users.length > 0 &&
    !('preferred_currency' in users[0])
  )

  if (allColumnsRemoved) {
    console.log('✅ All unused columns successfully removed!')
    console.log('\nNext steps:')
    console.log('  1. Regenerate TypeScript types: npx supabase gen types typescript --project-id uwjmgjqongcrsamprvjr > src/lib/supabase/types.ts')
    console.log('  2. Update database/schema.sql to remove the columns')
    console.log('  3. Run tests: npm run test:unit')
    console.log('  4. Build: npm run build')
  } else {
    console.log('⚠️  Some columns still exist in the database.')
    console.log('Please run the migration: database/migration-remove-unused-columns.sql')
  }
}

verifyColumnRemoval().catch(console.error)
