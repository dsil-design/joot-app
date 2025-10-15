#!/usr/bin/env node

/**
 * Populate currency_configuration table with initial data
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use service role key for admin operations
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('\n💡 Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
  console.error('   You can find it in: Supabase Dashboard → Settings → API → service_role key')
  process.exit(1)
}

const currencies = [
  // Currently tracked currencies (enabled by default)
  { currency_code: 'USD', display_name: 'US Dollar', currency_symbol: '$', source: 'ECB', is_crypto: false, is_tracked: true, decimal_places: 2 },
  { currency_code: 'EUR', display_name: 'Euro', currency_symbol: '€', source: 'ECB', is_crypto: false, is_tracked: true, decimal_places: 2 },
  { currency_code: 'GBP', display_name: 'British Pound', currency_symbol: '£', source: 'ECB', is_crypto: false, is_tracked: true, decimal_places: 2 },
  { currency_code: 'THB', display_name: 'Thai Baht', currency_symbol: '฿', source: 'ECB', is_crypto: false, is_tracked: true, decimal_places: 2 },
  { currency_code: 'SGD', display_name: 'Singapore Dollar', currency_symbol: 'S$', source: 'ECB', is_crypto: false, is_tracked: true, decimal_places: 2 },
  { currency_code: 'MYR', display_name: 'Malaysian Ringgit', currency_symbol: 'RM', source: 'ECB', is_crypto: false, is_tracked: true, decimal_places: 2 },
  { currency_code: 'BTC', display_name: 'Bitcoin', currency_symbol: '₿', source: 'COINGECKO', is_crypto: true, is_tracked: true, decimal_places: 8 },

  // Other available ECB currencies (disabled by default)
  { currency_code: 'AUD', display_name: 'Australian Dollar', currency_symbol: 'A$', source: 'ECB', is_crypto: false, is_tracked: false, decimal_places: 2 },
  { currency_code: 'CAD', display_name: 'Canadian Dollar', currency_symbol: 'C$', source: 'ECB', is_crypto: false, is_tracked: false, decimal_places: 2 },
  { currency_code: 'CHF', display_name: 'Swiss Franc', currency_symbol: 'Fr', source: 'ECB', is_crypto: false, is_tracked: false, decimal_places: 2 },
  { currency_code: 'CNY', display_name: 'Chinese Yuan', currency_symbol: '¥', source: 'ECB', is_crypto: false, is_tracked: false, decimal_places: 2 },
  { currency_code: 'JPY', display_name: 'Japanese Yen', currency_symbol: '¥', source: 'ECB', is_crypto: false, is_tracked: false, decimal_places: 0 },
  { currency_code: 'KRW', display_name: 'South Korean Won', currency_symbol: '₩', source: 'ECB', is_crypto: false, is_tracked: false, decimal_places: 0 },
]

async function populateCurrencyConfig() {
  console.log('💰 Populating currency_configuration table...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Insert currencies
    const { data, error } = await supabase
      .from('currency_configuration')
      .upsert(currencies, {
        onConflict: 'currency_code',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('❌ Failed to insert currencies:', error.message)
      process.exit(1)
    }

    console.log(`✅ Successfully populated ${data?.length || currencies.length} currencies`)

    // Verify tracked currencies
    const { data: tracked, error: trackedError } = await supabase
      .from('currency_configuration')
      .select('currency_code, display_name, is_tracked')
      .eq('is_tracked', true)
      .order('currency_code')

    if (trackedError) {
      console.warn('⚠️  Could not verify tracked currencies:', trackedError.message)
    } else {
      console.log('\n📊 Tracked currencies:')
      tracked?.forEach(c => {
        console.log(`   ${c.currency_code} - ${c.display_name}`)
      })
    }

    console.log('\n✨ Currency configuration ready!')
    console.log('Next step: Check sync_configuration table and trigger a sync')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    process.exit(1)
  }
}

populateCurrencyConfig().catch(console.error)
