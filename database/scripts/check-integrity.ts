#!/usr/bin/env tsx
/**
 * Check vendor and transaction integrity
 * This script verifies no transactions were lost and identifies orphaned vendors
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

async function checkIntegrity() {
  console.log('🔍 Checking vendor and transaction integrity...\n')

  // 1. Total transaction count
  const { count: totalTransactions } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total Transactions: ${totalTransactions}`)

  // 2. Total vendor count
  const { count: totalVendors } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total Vendors: ${totalVendors}\n`)

  // 3. Find vendors with 0 transactions
  const { data: allVendors } = await supabase
    .from('vendors')
    .select('id, name, user_id, created_at, updated_at')
    .order('created_at', { ascending: false })

  const vendorsWithZeroTransactions = []

  for (const vendor of allVendors || []) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendor.id)

    if (count === 0) {
      vendorsWithZeroTransactions.push({
        ...vendor,
        transactionCount: 0
      })
    }
  }

  console.log(`⚠️  Vendors with 0 Transactions: ${vendorsWithZeroTransactions.length}`)
  if (vendorsWithZeroTransactions.length > 0) {
    console.log('\nDetails:')
    vendorsWithZeroTransactions.forEach(v => {
      console.log(`  - ${v.name} (ID: ${v.id.substring(0, 8)}..., Created: ${new Date(v.created_at).toLocaleDateString()})`)
    })
  }

  // 4. Check for transactions with vendor_id set
  const { count: transactionsWithVendor } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .not('vendor_id', 'is', null)

  const { count: transactionsWithoutVendor } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .is('vendor_id', null)

  console.log(`\n📊 Transactions with vendor: ${transactionsWithVendor}`)
  console.log(`📊 Transactions without vendor: ${transactionsWithoutVendor}`)

  // 5. Check for recent merges
  const { data: recentMerges } = await supabase
    .from('vendor_duplicate_suggestions')
    .select('id, status, confidence_score, resolved_at, created_at')
    .eq('status', 'merged')
    .order('resolved_at', { ascending: false, nullsFirst: false })
    .limit(10)

  console.log(`\n🔀 Recent Vendor Merges: ${recentMerges?.length || 0}`)
  if (recentMerges && recentMerges.length > 0) {
    recentMerges.forEach(m => {
      const resolvedDate = m.resolved_at ? new Date(m.resolved_at).toLocaleString() : 'N/A'
      console.log(`  - Confidence: ${m.confidence_score}% | Resolved: ${resolvedDate}`)
    })
  }

  // 6. Distribution of vendors by transaction count
  const vendorDistribution: Record<string, number> = {
    '0 transactions': 0,
    '1 transaction': 0,
    '2-5 transactions': 0,
    '6-10 transactions': 0,
    '10+ transactions': 0
  }

  for (const vendor of allVendors || []) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendor.id)

    const transactionCount = count ?? 0

    if (transactionCount === 0) vendorDistribution['0 transactions']++
    else if (transactionCount === 1) vendorDistribution['1 transaction']++
    else if (transactionCount >= 2 && transactionCount <= 5) vendorDistribution['2-5 transactions']++
    else if (transactionCount >= 6 && transactionCount <= 10) vendorDistribution['6-10 transactions']++
    else vendorDistribution['10+ transactions']++
  }

  console.log('\n📈 Vendor Distribution by Transaction Count:')
  Object.entries(vendorDistribution).forEach(([range, count]) => {
    console.log(`  ${range}: ${count} vendors`)
  })

  console.log('\n✅ Integrity check complete!')

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Transactions: ${totalTransactions}`)
  console.log(`Total Vendors: ${totalVendors}`)
  console.log(`Vendors with 0 transactions: ${vendorsWithZeroTransactions.length}`)
  console.log(`Transactions with vendor: ${transactionsWithVendor}`)
  console.log(`Transactions without vendor: ${transactionsWithoutVendor}`)

  if (vendorsWithZeroTransactions.length > 0) {
    console.log('\n⚠️  WARNING: Found vendors with 0 transactions that should be cleaned up!')
  } else {
    console.log('\n✅ No orphaned vendors found!')
  }
}

checkIntegrity().catch(console.error)
