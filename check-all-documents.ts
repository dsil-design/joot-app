import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkAll() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(5)

  if (!docs || docs.length === 0) {
    console.log('No documents found')
    return
  }

  console.log(`Found ${docs.length} recent documents:\n`)

  docs.forEach((doc, idx) => {
    console.log(`${idx + 1}. ${doc.file_name}`)
    console.log(`   ID: ${doc.id}`)
    console.log(`   Status: ${doc.processing_status}`)
    console.log(`   Error: ${doc.processing_error || 'none'}`)
    console.log(`   Updated: ${doc.updated_at}`)
    console.log('')
  })
}

checkAll()
