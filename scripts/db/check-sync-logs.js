#!/usr/bin/env node

/**
 * Check detailed sync logs to debug issues
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkSyncLogs() {
  console.log('📜 Checking sync logs for latest sync...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Get the most recent sync
    const { data: latestSync, error: syncError } = await supabase
      .from('sync_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (syncError) {
      console.error('❌ Error fetching sync history:', syncError.message)
      return
    }

    console.log('🔍 Latest Sync:')
    console.log(`   ID: ${latestSync.id}`)
    console.log(`   Status: ${latestSync.status}`)
    console.log(`   Started: ${latestSync.started_at}`)
    console.log(`   Completed: ${latestSync.completed_at || 'N/A'}`)
    console.log(`   Duration: ${latestSync.duration_ms ? (latestSync.duration_ms / 1000).toFixed(1) + 's' : 'N/A'}`)
    console.log(`   Rates inserted: ${latestSync.new_rates_inserted || 0}`)
    console.log(`   Rates updated: ${latestSync.rates_updated || 0}`)

    if (latestSync.error_message) {
      console.log(`\n❌ Error Message: ${latestSync.error_message}`)
    }

    if (latestSync.error_details) {
      console.log('\n🔍 Error Details:')
      console.log(JSON.stringify(latestSync.error_details, null, 2))
    }

    // Get detailed logs for this sync
    const { data: logs, error: logsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_history_id', latestSync.id)
      .order('timestamp', { ascending: false })
      .limit(20)

    if (logsError) {
      console.error('\n❌ Error fetching logs:', logsError.message)
      return
    }

    if (logs && logs.length > 0) {
      console.log('\n📝 Recent Log Entries:')
      logs.reverse().forEach(log => {
        const icon = log.log_level === 'error' ? '❌' :
                     log.log_level === 'warning' ? '⚠️' :
                     log.log_level === 'info' ? 'ℹ️' : '🔍'
        console.log(`\n${icon} [${log.phase}] ${log.message}`)
        if (log.details) {
          console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`)
        }
      })
    } else {
      console.log('\n⚠️  No detailed logs found for this sync')
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

checkSyncLogs().catch(console.error)
