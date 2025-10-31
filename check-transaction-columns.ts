import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkColumns() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)
    .single()

  if (data) {
    console.log('Transaction table columns:')
    Object.keys(data).forEach(key => {
      console.log(`  - ${key}: ${typeof data[key]}`)
    })
  }
}

checkColumns()
