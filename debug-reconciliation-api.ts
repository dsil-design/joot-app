import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function debugReconciliation() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const documentId = '043eca4b-9294-468a-9d3a-cab3d88b5e1a'

  console.log('=== Debugging Reconciliation API ===\n')

  // Step 1: Get the queue item
  console.log('Step 1: Get reconciliation queue item...')
  const { data: queueItem, error: queueError } = await supabase
    .from('reconciliation_queue')
    .select('*')
    .eq('document_id', documentId)
    .single()

  if (queueError) {
    console.error('Queue error:', queueError)
    return
  }

  console.log('Queue item found:')
  console.log('  ID:', queueItem.id)
  console.log('  Document ID:', queueItem.document_id)
  console.log('  Status:', queueItem.status)
  console.log('')

  // Step 2: Get matches directly
  console.log('Step 2: Get matches directly...')
  const { data: directMatches, error: directError } = await supabase
    .from('transaction_document_matches')
    .select('*')
    .eq('document_id', documentId)

  console.log('Direct query result:')
  console.log('  Error:', directError)
  console.log('  Count:', directMatches?.length || 0)
  if (directMatches && directMatches.length > 0) {
    console.log('  First match:', JSON.stringify(directMatches[0], null, 2))
  }
  console.log('')

  // Step 3: Get matches with transaction join
  console.log('Step 3: Get matches with transaction join...')
  const { data: joinMatches, error: joinError } = await supabase
    .from('transaction_document_matches')
    .select(`
      id,
      transaction_id,
      confidence_score,
      match_type,
      metadata,
      transactions!inner (
        id,
        description,
        amount,
        original_currency,
        transaction_date
      )
    `)
    .eq('document_id', documentId)
    .order('confidence_score', { ascending: false })

  console.log('Join query result:')
  console.log('  Error:', joinError)
  console.log('  Count:', joinMatches?.length || 0)
  if (joinMatches && joinMatches.length > 0) {
    console.log('  First match:', JSON.stringify(joinMatches[0], null, 2))
  }
  console.log('')

  // Step 4: Check if transactions exist
  console.log('Step 4: Check if transactions exist...')
  if (directMatches && directMatches.length > 0) {
    const transactionIds = directMatches.map(m => m.transaction_id)
    console.log('  Transaction IDs from matches:', transactionIds)

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id, description, amount, transaction_date')
      .in('id', transactionIds)

    console.log('  Transactions found:', transactions?.length || 0)
    if (transactions) {
      transactions.forEach(t => {
        console.log(`    - ${t.id}: ${t.description} ($${t.amount})`)
      })
    }
    console.log('  Error:', transError)
  }
}

debugReconciliation()
