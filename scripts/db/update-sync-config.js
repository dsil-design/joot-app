#!/usr/bin/env node

/**
 * Update sync configuration start date
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function updateSyncConfig(startDate) {
  console.log('⚙️  Updating sync configuration...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Update the sync configuration
    const { data, error } = await supabase
      .from('sync_configuration')
      .update({
        start_date: startDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      .select()
      .single()

    if (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }

    console.log('✅ Sync configuration updated!')
    console.log(`   New start date: ${data.start_date}`)
    console.log(`   Auto sync: ${data.auto_sync_enabled ? 'Enabled' : 'Disabled'}`)
    console.log(`   Sync time: ${data.sync_time}`)

    // Also mark the stuck sync as failed
    console.log('\n🔧 Cleaning up stuck sync record...')
    const { error: updateError } = await supabase
      .from('sync_history')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Timeout - exceeded Vercel 5-minute limit'
      })
      .eq('status', 'running')

    if (!updateError) {
      console.log('✅ Cleaned up stuck sync records')
    }

    console.log('\n🎯 Configuration updated successfully!')
    console.log('💡 Now you can trigger the sync again - it should complete within 5 minutes')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

// Get start date from command line or use default
const startDate = process.argv[2] || '2024-01-01'

console.log(`Setting start date to: ${startDate}`)
console.log('(This will sync approximately 2 years of data)\n')

updateSyncConfig(startDate).catch(console.error)
