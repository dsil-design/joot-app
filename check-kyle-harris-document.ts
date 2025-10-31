import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkKyleHarrisDocument() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('=== Kyle Harris Document Details ===\n')

  // Get the document with extraction data
  const { data: doc } = await supabase
    .from('documents')
    .select(`
      *,
      document_extractions (
        merchant_name,
        amount,
        currency,
        transaction_date,
        extraction_confidence,
        raw_text
      )
    `)
    .eq('id', '043eca4b-9294-468a-9d3a-cab3d88b5e1a')
    .single()

  if (!doc) {
    console.log('Document not found')
    return
  }

  console.log('Document Information:')
  console.log(`  - File Name: ${doc.file_name}`)
  console.log(`  - File Type: ${doc.file_type}`)
  console.log(`  - File Size: ${(doc.file_size_bytes / 1024).toFixed(2)} KB`)
  console.log(`  - Upload Date: ${new Date(doc.created_at).toLocaleDateString()}`)
  console.log(`  - Processing Status: ${doc.processing_status}`)
  console.log('')

  if (doc.document_extractions && doc.document_extractions.length > 0) {
    const extraction = doc.document_extractions[0]
    console.log('Extracted Data:')
    console.log(`  - Merchant: ${extraction.merchant_name || 'N/A'}`)
    console.log(`  - Amount: ${extraction.amount || 'N/A'} ${extraction.currency || ''}`)
    console.log(`  - Date: ${extraction.transaction_date || 'N/A'}`)
    console.log(`  - Extraction Confidence: ${extraction.extraction_confidence || 'N/A'}%`)
    console.log('')

    if (extraction.raw_text) {
      console.log('Raw Text Preview (first 500 chars):')
      console.log(extraction.raw_text.substring(0, 500))
      console.log('...')
    }
  } else {
    console.log('No extraction data found')
  }
}

checkKyleHarrisDocument()
