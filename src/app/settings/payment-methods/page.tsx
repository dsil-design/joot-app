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

  // Fetch payment methods with transaction counts
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select(`
      id,
      name,
      sort_order,
      created_at,
      updated_at
    `)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  // Get transaction counts for each payment method
  const paymentMethodsWithCounts = await Promise.all(
    (paymentMethods || []).map(async (method) => {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('payment_method_id', method.id)
        .eq('user_id', user.id)

      return {
        ...method,
        transactionCount: count || 0,
      }
    })
  )

  // Count transactions without a payment method
  const { count: noneCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .is('payment_method_id', null)
    .eq('user_id', user.id)

  // Add "None" entry if there are transactions without payment methods
  const allPaymentMethods = noneCount && noneCount > 0
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

  return <PaymentMethodsSettings paymentMethods={allPaymentMethods} />
}
