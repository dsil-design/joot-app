import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function queryPaymentMethods() {
  // Get user ID for dennis@dsil.design
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single()

  if (userError || !user) {
    console.error('Error finding user:', userError)
    return
  }

  console.log('User ID:', user.id)

  // Get all payment methods for this user
  const { data: paymentMethods, error: pmError } = await supabase
    .from('payment_methods')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name')

  if (pmError) {
    console.error('Error fetching payment methods:', pmError)
    return
  }

  console.log('\nCurrent Payment Methods:')
  console.log('========================')
  paymentMethods?.forEach((pm, index) => {
    console.log(`${index + 1}. ${pm.name} (ID: ${pm.id})`)
  })

  // Get transaction counts for each payment method
  console.log('\nTransaction Counts by Payment Method:')
  console.log('======================================')

  for (const pm of paymentMethods || []) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('payment_method_id', pm.id)

    console.log(`${pm.name}: ${count || 0} transactions`)
  }

  // Check for transactions with NULL payment method
  const { count: nullCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('payment_method_id', null)

  console.log(`(No payment method): ${nullCount || 0} transactions`)

  // Get total transaction count
  const { count: totalCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  console.log(`\nTotal transactions: ${totalCount || 0}`)
}

queryPaymentMethods()
