#!/usr/bin/env node

/**
 * Clean up stuck sync records
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function cleanupStuckSync() {
  console.log('🔧 Cleaning up stuck sync records...\n')

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
    // Find stuck syncs (running for more than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const { data: stuckSyncs, error: fetchError } = await supabase
      .from('sync_history')
      .select('id, started_at, sync_type')
      .eq('status', 'running')
      .lt('started_at', tenMinutesAgo)

    if (fetchError) {
      console.error('❌ Error fetching stuck syncs:', fetchError.message)
      process.exit(1)
    }

    if (!stuckSyncs || stuckSyncs.length === 0) {
      console.log('✅ No stuck syncs found')
      return
    }

    console.log(`Found ${stuckSyncs.length} stuck sync(s):\n`)
    for (const sync of stuckSyncs) {
      console.log(`   - ID: ${sync.id}`)
      console.log(`     Started: ${sync.started_at}`)
      console.log(`     Type: ${sync.sync_type}`)
    }

    console.log('\n📝 Marking as failed...')

    // Update stuck syncs to failed status
    const { error: updateError } = await supabase
      .from('sync_history')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Timeout - marked as failed by cleanup script'
      })
      .eq('status', 'running')
      .lt('started_at', tenMinutesAgo)

    if (updateError) {
      console.error('❌ Error updating stuck syncs:', updateError.message)
      process.exit(1)
    }

    console.log('✅ Stuck syncs have been marked as failed\n')
    console.log('💡 You can now run a new sync:')
    console.log('   node scripts/db/trigger-manual-sync.js')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

cleanupStuckSync().catch(console.error)
