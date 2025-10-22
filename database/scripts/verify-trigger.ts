#!/usr/bin/env tsx
/**
 * Verify the vendor cleanup trigger is working
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyTrigger() {
  console.log('🔍 Verifying vendor cleanup trigger...\n')

  // 1. Check vendors with 0 transactions
  const { data: allVendors } = await supabase
    .from('vendors')
    .select('id, name, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  let vendorsWithZeroTransactions = 0

  console.log('Checking first 100 vendors...')
  for (const vendor of allVendors || []) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendor.id)

    if (count === 0) {
      vendorsWithZeroTransactions++
      console.log(`  ⚠️  Found orphaned vendor: ${vendor.name} (Created: ${new Date(vendor.created_at).toLocaleDateString()})`)
    }
  }

  if (vendorsWithZeroTransactions === 0) {
    console.log('\n✅ No orphaned vendors found in sample! The cleanup worked.')
  } else {
    console.log(`\n⚠️  Found ${vendorsWithZeroTransactions} orphaned vendors in sample`)
  }

  // 2. Get total counts
  const { count: totalVendors } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })

  const { count: totalTransactions } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })

  console.log('\n📊 Current Totals:')
  console.log(`   Vendors: ${totalVendors}`)
  console.log(`   Transactions: ${totalTransactions}`)

  console.log('\n✅ Verification complete!')
}

verifyTrigger().catch(console.error)
