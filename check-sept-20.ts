import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkSept20() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      *,
      vendor:vendors(id, name),
      payment_method:payment_methods(id, name)
    `)
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .eq('transaction_date', '2025-09-20')

  console.log('Transactions on 2025-09-20:\n')

  if (!transactions || transactions.length === 0) {
    console.log('No transactions found on this date')
    return
  }

  transactions.forEach((t, idx) => {
    console.log(`${idx + 1}. ${t.description || 'No description'}`)
    console.log(`   ID: ${t.id}`)
    console.log(`   Amount: ${t.amount}`)
    console.log(`   Date: ${t.transaction_date}`)
    console.log(`   Vendor: ${t.vendor?.name || 'none'}`)
    console.log(`   Payment Method: ${t.payment_method?.name || 'none'}`)
    console.log(`   Category: ${t.category}`)
    console.log('')
  })

  // Also check for amount around 94.91
  console.log('\nTransactions with amount around $94.91:\n')
  const { data: amountMatch } = await supabase
    .from('transactions')
    .select(`
      *,
      vendor:vendors(id, name),
      payment_method:payment_methods(id, name)
    `)
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('amount', 85)
    .lte('amount', 105)

  if (amountMatch && amountMatch.length > 0) {
    amountMatch.forEach((t, idx) => {
      console.log(`${idx + 1}. ${t.description || 'No description'}`)
      console.log(`   Amount: ${t.amount}`)
      console.log(`   Date: ${t.transaction_date}`)
      console.log(`   Vendor: ${t.vendor?.name || 'none'}`)
      console.log(`   Payment Method: ${t.payment_method?.name || 'none'}`)
      console.log('')
    })
  }
}

checkSept20()
