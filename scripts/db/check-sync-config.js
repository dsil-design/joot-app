#!/usr/bin/env node

/**
 * Check sync_configuration table
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkSyncConfig() {
  console.log('🔍 Checking sync_configuration table...\n')

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
    // Check if table exists and has data
    const { data, error } = await supabase
      .from('sync_configuration')
      .select('*')
      .single()

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ sync_configuration table does NOT exist')
        console.log('\n💡 You need to apply the migration:')
        console.log('   database/migrations/20250821_add_sync_configuration.sql')
      } else if (error.code === 'PGRST116') {
        console.log('⚠️  sync_configuration table exists but is EMPTY')
        console.log('\n💡 The table needs to be populated with default config')
      } else {
        console.log('❌ Error:', error.message)
      }
      return false
    }

    console.log('✅ sync_configuration table EXISTS and has data\n')
    console.log('Configuration:')
    console.log(`   Start Date: ${data.start_date}`)
    console.log(`   Auto Sync: ${data.auto_sync_enabled ? 'Enabled' : 'Disabled'}`)
    console.log(`   Sync Time: ${data.sync_time}`)
    console.log(`   Max Retries: ${data.max_retries}`)

    return true

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    return false
  }
}

checkSyncConfig().catch(console.error)
