import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VendorsSettings } from '@/components/page-specific/vendors-settings'

export default async function VendorsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch vendors with transaction counts
  const { data: vendors } = await supabase
    .from('vendors')
    .select(`
      id,
      name,
      created_at,
      updated_at
    `)
    .eq('user_id', user.id)
    .order('name')

  // Get transaction counts for each vendor
  const vendorsWithCounts = await Promise.all(
    (vendors || []).map(async (vendor) => {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .eq('user_id', user.id)

      return {
        ...vendor,
        transactionCount: count || 0,
      }
    })
  )

  return <VendorsSettings vendors={vendorsWithCounts} />
}
