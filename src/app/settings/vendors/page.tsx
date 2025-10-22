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

  // Fetch all vendors first
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, created_at, updated_at')
    .eq('user_id', user.id)
    .order('name')

  // Fetch transaction counts for all vendors in a single query
  const { data: transactionCounts } = await supabase
    .from('transactions')
    .select('vendor_id')
    .eq('user_id', user.id)

  // Count transactions per vendor in memory (very fast for reasonable data sizes)
  const countsByVendor = (transactionCounts || []).reduce((acc, t) => {
    if (t.vendor_id) {
      acc[t.vendor_id] = (acc[t.vendor_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  // Combine vendors with their transaction counts
  const transformedVendors = (vendors || []).map(vendor => ({
    ...vendor,
    transactionCount: countsByVendor[vendor.id] || 0
  }))

  // Fetch duplicate suggestions count
  const { data: duplicateSuggestions } = await supabase
    .from('vendor_duplicate_suggestions')
    .select('id, status')
    .eq('user_id', user.id)

  const pendingDuplicates = duplicateSuggestions?.filter(
    (s) => s.status === 'pending'
  ).length || 0

  return (
    <VendorsSettings
      vendors={transformedVendors}
      duplicateCount={pendingDuplicates}
    />
  )
}
