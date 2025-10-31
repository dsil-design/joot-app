import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkLatest() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get latest completed document
  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('processing_status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!doc) {
    console.log('No completed documents found')
    return
  }

  console.log('📄 Latest Completed Document:')
  console.log('  File:', doc.file_name)
  console.log('  ID:', doc.id)
  console.log('  Updated:', doc.updated_at)
  console.log('')

  // Get extraction
  const { data: extraction } = await supabase
    .from('document_extractions')
    .select('*')
    .eq('document_id', doc.id)
    .single()

  if (extraction) {
    console.log('📊 Extraction:')
    console.log('  Merchant:', extraction.merchant_name || extraction.vendor_name)
    console.log('  Amount:', extraction.amount)
    console.log('  Date:', extraction.transaction_date)
    console.log('')
  }

  // Get matches
  const { data: matches } = await supabase
    .from('transaction_document_matches')
    .select('*, transaction:transactions(*, vendor:vendors(name))')
    .eq('document_id', doc.id)

  console.log(`🔗 Matches: ${matches?.length || 0}`)
  if (matches && matches.length > 0) {
    matches.forEach((m: any) => {
      console.log(`  - ${m.transaction.vendor?.name}: $${m.transaction.amount} (${m.confidence_score}% confidence)`)
    })
  }
  console.log('')

  // Check reconciliation
  const { data: recon } = await supabase
    .from('reconciliation_queue')
    .select('*')
    .eq('document_id', doc.id)

  console.log(`📋 In Reconciliation Queue: ${recon && recon.length > 0 ? 'Yes' : 'No'}`)
}

checkLatest()
