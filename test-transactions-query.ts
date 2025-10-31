import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testTransactionsQuery() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('=== Testing Transactions Query (as used by useTransactions hook) ===\n')

  // Get user ID first
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  if (!users || users.length === 0) {
    console.log('No users found')
    return
  }

  const userId = users[0].id
  console.log('User ID:', userId)
  console.log('')

  // Run the exact query from useTransactions hook
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      vendors!transactions_vendor_id_fkey (
        id,
        name
      ),
      payment_methods!transactions_payment_method_id_fkey (
        id,
        name
      ),
      transaction_tags!transaction_tags_transaction_id_fkey (
        tag_id,
        tags!transaction_tags_tag_id_fkey (
          id,
          name,
          color
        )
      ),
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
          created_at,
          document_extractions!document_extractions_document_id_fkey (
            merchant_name,
            amount,
            currency,
            transaction_date
          )
        )
      )
    `)
    .eq('user_id', userId)
    .eq('id', '8b8a8f8e-bd59-41cd-8f18-d52314253819')
    .order('transaction_date', { ascending: false })

  if (error) {
    console.log('Error:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('No transactions found')
    return
  }

  const transaction = data[0]

  console.log('Transaction:', transaction.description)
  console.log('Date:', transaction.transaction_date)
  console.log('Amount:', transaction.amount)
  console.log('')

  console.log('Raw transaction_document_matches:')
  console.log(JSON.stringify(transaction.transaction_document_matches, null, 2))
  console.log('')

  // Apply the same transformation as useTransactions
  const attachedDocuments = transaction.transaction_document_matches
    ?.filter((match: any) => match.approved)
    ?.map((match: any) => ({
      ...match.documents,
      match_id: match.id,
      confidence_score: match.confidence_score,
      match_created_at: match.created_at,
      extraction: match.documents?.document_extractions?.[0] || null
    })) || []

  console.log('Transformed attached_documents:')
  console.log(JSON.stringify(attachedDocuments, null, 2))
  console.log('')
  console.log('Attached documents count:', attachedDocuments.length)
}

testTransactionsQuery()
