#!/usr/bin/env node

/**
 * Quick script to check if currency_configuration table exists
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function checkCurrencyConfigTable() {
  console.log('🔍 Checking for currency_configuration table...\n')

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Try to query the currency_configuration table
    const { data, error } = await supabase
      .from('currency_configuration')
      .select('currency_code, display_name, is_tracked')
      .limit(5)

    if (error) {
      console.log('❌ currency_configuration table does NOT exist')
      console.log('Error:', error.message)
      console.log('\n💡 The table needs to be created in Supabase.')
      return false
    } else {
      console.log('✅ currency_configuration table EXISTS')
      console.log(`Found ${data.length} currency records`)
      if (data.length > 0) {
        console.log('Sample data:', data.slice(0, 3))
      }
      return true
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    return false
  }
}

checkCurrencyConfigTable().catch(console.error)
