#!/usr/bin/env node

/**
 * Check exchange_rates table schema
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkSchema() {
  console.log('🔍 Checking exchange_rates schema...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Get a sample row to see all columns
    const { data: sample } = await supabase
      .from('exchange_rates')
      .select('*')
      .limit(1)
      .single()

    if (sample) {
      console.log('📋 Sample row columns:')
      Object.keys(sample).forEach(key => {
        console.log(`   - ${key}: ${typeof sample[key]} = ${sample[key]}`)
      })
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

checkSchema().catch(console.error)
