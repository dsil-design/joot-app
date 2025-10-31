import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkRLS() {
  const serviceClient = createClient(supabaseUrl, supabaseKey)

  const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'

  console.log('Testing transaction queries with service role client...\n')

  // Query 1: Direct query with service role (bypasses RLS)
  const { data: allTransactions, error: error1 } = await serviceClient
    .from('transactions')
    .select(`
      *,
      vendor:vendors(id, name),
      payment_method:payment_methods(id, name)
    `)
    .eq('user_id', userId)
    .gte('transaction_date', '2025-08-20')
    .lte('transaction_date', '2025-10-19')
    .gte('amount', -104.401)
    .lte('amount', -85.419)

  console.log('Query 1: Service role with all filters')
  console.log('  Error:', error1)
  console.log('  Count:', allTransactions?.length || 0)
  if (allTransactions && allTransactions.length > 0) {
    allTransactions.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.description || t.vendor?.name}`)
      console.log(`     Amount: ${t.amount}, Date: ${t.transaction_date}`)
      console.log(`     Vendor: ${t.vendor?.name}, Payment: ${t.payment_method?.name}`)
    })
  }
  console.log('')

  // Query 2: Just user_id filter
  const { data: userTransactions, error: error2 } = await serviceClient
    .from('transactions')
    .select('id, description, amount, transaction_date')
    .eq('user_id', userId)
    .limit(5)

  console.log('Query 2: Service role with just user_id (no filters)')
  console.log('  Error:', error2)
  console.log('  Count:', userTransactions?.length || 0)
  if (userTransactions && userTransactions.length > 0) {
    userTransactions.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.description}`)
      console.log(`     Amount: ${t.amount}, Date: ${t.transaction_date}`)
    })
  }
  console.log('')

  // Query 3: Look for the specific Venmo transactions
  const { data: venmoTransactions, error: error3 } = await serviceClient
    .from('transactions')
    .select(`
      *,
      vendor:vendors(id, name),
      payment_method:payment_methods(id, name)
    `)
    .eq('user_id', userId)
    .eq('amount', -94.91)
    .eq('transaction_date', '2025-09-20')

  console.log('Query 3: Looking for exact match (amount=-94.91, date=2025-09-20)')
  console.log('  Error:', error3)
  console.log('  Count:', venmoTransactions?.length || 0)
  if (venmoTransactions && venmoTransactions.length > 0) {
    venmoTransactions.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.description || t.vendor?.name}`)
      console.log(`     Amount: ${t.amount}, Date: ${t.transaction_date}`)
      console.log(`     Vendor: ${t.vendor?.name}, Payment: ${t.payment_method?.name}`)
    })
  }
}

checkRLS()
