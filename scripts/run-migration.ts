#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

async function runMigration() {
  console.log('🔍 Checking current table structure...\n')

  // Check current structure
  const { data: columns, error: columnsError } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)

  if (columnsError) {
    console.error('Error checking table:', columnsError)
    return
  }

  if (columns && columns.length > 0) {
    console.log('Sample transaction before migration:')
    console.log(JSON.stringify(columns[0], null, 2))
    console.log('\n')
  }

  // Count transactions
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })

  if (!countError) {
    console.log(`📊 Found ${count} transactions in the database\n`)
  }

  console.log('📝 Reading migration file...\n')

  // Read migration file
  const migrationPath = path.join(__dirname, '../database/migration-refactor-transaction-amounts.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('⚠️  This migration will:')
  console.log('  1. Add a new "amount" column')
  console.log('  2. Copy data from amount_usd or amount_thb based on original_currency')
  console.log('  3. Drop the old amount_usd and amount_thb columns')
  console.log('\n❓ Do you want to proceed? (This script is read-only, you need to run the SQL manually)\n')

  console.log('To run the migration, execute this SQL:\n')
  console.log('─'.repeat(80))
  console.log(migrationSQL)
  console.log('─'.repeat(80))
  console.log('\nYou can run this via:')
  console.log('  1. Supabase Dashboard > SQL Editor')
  console.log('  2. psql command: psql <connection-string> < database/migration-refactor-transaction-amounts.sql')
  console.log('  3. npx supabase db execute --file database/migration-refactor-transaction-amounts.sql')
}

runMigration().catch(console.error)
