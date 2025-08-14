const { createClient } = require('@supabase/supabase-js')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('Starting migration...')
    
    // Generate a test user ID
    const testUserId = uuidv4()
    console.log('Test user ID:', testUserId)
    
    // Insert a test user directly into the users table
    console.log('Creating test user...')
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      })
      .select()
    
    if (userError) {
      console.error('Error creating user:', userError)
      // Try to proceed with existing users if creation fails
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (!existingUsers || existingUsers.length === 0) {
        console.error('No users available for migration')
        return
      }
      console.log('Using existing user:', existingUsers[0].id)
      testUserId = existingUsers[0].id
    } else {
      console.log('Test user created successfully')
    }
    
    // Create vendors for the user
    console.log('Adding vendors...')
    const vendors = [
      'McDonald\'s', 'Pizza Hut', 'Subway', 'Whole Foods', 'Trader Joe\'s',
      'Costco', 'Amazon', 'Target', 'Best Buy', 'Nike',
      'Uber', 'Lyft', 'Netflix', 'Spotify', 'Gym Membership',
      'Electric Company', 'Internet Provider', 'Phone Company', 'Shell', 'Chevron'
    ]
    
    const vendorInserts = vendors.map(name => ({
      id: uuidv4(),
      name: name,
      user_id: testUserId
    }))
    
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .upsert(vendorInserts, { onConflict: 'name,user_id' })
      .select()
    
    if (vendorError) {
      console.error('Error adding vendors:', vendorError)
      return
    }
    
    console.log(`Successfully added ${vendorData?.length || vendors.length} vendors!`)
    
    // Verify the data
    const { data: allVendors } = await supabase
      .from('vendors')
      .select('name')
      .eq('user_id', testUserId)
    
    console.log('Vendors in database:', allVendors?.map(v => v.name))
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration error:', error)
  }
}

runMigration()