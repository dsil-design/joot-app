import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkMatchUserId() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data } = await supabase
    .from('transaction_document_matches')
    .select('id, user_id, approved, transaction_id, document_id')
    .eq('id', 'a25bbc5e-a3ff-4971-ac1d-d75b72334c0d')
    .single()

  console.log('Match record:')
  console.log('  ID:', data?.id)
  console.log('  User ID:', data?.user_id)
  console.log('  Approved:', data?.approved)
  console.log('  Transaction ID:', data?.transaction_id)
  console.log('  Document ID:', data?.document_id)
  console.log('')

  // Also check the transaction's user_id
  const { data: txn } = await supabase
    .from('transactions')
    .select('id, user_id')
    .eq('id', data?.transaction_id)
    .single()

  console.log('Transaction:')
  console.log('  ID:', txn?.id)
  console.log('  User ID:', txn?.user_id)
  console.log('')

  console.log('User IDs match?', data?.user_id === txn?.user_id)
}

checkMatchUserId()
