import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkSyncHistory() {
  try {
    console.log('Checking sync history for recent runs...\n')

    // Check for recent sync runs
    const { data: syncs, error } = await supabase
      .from('sync_history')
      .select('*')
      .gte('started_at', '2025-10-14')
      .order('started_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error querying sync_history:', error.message)
      return
    }

    if (!syncs || syncs.length === 0) {
      console.log('⚠️  No sync history found for Oct 14+')
      return
    }

    console.log(`✅ Found ${syncs.length} sync runs:\n`)

    syncs.forEach(sync => {
      const startTime = new Date(sync.started_at).toISOString()
      const status = sync.status === 'completed' ? '✅' :
                     sync.status === 'failed' ? '❌' :
                     sync.status === 'running' ? '⏳' : '❓'

      console.log(`${status} ${sync.sync_type} - ${startTime}`)
      console.log(`   Status: ${sync.status}`)
      if (sync.completed_at) {
        console.log(`   Duration: ${sync.duration_ms}ms`)
        console.log(`   Inserted: ${sync.new_rates_inserted}, Updated: ${sync.rates_updated}`)
      }
      if (sync.error_message) {
        console.log(`   Error: ${sync.error_message}`)
      }
      console.log()
    })

  } catch (error) {
    console.error('Failed to check sync history:', error)
    process.exit(1)
  }
}

checkSyncHistory()
