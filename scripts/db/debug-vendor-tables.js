import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugTables() {
  console.log('🔍 Debugging vendor and payment method tables...\n')

  try {
    // Check vendors table
    console.log('📋 Testing vendors table...')
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .limit(5)

    if (vendorsError) {
      console.error('❌ Vendors table error:', vendorsError.message)
    } else {
      console.log(`✅ Vendors table accessible, found ${vendors?.length || 0} records`)
      if (vendors && vendors.length > 0) {
        console.log('   Sample vendor:', vendors[0])
      }
    }

    // Check payment_methods table
    console.log('\n📋 Testing payment_methods table...')
    const { data: paymentMethods, error: paymentError } = await supabase
      .from('payment_methods')
      .select('*')
      .limit(5)

    if (paymentError) {
      console.error('❌ Payment methods table error:', paymentError.message)
    } else {
      console.log(`✅ Payment methods table accessible, found ${paymentMethods?.length || 0} records`)
      if (paymentMethods && paymentMethods.length > 0) {
        console.log('   Sample payment method:', paymentMethods[0])
      }
    }

    // Test authentication
    console.log('\n🔐 Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('ℹ️  No authenticated user (expected for this test)')
    } else if (user) {
      console.log('✅ User authenticated:', user.email)
      
      // Test user-specific data
      console.log('\n👤 Testing user-specific vendor data...')
      const { data: userVendors, error: userVendorsError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .limit(5)

      if (userVendorsError) {
        console.error('❌ User vendors error:', userVendorsError.message)
      } else {
        console.log(`✅ Found ${userVendors?.length || 0} vendors for user`)
      }
    } else {
      console.log('ℹ️  No authenticated user')
    }

    // Test transactions table structure
    console.log('\n📋 Testing transactions table structure...')
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, vendor_id, payment_method_id, vendor, payment_method')
      .limit(1)

    if (transactionsError) {
      console.error('❌ Transactions table error:', transactionsError.message)
    } else {
      console.log('✅ Transactions table accessible')
      if (transactions && transactions.length > 0) {
        console.log('   Sample transaction structure:', transactions[0])
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

debugTables()
