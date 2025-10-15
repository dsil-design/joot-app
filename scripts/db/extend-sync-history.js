#!/usr/bin/env node

/**
 * Extend sync history by going back 2 more years
 * This allows incremental backfilling of historical exchange rates
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const MIN_DATE = '2016-01-01' // We only need data back to 2016

async function extendSyncHistory() {
  console.log('⏪ Extending sync history by 2 years...\n')

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
    // Get current configuration
    const { data: config, error: fetchError } = await supabase
      .from('sync_configuration')
      .select('*')
      .single()

    if (fetchError) {
      console.error('❌ Error fetching config:', fetchError.message)
      process.exit(1)
    }

    const currentStartDate = new Date(config.start_date)
    console.log(`📅 Current start date: ${config.start_date}`)

    // Calculate new start date (2 years earlier)
    const newStartDate = new Date(currentStartDate)
    newStartDate.setFullYear(newStartDate.getFullYear() - 2)

    // Don't go earlier than MIN_DATE
    const minDate = new Date(MIN_DATE)
    if (newStartDate < minDate) {
      newStartDate.setTime(minDate.getTime())
    }

    const newStartDateStr = newStartDate.toISOString().split('T')[0]

    // Check if we're already at the minimum
    if (config.start_date <= MIN_DATE) {
      console.log('✅ Already at minimum date (2016-01-01)')
      console.log('   No need to extend further!')
      return
    }

    console.log(`📅 New start date: ${newStartDateStr}`)
    console.log(`📊 This will add approximately 2 more years of data\n`)

    // Update the configuration
    const { data, error: updateError } = await supabase
      .from('sync_configuration')
      .update({
        start_date: newStartDateStr,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating config:', updateError.message)
      process.exit(1)
    }

    console.log('✅ Configuration updated successfully!\n')
    console.log('📋 Next steps:')
    console.log('   1. Run: node scripts/db/trigger-manual-sync.js')
    console.log('   2. Wait for sync to complete (1-2 minutes)')

    if (newStartDateStr > MIN_DATE) {
      console.log('   3. Run this script again to go back another 2 years')
      console.log(`   4. Repeat until start date reaches ${MIN_DATE}`)
    } else {
      console.log('   3. You\'re done! All historical data back to 2016 will be synced')
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

extendSyncHistory().catch(console.error)
