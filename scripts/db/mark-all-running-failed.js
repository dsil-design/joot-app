#!/usr/bin/env node

/**
 * Mark ALL running syncs as failed (emergency cleanup)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function markAllRunningFailed() {
  console.log('🚨 Marking ALL running syncs as failed...\n')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Find all running syncs
    const { data: runningSyncs, error: fetchError } = await supabase
      .from('sync_history')
      .select('id, started_at, sync_type')
      .eq('status', 'running')

    if (fetchError) {
      console.error('❌ Error fetching running syncs:', fetchError.message)
      process.exit(1)
    }

    if (!runningSyncs || runningSyncs.length === 0) {
      console.log('✅ No running syncs found')
      return
    }

    console.log(`Found ${runningSyncs.length} running sync(s):\n`)
    for (const sync of runningSyncs) {
      const startedTime = new Date(sync.started_at)
      const minutesAgo = Math.round((Date.now() - startedTime.getTime()) / 1000 / 60)
      console.log(`   - ID: ${sync.id}`)
      console.log(`     Started: ${sync.started_at} (${minutesAgo} minutes ago)`)
      console.log(`     Type: ${sync.sync_type}`)
    }

    console.log('\n📝 Marking all as failed...')

    // Update all running syncs to failed status
    const { error: updateError } = await supabase
      .from('sync_history')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Marked as failed by emergency cleanup'
      })
      .eq('status', 'running')

    if (updateError) {
      console.error('❌ Error updating running syncs:', updateError.message)
      process.exit(1)
    }

    console.log('✅ All running syncs have been marked as failed\n')
    console.log('💡 You can now run a new sync:')
    console.log('   node scripts/db/trigger-manual-sync.js')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

markAllRunningFailed().catch(console.error)
