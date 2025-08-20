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

async function setupDefaultData() {
  console.log('🔍 Checking users and setting up default data...\n')

  try {
    // Check if there are any users
    console.log('👤 Checking users...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5)

    if (usersError) {
      console.error('❌ Users table error:', usersError.message)
      return
    }

    console.log(`✅ Found ${users?.length || 0} users`)
    if (users && users.length > 0) {
      console.log('Sample user:', users[0])
    }

    if (!users || users.length === 0) {
      console.log('\n⚠️  No users found. You need to:')
      console.log('  1. Start your dev server: npm run dev')
      console.log('  2. Go to the login page and create an account')
      console.log('  3. Run this script again after creating an account')
      return
    }

    // Check vendors and payment methods
    const { data: vendors } = await supabase.from('vendors').select('*').limit(5)
    const { data: paymentMethods } = await supabase.from('payment_methods').select('*').limit(5)
    
    console.log(`\n🏪 Vendors: ${vendors?.length || 0}`)
    console.log(`💳 Payment Methods: ${paymentMethods?.length || 0}`)

    if (vendors?.length === 0 || paymentMethods?.length === 0) {
      console.log('\n🔧 Creating default vendors and payment methods...')
      
      // We need to create default data for existing users
      for (const user of users) {
        console.log(`\n👤 Setting up data for user: ${user.email}`)
        
        // Create vendors
        const vendorNames = [
          'McDonald\'s', 'Starbucks', 'Amazon', 'Target', 'Uber', 
          'Netflix', 'Shell', 'Whole Foods', 'Gym Membership', 'Electric Company'
        ]
        
        for (const vendorName of vendorNames) {
          const { error: vendorError } = await supabase
            .from('vendors')
            .insert({ name: vendorName, user_id: user.id })
          
          if (vendorError && !vendorError.message.includes('duplicate')) {
            console.error(`❌ Error creating vendor ${vendorName}:`, vendorError.message)
          }
        }
        
        // Create payment methods
        const paymentMethodNames = [
          'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Mobile Payment'
        ]
        
        for (const methodName of paymentMethodNames) {
          const { error: pmError } = await supabase
            .from('payment_methods')
            .insert({ name: methodName, user_id: user.id })
          
          if (pmError && !pmError.message.includes('duplicate')) {
            console.error(`❌ Error creating payment method ${methodName}:`, pmError.message)
          }
        }
        
        console.log(`✅ Created default data for ${user.email}`)
      }
      
      // Verify the data was created
      const { data: newVendors } = await supabase.from('vendors').select('*')
      const { data: newPaymentMethods } = await supabase.from('payment_methods').select('*')
      
      console.log(`\n🎉 Setup complete!`)
      console.log(`  Vendors: ${newVendors?.length || 0}`)
      console.log(`  Payment Methods: ${newPaymentMethods?.length || 0}`)
    } else {
      console.log('\n✅ Default data already exists!')
    }

    // Add exchange rates if missing
    console.log('\n💱 Checking exchange rates...')
    const { data: rates } = await supabase
      .from('exchange_rates')
      .select('*')
      .limit(1)

    if (!rates || rates.length === 0) {
      console.log('Creating default exchange rates...')
      await supabase.from('exchange_rates').insert([
        { from_currency: 'USD', to_currency: 'THB', rate: 35.50, date: new Date().toISOString().split('T')[0] },
        { from_currency: 'THB', to_currency: 'USD', rate: 0.0282, date: new Date().toISOString().split('T')[0] }
      ])
      console.log('✅ Exchange rates created')
    } else {
      console.log('✅ Exchange rates already exist')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

setupDefaultData()
