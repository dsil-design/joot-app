#!/usr/bin/env node

/**
 * Check detailed sync logs including errors
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkDetailedLogs() {
  console.log('🔍 Checking detailed sync logs...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Get latest sync
    const { data: latestSync } = await supabase
      .from('sync_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (!latestSync) {
      console.log('❌ No sync history found')
      return
    }

    console.log('📊 Latest Sync:')
    console.log(`   ID: ${latestSync.id}`)
    console.log(`   Status: ${latestSync.status}`)
    console.log(`   Started: ${latestSync.started_at}`)
    console.log(`   Type: ${latestSync.sync_type}`)

    if (latestSync.error_message) {
      console.log(`   ❌ Error: ${latestSync.error_message}`)
    }

    // Get all logs for this sync
    const { data: logs } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_history_id', latestSync.id)
      .order('timestamp', { ascending: false })

    if (!logs || logs.length === 0) {
      console.log('\n⚠️  No logs found for this sync')
      return
    }

    console.log(`\n📝 All logs (${logs.length} entries):\n`)

    // Show all logs in chronological order
    for (const log of logs.reverse()) {
      const icon = log.log_level === 'error' ? '❌' :
                   log.log_level === 'warning' ? '⚠️' :
                   log.log_level === 'info' ? 'ℹ️' : '🔍'

      console.log(`${icon} [${log.phase}] ${log.message}`)
      if (log.details) {
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`)
      }
      console.log()
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

checkDetailedLogs().catch(console.error)
