#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * 
 * This script validates that Supabase is properly configured and connected.
 * Run with: node scripts/test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n')

  // Check environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables:')
    if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('\nPlease check your .env.local file')
    process.exit(1)
  }

  console.log('✅ Environment variables found')
  console.log(`   URL: ${supabaseUrl}`)
  console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`)

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Test 1: Basic connection
    console.log('\n🔗 Testing basic connection...')
    const { data: healthCheck, error: healthError } = await supabase
      .from('exchange_rates')
      .select('count')
      .limit(1)

    if (healthError) {
      console.error('❌ Connection failed:', healthError.message)
      process.exit(1)
    }
    console.log('✅ Basic connection successful')

    // Test 2: Check tables exist
    console.log('\n📋 Checking database tables...')
    const tables = ['users', 'transactions', 'transaction_categories', 'exchange_rates']
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.error(`❌ Table '${table}' error:`, error.message)
        } else {
          console.log(`✅ Table '${table}' exists and accessible`)
        }
      } catch (err) {
        console.error(`❌ Table '${table}' check failed:`, err.message)
      }
    }

    // Test 3: Check RLS policies
    console.log('\n🛡️  Testing Row Level Security...')
    try {
      // This should fail without authentication (which is good - means RLS is working)
      const { data, error } = await supabase.from('users').select('*').limit(1)
      
      if (error && error.code === 'PGRST116') {
        console.log('✅ RLS is properly configured (no access without auth)')
      } else if (error) {
        console.log('⚠️  RLS test inconclusive:', error.message)
      } else {
        console.log('⚠️  RLS might not be configured (got data without auth)')
      }
    } catch (err) {
      console.log('⚠️  RLS test error:', err.message)
    }

    // Test 4: Check exchange rates data
    console.log('\n💱 Checking exchange rates data...')
    const { data: rates, error: ratesError } = await supabase
      .from('exchange_rates')
      .select('*')
      .limit(5)

    if (ratesError) {
      console.error('❌ Exchange rates error:', ratesError.message)
    } else {
      console.log(`✅ Found ${rates.length} exchange rate records`)
      if (rates.length > 0) {
        console.log('   Sample rate:', rates[0])
      }
    }

    console.log('\n🎉 Supabase connection test completed!')
    console.log('\nNext steps:')
    console.log('1. Start your development server: npm run dev')
    console.log('2. Visit http://localhost:3000/login to test authentication')
    console.log('3. Create a test account and verify the dashboard loads')

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error)
    process.exit(1)
  }
}

// Run the test
testConnection().catch(console.error)
