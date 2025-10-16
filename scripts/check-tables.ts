import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkTables() {
  try {
    console.log('Checking if tags table exists...')

    // Try to query the tags table
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .limit(1)

    if (tagsError) {
      console.error('❌ Tags table does not exist or has an error:', tagsError.message)
    } else {
      console.log('✅ Tags table exists!')
      console.log('Sample data:', tagsData)
    }

    // Try to query the transaction_tags table
    const { data: ttData, error: ttError } = await supabase
      .from('transaction_tags')
      .select('*')
      .limit(1)

    if (ttError) {
      console.error('❌ Transaction_tags table does not exist or has an error:', ttError.message)
    } else {
      console.log('✅ Transaction_tags table exists!')
      console.log('Sample data:', ttData)
    }

  } catch (error) {
    console.error('Failed to check tables:', error)
    process.exit(1)
  }
}

checkTables()
