import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getEmailContent() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('=== Downloading Kyle Harris Email ===\n')

  // Get the document details first
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, file_name')
    .eq('id', '043eca4b-9294-468a-9d3a-cab3d88b5e1a')
    .single()

  if (!doc) {
    console.log('Document not found')
    return
  }

  console.log(`Storage Path: ${doc.storage_path}`)
  console.log(`File Name: ${doc.file_name}`)
  console.log('')

  // Download the file from storage
  const { data, error } = await supabase.storage
    .from('documents')
    .download(doc.storage_path)

  if (error) {
    console.log('Error downloading file:', error)
    return
  }

  // Convert blob to text
  const text = await data.text()

  console.log('Email Content:')
  console.log('='.repeat(80))
  console.log(text)
  console.log('='.repeat(80))
}

getEmailContent()
