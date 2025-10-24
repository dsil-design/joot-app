import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PaymentMethodsSettings } from '@/components/page-specific/payment-methods-settings'

export default async function PaymentMethodsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all payment methods
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('id, name, sort_order, preferred_currency, created_at, updated_at')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  // Fetch all available currencies
  const { data: currenciesData } = await supabase
    .from('currency_configuration')
    .select('currency_code, display_name, currency_symbol')
    .eq('is_tracked', true)
    .order('currency_code', { ascending: true })

  // Filter out currencies with null symbols
  const currencies = (currenciesData || []).filter(c => c.currency_symbol !== null).map(c => ({
    ...c,
    currency_symbol: c.currency_symbol!
  }))

  // Fetch all transactions' payment_method_id in a single query
  const { data: transactionCounts } = await supabase
    .from('transactions')
    .select('payment_method_id')
    .eq('user_id', user.id)

  // Count transactions per payment method in memory
  const countsByMethod = (transactionCounts || []).reduce((acc, t) => {
    const methodId = t.payment_method_id || 'none'
    acc[methodId] = (acc[methodId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Combine payment methods with their transaction counts
  const paymentMethodsWithCounts = (paymentMethods || []).map(method => ({
    ...method,
    transactionCount: countsByMethod[method.id] || 0,
    preferred_currency: method.preferred_currency,
  }))

  // Get count of transactions without payment method from our in-memory counts
  const noneCount = countsByMethod['none'] || 0

  // Add "None" entry if there are transactions without payment methods
  const allPaymentMethods = noneCount > 0
    ? [
        {
          id: 'none',
          name: 'None',
          sort_order: -1,
          created_at: '',
          updated_at: '',
          transactionCount: noneCount,
        },
        ...paymentMethodsWithCounts
      ]
    : paymentMethodsWithCounts

  return (
    <PaymentMethodsSettings
      paymentMethods={allPaymentMethods}
      currencies={currencies}
    />
  )
}
