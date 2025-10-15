#!/usr/bin/env node

/**
 * Check if exchange rates were populated
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkExchangeRates() {
  console.log('🔍 Checking exchange rates in database...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Check total count
    const { count: totalCount, error: countError } = await supabase
      .from('exchange_rates')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error:', countError.message)
      return
    }

    console.log(`📊 Total exchange rates in database: ${totalCount}`)

    // Check USD/THB rates specifically
    const { data: usdThbRates, error: usdThbError } = await supabase
      .from('exchange_rates')
      .select('date, rate')
      .eq('from_currency', 'USD')
      .eq('to_currency', 'THB')
      .order('date', { ascending: false })
      .limit(10)

    if (usdThbError) {
      console.error('❌ Error fetching USD/THB rates:', usdThbError.message)
      return
    }

    console.log('\n💱 Recent USD/THB exchange rates:')
    if (usdThbRates && usdThbRates.length > 0) {
      usdThbRates.forEach(rate => {
        console.log(`   ${rate.date}: ${rate.rate}`)
      })

      // Check if they're all the same (the original problem)
      const uniqueRates = new Set(usdThbRates.map(r => r.rate))
      if (uniqueRates.size === 1) {
        console.log('\n⚠️  WARNING: All rates are the same value!')
        console.log('   The sync may not have completed successfully.')
      } else {
        console.log('\n✅ Rates are varying - sync appears successful!')
      }
    } else {
      console.log('   No USD/THB rates found')
    }

    // Check date range
    const { data: dateRange, error: rangeError } = await supabase
      .from('exchange_rates')
      .select('date')
      .order('date', { ascending: true })
      .limit(1)

    if (!rangeError && dateRange && dateRange.length > 0) {
      const oldestDate = dateRange[0].date
      const { data: newestData } = await supabase
        .from('exchange_rates')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)

      const newestDate = newestData?.[0]?.date

      console.log(`\n📅 Date range: ${oldestDate} to ${newestDate}`)
    }

    // Check sync history
    const { data: syncHistory, error: syncError } = await supabase
      .from('sync_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(3)

    if (!syncError && syncHistory && syncHistory.length > 0) {
      console.log('\n📜 Recent sync history:')
      syncHistory.forEach(sync => {
        const status = sync.status === 'completed' ? '✅' : sync.status === 'failed' ? '❌' : '⏳'
        console.log(`   ${status} ${sync.started_at} - ${sync.status} (${sync.new_rates_inserted || 0} rates inserted)`)
      })
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

checkExchangeRates().catch(console.error)
