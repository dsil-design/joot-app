#!/usr/bin/env node

/**
 * Apply exchange rate nullable migration
 * This fixes the critical issue where transactions cannot be saved
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function applyMigration() {
  console.log('📦 Applying exchange_rate nullable migration...\n')
  console.log('🔧 This fixes the critical issue preventing transaction saves\n')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/20251015000000_make_exchange_rate_nullable.sql')

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Migration SQL:')
    console.log('─'.repeat(60))
    console.log(migrationSQL)
    console.log('─'.repeat(60))
    console.log()

    console.log('⚠️  Supabase JS client does not support raw SQL execution.')
    console.log('📋 Please apply this migration manually:\n')
    console.log('1. Go to: https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/sql')
    console.log('2. Copy the SQL above')
    console.log('3. Paste and run it in the SQL Editor')
    console.log()
    console.log('Or run this command to copy the SQL to clipboard:')
    console.log(`   cat ${migrationPath} | pbcopy`)
    console.log()

    // Try to verify current state
    console.log('🔍 Checking current schema...\n')

    const { data: schemaInfo, error: schemaError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1)

    if (schemaError) {
      console.log('⚠️  Could not query transactions table:', schemaError.message)
    } else {
      console.log('✅ Transactions table is accessible')
      console.log(`   Found ${schemaInfo.length} record(s) in sample query`)
    }

    console.log('\n⏳ After applying the migration manually, transactions will save successfully!')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

applyMigration().catch(console.error)
