import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function triggerReprocess() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get latest document
  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('processing_status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!doc) {
    console.log('No document found')
    return
  }

  console.log('Triggering reprocess for:', doc.file_name)
  console.log('Document ID:', doc.id)
  console.log('')
  console.log('Call the process endpoint via the UI or make an authenticated request')
  console.log(`POST http://localhost:3000/api/documents/${doc.id}/process-complete`)
}

triggerReprocess()
