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

async function checkSchema() {
  console.log('🔍 Checking database schema...\n')

  try {
    // Get transactions table schema by trying to select different columns
    console.log('📋 Checking transactions table columns...')
    
    const columnsToTest = [
      'id', 'user_id', 'title', 'description', 'amount_usd', 'amount_thb',
      'vendor', 'vendor_id', 'payment_method', 'payment_method_id',
      'transaction_type', 'original_currency', 'exchange_rate',
      'transaction_date', 'created_at', 'updated_at'
    ]
    
    for (const column of columnsToTest) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select(column)
          .limit(1)
        
        if (error) {
          console.log(`❌ Column '${column}' does not exist: ${error.message}`)
        } else {
          console.log(`✅ Column '${column}' exists`)
        }
      } catch (err) {
        console.log(`❌ Column '${column}' test failed: ${err.message}`)
      }
    }

    // Check if there are any existing transactions
    console.log('\n📊 Checking existing data...')
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id, vendor, payment_method')
      .limit(5)

    if (transError) {
      console.error('❌ Cannot query transactions:', transError.message)
    } else {
      console.log(`✅ Found ${transactions?.length || 0} transactions`)
      if (transactions && transactions.length > 0) {
        console.log('Sample transaction:', transactions[0])
      }
    }

    // Check vendors table
    console.log('\n🏪 Checking vendors table...')
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, user_id')
      .limit(3)

    if (vendorError) {
      console.error('❌ Vendors table error:', vendorError.message)
    } else {
      console.log(`✅ Vendors table exists with ${vendors?.length || 0} records`)
    }

    // Check payment_methods table
    console.log('\n💳 Checking payment_methods table...')
    const { data: paymentMethods, error: pmError } = await supabase
      .from('payment_methods')
      .select('id, name, user_id')
      .limit(3)

    if (pmError) {
      console.error('❌ Payment methods table error:', pmError.message)
    } else {
      console.log(`✅ Payment methods table exists with ${paymentMethods?.length || 0} records`)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

checkSchema()
