import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkKyleHarrisDocs() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('=== Checking Kyle Harris Transaction Documents ===\n')

  // First, check what columns exist in transaction_document_matches
  console.log('Checking table schema...')
  const { data: schemaCheck, error: schemaError } = await supabase
    .from('transaction_document_matches')
    .select('*')
    .limit(1)

  if (schemaCheck && schemaCheck.length > 0) {
    console.log('Available columns:', Object.keys(schemaCheck[0]))
    console.log('')
  }

  // Find Kyle Harris transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, vendor:vendors(name)')
    .eq('transaction_date', '2025-09-20')
    .eq('amount', 94.91)

  console.log('Transactions on 9/20/25 for $94.91:')
  transactions?.forEach((t: any) => {
    console.log(`  - ${t.id}: ${t.description} (${t.vendor?.name})`)
  })
  console.log('')

  // Find the Kyle Harris one - check vendor name instead of description
  const kyleTransaction = transactions?.find((t: any) => t.vendor?.name?.includes('Kyle Harris'))

  if (!kyleTransaction) {
    console.log('Kyle Harris transaction not found')
    console.log('Trying to find by description instead...')
    const byDesc = transactions?.find((t: any) => t.description?.includes('Kyle'))
    if (byDesc) {
      console.log('Found by description:', byDesc)
      return
    }
    return
  }

  console.log('Kyle Harris Transaction:', kyleTransaction.id)
  console.log('')

  // Check for matches
  const { data: matches } = await supabase
    .from('transaction_document_matches')
    .select('*')
    .eq('transaction_id', kyleTransaction.id)

  console.log('Transaction Document Matches:', matches?.length || 0)
  if (matches && matches.length > 0) {
    matches.forEach((m: any) => {
      console.log(`  - Match ID: ${m.id}`)
      console.log(`    Document ID: ${m.document_id}`)
      console.log(`    Approved: ${m.approved}`)
      console.log(`    Confidence: ${m.confidence_score}%`)
      console.log('')
    })
  }

  // Check what the useTransactions hook would return
  console.log('Testing full query with foreign key relationships...\n')

  const { data: fullTransaction, error: fullError } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_document_matches!transaction_document_matches_transaction_id_fkey (
        id,
        document_id,
        confidence_score,
        approved,
        created_at,
        documents!transaction_document_matches_document_id_fkey (
          id,
          file_name,
          file_size_bytes,
          file_type,
          mime_type,
          created_at
        )
      )
    `)
    .eq('id', kyleTransaction.id)
    .single()

  if (fullError) {
    console.log('Error fetching full transaction:', fullError)
    return
  }

  console.log('Full transaction with joins:')
  console.log('  Matches array length:', fullTransaction?.transaction_document_matches?.length || 0)

  const approvedMatches = fullTransaction?.transaction_document_matches?.filter((m: any) => m.approved)
  console.log('  Approved matches:', approvedMatches?.length || 0)

  if (approvedMatches && approvedMatches.length > 0) {
    console.log('\nApproved documents:')
    approvedMatches.forEach((m: any) => {
      console.log(`  - ${m.documents?.file_name}`)
      console.log(`    Document ID: ${m.documents?.id}`)
      console.log(`    Confidence: ${m.confidence_score}%`)
    })
  } else {
    console.log('\n❌ No approved matches found!')
    console.log('\nDebugging: All matches (including unapproved):')
    fullTransaction?.transaction_document_matches?.forEach((m: any) => {
      console.log(`  - Document: ${m.documents?.file_name}`)
      console.log(`    Approved: ${m.approved}`)
      console.log(`    Confidence: ${m.confidence_score}%`)
    })
  }
}

checkKyleHarrisDocs()
