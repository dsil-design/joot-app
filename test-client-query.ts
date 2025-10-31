import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use the ANON key (client-side key) instead of service role to simulate RLS
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testClientQuery() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('=== Testing Client-Side Query with RLS ===\n')

  // First, we need to sign in as a user to test RLS
  // Let me check if we can query without auth first
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
    .eq('id', '8b8a8f8e-bd59-41cd-8f18-d52314253819')

  if (error) {
    console.log('❌ Error (this is expected without auth):', error.message)
    console.log('')
    console.log('This means RLS is working. Client needs to be authenticated.')
    console.log('The frontend should be authenticated when the user is logged in.')
    return
  }

  if (!data || data.length === 0) {
    console.log('No data returned')
    return
  }

  console.log('✅ Query succeeded!')
  console.log('Transaction:', data[0].description)
  console.log('Matches:', data[0].transaction_document_matches?.length || 0)
}

testClientQuery()
