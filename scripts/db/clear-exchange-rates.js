#!/usr/bin/env node

/**
 * Clear all exchange rates to start fresh
 * This is safe because the current rates are all wrong (same value)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function clearExchangeRates() {
  console.log('🗑️  Clearing exchange rates...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // First, check how many we're deleting
    const { count } = await supabase
      .from('exchange_rates')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 Found ${count} exchange rates`)
    console.log('⚠️  These will be deleted and replaced with fresh ECB data\n')

    // Delete all exchange rates
    const { error } = await supabase
      .from('exchange_rates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using a condition that's always true)

    if (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }

    console.log('✅ All exchange rates cleared!')
    console.log('\n💡 Now run the sync again to populate with fresh data:')
    console.log('   node scripts/db/trigger-manual-sync.js')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

clearExchangeRates().catch(console.error)
