import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkFields() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data } = await supabase
    .from('transaction_document_matches')
    .select('*')
    .eq('document_id', '043eca4b-9294-468a-9d3a-cab3d88b5e1a')
    .limit(1)
    .single()

  if (data) {
    console.log('Match record fields:', Object.keys(data))
    console.log('\nFull record:')
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log('No matches found for this document')
  }
}

checkFields()
