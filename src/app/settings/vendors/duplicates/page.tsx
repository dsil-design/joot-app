import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DuplicateVendorsWorkspace } from '@/components/page-specific/duplicate-vendors-full-workspace'

export default async function DuplicateVendorsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all vendors for the filter dropdown
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name')

  return <DuplicateVendorsWorkspace allVendors={vendors || []} />
}
