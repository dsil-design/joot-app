import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixStuckSyncs() {
  try {
    console.log('🔧 Fixing stuck sync jobs...\n')

    // Find all "running" syncs that started more than 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const { data: stuckSyncs, error: findError } = await supabase
      .from('sync_history')
      .select('*')
      .eq('status', 'running')
      .lt('started_at', tenMinutesAgo)

    if (findError) {
      console.error('❌ Error finding stuck syncs:', findError.message)
      return
    }

    if (!stuckSyncs || stuckSyncs.length === 0) {
      console.log('✅ No stuck sync jobs found')
      return
    }

    console.log(`Found ${stuckSyncs.length} stuck sync jobs:\n`)

    // Mark each as failed
    for (const sync of stuckSyncs) {
      const startTime = new Date(sync.started_at)
      const runningTime = Math.round((Date.now() - startTime.getTime()) / 1000 / 60)

      console.log(`  Fixing: ${sync.sync_type} - ${startTime.toISOString()}`)
      console.log(`  Running for: ${runningTime} minutes`)

      const { error: updateError } = await supabase
        .from('sync_history')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Marked as failed - sync exceeded timeout limit',
          duration_ms: Date.now() - startTime.getTime()
        })
        .eq('id', sync.id)

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`)
      } else {
        console.log(`  ✅ Marked as failed`)
      }
      console.log()
    }

    console.log('✨ All stuck syncs have been cleaned up!')

  } catch (error) {
    console.error('Failed to fix stuck syncs:', error)
    process.exit(1)
  }
}

fixStuckSyncs()
