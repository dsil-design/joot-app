const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('Starting migration...')
    
    // First, create a test user if none exists
    console.log('Checking for existing users...')
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    let userId
    if (!existingUsers || existingUsers.length === 0) {
      console.log('Creating test user...')
      const { data: newUser, error: userError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123'
      })
      
      if (userError && !userError.message.includes('already registered')) {
        console.error('Error creating user:', userError)
        return
      }
      
      // Get the user ID from the auth response or query the users table
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (!users || users.length === 0) {
        console.error('No users found after creation')
        return
      }
      userId = users[0].id
    } else {
      userId = existingUsers[0].id
    }
    
    console.log('User ID:', userId)
    
    // Create vendors for the user
    console.log('Adding vendors...')
    const vendors = [
      'McDonald\'s', 'Pizza Hut', 'Subway', 'Whole Foods', 'Trader Joe\'s',
      'Costco', 'Amazon', 'Target', 'Best Buy', 'Nike',
      'Uber', 'Lyft', 'Netflix', 'Spotify', 'Gym Membership',
      'Electric Company', 'Internet Provider', 'Phone Company', 'Shell', 'Chevron'
    ]
    
    for (const vendorName of vendors) {
      const { error } = await supabase
        .from('vendors')
        .upsert({ name: vendorName, user_id: userId }, { onConflict: 'name,user_id' })
      
      if (error) {
        console.error(`Error adding vendor ${vendorName}:`, error)
      }
    }
    
    console.log('Vendors added successfully!')
    
    // Check the result
    const { data: vendorCount } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    console.log(`Total vendors for user: ${vendorCount?.length || 'unknown'}`)
    
    // Sample some vendors
    const { data: sampleVendors } = await supabase
      .from('vendors')
      .select('name')
      .eq('user_id', userId)
      .limit(5)
    
    console.log('Sample vendors:', sampleVendors?.map(v => v.name))
    
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration error:', error)
  }
}

runMigration()